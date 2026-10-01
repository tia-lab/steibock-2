import {
	existsSync,
	readdirSync,
	unlinkSync
} from 'node:fs'
import { basename, resolve } from 'node:path'
import {
	getRemoteConfig,
	helpRequested,
	requiredEnvHelp,
	rootDir,
	shellQuote
} from './config'
import { requireConfirmation } from './confirm'
import {
	assertSuccess,
	assetDirs,
	normalizeDumpForMariaDb,
	prepareRemoteRuntime,
	readCraftRemoteEnv,
	remoteMysql,
	remoteMysqlDump,
	stamp
} from './craft-remote-shared'
import { deployLog } from './logger'
import {
	rsyncToRemote,
	runOrExit,
	ssh
} from './ssh'

const log = deployLog('craft:push')

const printHelp = () => {
	log.info(`Usage:
bun craft:push

Push local Craft source, the newest timestamped database backup, and assets to traditional hosting.
Falls back to the tracked starter database when no timestamped backup exists.
Requires confirmation: PUSH CRAFT TO REMOTE

${requiredEnvHelp()}`)
}

if (helpRequested()) {
	printHelp()
	process.exit(0)
}

await runOrExit(async () => {
	const config = getRemoteConfig()
	const env = readCraftRemoteEnv()
	const craftDir = resolve(rootDir, 'craft')
	const localBackupDir = resolve(craftDir, '_backup-db')
	const baselineDump = resolve(localBackupDir, 'db.sql')
	const compatibleDump = resolve(localBackupDir, 'remote-push.sql.gz')
	const currentStamp = stamp()
	const remoteBackupDir = `${config.remoteProjectPath}/backups`
	const remoteImport = `${remoteBackupDir}/push-${currentStamp}.sql.gz`

	if (!existsSync(craftDir) || !existsSync(baselineDump)) {
		throw new Error('Missing Craft source or starter database.')
	}

	const databaseSource = selectDatabaseBackup(localBackupDir, baselineDump)

	await requireConfirmation(
		'PUSH CRAFT TO REMOTE',
		[
			'This replaces the remote Craft database and managed asset directories.',
			`Remote: ${config.remoteHost}:${config.remoteProjectPath}`,
			`Database: craft/_backup-db/${basename(databaseSource)}`,
			'A timestamped remote database backup is attempted first.'
		].join('\n'),
		log
	)

	normalizeDumpForMariaDb(databaseSource, compatibleDump)

	const sourceStep = log.step('sync Craft source')
	assertSuccess(
		ssh(
			config,
			`mkdir -p ${shellQuote(config.remoteProjectPath)}`,
			{ stdio: 'pipe' }
		),
		'create remote Craft directory'
	)
	assertSuccess(
		rsyncToRemote(
			config,
			`${craftDir}/`,
			`${config.remoteProjectPath}/`,
			[
				'--delete',
				'--exclude',
				'.ddev/',
				'--exclude',
				'.env',
				'--exclude',
				'_backup-db/',
				'--exclude',
				'backups/',
				'--exclude',
				'storage/',
				'--exclude',
				'vendor/',
				'--exclude',
				'web/cpresources/',
				...assetDirs.flatMap((dir) => [
					'--exclude',
					`web/${dir}/`
				])
			]
		),
		'sync Craft source'
	)
	sourceStep.done()

	const runtimeStep = log.step('configure remote Craft runtime')
	prepareRemoteRuntime(config, env)
	installComposer(config)
	runtimeStep.done()

	const databaseStep = log.step('backup and replace remote database')
	assertSuccess(
		ssh(
			config,
			`mkdir -p ${shellQuote(remoteBackupDir)}`,
			{ stdio: 'pipe' }
		),
		'create remote backup directory'
	)
	assertSuccess(
		ssh(
			config,
			`${remoteMysqlDump(config, env)} | gzip > ${shellQuote(`${remoteBackupDir}/before-push-${currentStamp}.sql.gz`)} || true`,
			{ stdio: 'pipe' }
		),
		'backup remote database'
	)
	assertSuccess(
		rsyncToRemote(config, compatibleDump, remoteImport),
		'upload Craft database'
	)
	assertSuccess(
		ssh(
			config,
			`gunzip -c ${shellQuote(remoteImport)} | ${remoteMysql(config, env)}`,
			{ stdio: 'pipe' }
		),
		'import remote Craft database'
	)
	databaseStep.done()

	const assetsStep = log.step('sync managed asset directories')
	for (const assetDir of assetDirs) {
		const localAssetDir = resolve(craftDir, 'web', assetDir)
		if (!existsSync(localAssetDir)) continue

		assertSuccess(
			ssh(
				config,
				`mkdir -p ${shellQuote(`${config.remoteProjectPath}/web/${assetDir}`)}`,
				{ stdio: 'pipe' }
			),
			`create remote ${assetDir} directory`
		)
		assertSuccess(
			rsyncToRemote(
				config,
				`${localAssetDir}/`,
				`${config.remoteProjectPath}/web/${assetDir}/`,
				['--delete']
			),
			`sync ${assetDir} assets`
		)
	}
	assetsStep.done()

	const maintenanceStep = log.step('apply remote Craft maintenance')
	const php = shellQuote(config.remotePhp)
	const project = shellQuote(config.remoteProjectPath)
	assertSuccess(
		ssh(
			config,
			[
				'set -e',
				`cd ${project}`,
				'mkdir -p storage/runtime storage/logs storage/rebrand web/uploads web/cpresources',
				'chmod -R u+rwX storage web/uploads web/cpresources',
				`${php} craft migrate/all --interactive=0`,
				`${php} craft project-config/apply --interactive=0`,
				`${php} craft clear-caches/all`
			].join('\n')
		),
		'apply remote Craft maintenance'
	)
	maintenanceStep.done()

	if (existsSync(compatibleDump)) unlinkSync(compatibleDump)

	log.info('remote Craft push complete')
})

