import {
	getRemoteConfig,
	helpRequested,
	requiredEnvHelp,
	shellQuote
} from './config'
import { requireConfirmation } from './confirm'
import {
	assertSuccess,
	prepareRemoteRuntime,
	readCraftRemoteEnv,
	stamp
} from './craft-remote-shared'
import { deployLog } from './logger'
import {
	runOrExit,
	ssh
} from './ssh'

const log = deployLog('craft:push:env')

const printHelp = () => {
	log.info(`Usage:
bun craft:push:env

Push only hosted Craft runtime environment values to existing traditional hosting.
Does not synchronize Craft source, database content, or assets.
Requires confirmation: PUSH CRAFT ENV TO REMOTE

${requiredEnvHelp()}`)
}

if (helpRequested()) {
	printHelp()
	process.exit(0)
}

await runOrExit(async () => {
	const config = getRemoteConfig()
	const env = readCraftRemoteEnv()
	const currentStamp = stamp()
	const remoteBackupDir = `${config.remoteProjectPath}/backups`
	const remoteEnv = `${config.remoteProjectPath}/.env`
	const remoteMysqlConfig = `${config.remoteProjectPath}/storage/.mysql-client.cnf`
	const envBackup = `${remoteBackupDir}/env-before-${currentStamp}`
	const mysqlBackup = `${remoteBackupDir}/mysql-client-before-${currentStamp}.cnf`

	await requireConfirmation(
		'PUSH CRAFT ENV TO REMOTE',
		[
			'This replaces only the remote Craft .env and database client config.',
			`Remote: ${config.remoteHost}:${config.remoteProjectPath}`,
			'Timestamped backups are created before replacement.',
			'Craft source, database content, and assets are not synchronized.'
		].join('\n'),
		log
	)

	const verifyStep = log.step('verify remote Craft installation')
	assertSuccess(
		ssh(
			config,
			`test -f ${shellQuote(`${config.remoteProjectPath}/craft`)}`,
			{ stdio: 'pipe' }
		),
		'verify remote Craft installation'
	)
	verifyStep.done()

	const backupStep = log.step('backup remote Craft environment')
	assertSuccess(
		ssh(
			config,
			[
				'set -e',
				'umask 077',
				`mkdir -p ${shellQuote(remoteBackupDir)}`,
				`if test -f ${shellQuote(remoteEnv)}; then cp ${shellQuote(remoteEnv)} ${shellQuote(envBackup)}; chmod 600 ${shellQuote(envBackup)}; fi`,
				`if test -f ${shellQuote(remoteMysqlConfig)}; then cp ${shellQuote(remoteMysqlConfig)} ${shellQuote(mysqlBackup)}; chmod 600 ${shellQuote(mysqlBackup)}; fi`
			].join('\n'),
			{ stdio: 'pipe' }
		),
		'backup remote Craft environment'
	)
	backupStep.done()

	const envStep = log.step('sync remote Craft environment')
	prepareRemoteRuntime(config, env)
	envStep.done()

	log.info('remote Craft environment push complete')
})
