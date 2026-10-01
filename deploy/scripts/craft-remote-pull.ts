import {
	existsSync,
	mkdirSync
} from 'node:fs'
import { resolve } from 'node:path'
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
	prepareRemoteRuntime,
	readCraftRemoteEnv,
	remoteMysqlDump,
	stamp
} from './craft-remote-shared'
import { deployLog } from './logger'
import {
	rsyncFromRemote,
	run,
	runOrExit,
	ssh
} from './ssh'

const log = deployLog('craft:pull')

const printHelp = () => {
	log.info(`Usage:
bun craft:pull

Replace the local DDEV database and managed assets from remote Craft.
Requires confirmation: PULL CRAFT FROM REMOTE

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
	const currentStamp = stamp()
	const remoteDump = `${config.remoteProjectPath}/backups/pull-${currentStamp}.sql.gz`
	const localDump = resolve(localBackupDir, 'remote-pull.sql.gz')

	if (!existsSync(craftDir)) {
		throw new Error(`Missing Craft directory: ${craftDir}`)
	}

	await requireConfirmation(
		'PULL CRAFT FROM REMOTE',
		[
			'This replaces the local DDEV Craft database and managed asset directories.',
			`Remote: ${config.remoteHost}:${config.remoteProjectPath}`,
			'A timestamped local database backup is created first.'
		].join('\n'),
		log
	)

	mkdirSync(localBackupDir, { recursive: true })

	const startStep = log.step('start local Craft and create backup')
	assertSuccess(
		run('ddev', ['start'], { cwd: craftDir }),
		'start local DDEV'
	)
	assertSuccess(
		run(
			'ddev',
			[
				'export-db',
				'--file',
				`_backup-db/before-remote-pull-${currentStamp}.sql.gz`
			],
			{ cwd: craftDir }
		),
		'backup local DDEV database'
	)
	startStep.done()

	const remoteStep = log.step('create and download remote database dump')
	prepareRemoteRuntime(config, env)
	assertSuccess(
		ssh(
			config,
			[
				'set -e',
				`mkdir -p ${shellQuote(`${config.remoteProjectPath}/backups`)}`,
				`${remoteMysqlDump(config, env)} | gzip > ${shellQuote(remoteDump)}`
			].join('\n'),
			{ stdio: 'pipe' }
		),
		'export remote Craft database'
	)
	assertSuccess(
		rsyncFromRemote(config, remoteDump, localDump),
		'download remote Craft database'
	)
	remoteStep.done()

	const assetsStep = log.step('sync managed asset directories')
	for (const assetDir of assetDirs) {
		const remoteAssetDir = `${config.remoteProjectPath}/web/${assetDir}`
		const available = ssh(
			config,
			`test -d ${shellQuote(remoteAssetDir)}`,
			{ stdio: 'pipe' }
		)

		if (available.status !== 0) continue

		const localAssetDir = resolve(craftDir, 'web', assetDir)
		mkdirSync(localAssetDir, { recursive: true })
		assertSuccess(
			rsyncFromRemote(
				config,
				`${remoteAssetDir}/`,
				`${localAssetDir}/`,
				['--delete']
			),
			`pull ${assetDir} assets`
		)
	}
	assetsStep.done()

	const importStep = log.step('import remote database into local DDEV')
	assertSuccess(
		run(
			'ddev',
			['import-db', '--file', '_backup-db/remote-pull.sql.gz'],
			{ cwd: craftDir }
		),
		'import remote database into DDEV'
	)
	assertSuccess(
		run(
			'ddev',
			['exec', 'php', 'craft', 'migrate/all', '--no-interaction'],
			{ cwd: craftDir }
		),
		'run local Craft migrations'
	)
	assertSuccess(
		run(
			'ddev',
			[
				'exec',
				'php',
				'craft',
				'project-config/apply',
				'--no-interaction'
			],
			{ cwd: craftDir }
		),
		'apply local Craft project config'
	)
	assertSuccess(
		run(
			'ddev',
			['exec', 'php', 'craft', 'clear-caches/all'],
			{ cwd: craftDir }
		),
		'clear local Craft caches'
	)
	importStep.done()

	log.info('remote Craft pull complete')
})