function selectDatabaseBackup(backupDir: string, baselineDump: string) {
	const timestamped = readdirSync(backupDir, { withFileTypes: true })
		.filter((entry) => entry.isFile())
		.flatMap((entry) => {
			const match = entry.name.match(/^db_(\d+)\.sql(?:\.gz)?$/)
			if (!match) return []

			const timestamp = Number(match[1])
			return Number.isSafeInteger(timestamp)
				? [{ name: entry.name, timestamp }]
				: []
		})
		.sort((left, right) => right.timestamp - left.timestamp)

	if (timestamped[0]) {
		return resolve(backupDir, timestamped[0].name)
	}

	log.warn('No timestamped database backup found; using db.sql')
	return baselineDump
}

function installComposer(config: ReturnType<typeof getRemoteConfig>) {
	const php = shellQuote(config.remotePhp)
	const composerDir = '$HOME/.local/bin'
	const composer = `${composerDir}/composer`
	const installer = `${config.remoteProjectPath}/storage/composer-setup.php`
	const command = [
		'set -e',
		`mkdir -p ${composerDir}`,
		`if [ ! -f ${composer} ]; then`,
		`  expected="$(${php} -r "copy('https://composer.github.io/installer.sig', 'php://stdout');")"`,
		`  ${php} -r "copy('https://getcomposer.org/installer', '${installer}');"`,
		`  actual="$(${php} -r "echo hash_file('sha384', '${installer}');")"`,
		'  [ "$expected" = "$actual" ] || { echo "Invalid Composer installer checksum"; exit 1; }',
		`  ${php} ${shellQuote(installer)} --quiet --install-dir=${composerDir} --filename=composer`,
		`  rm ${shellQuote(installer)}`,
		'fi',
		`cd ${shellQuote(config.remoteProjectPath)}`,
		`${php} ${composer} install --no-dev --no-interaction --prefer-dist --optimize-autoloader`
	].join('\n')

	assertSuccess(ssh(config, command), 'install remote Composer dependencies')
}
