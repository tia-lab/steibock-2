import { spawnSync } from 'node:child_process'
import type { RemoteConfig } from './config'
import { deployLog } from './logger'

const logger = deployLog('exec')

type RunOptions = {
	stdio?: 'inherit' | 'pipe'
	cwd?: string
}

export const run = (
	command: string,
	args: string[],
	options: RunOptions = {}
) => {
	if (process.env.DEPLOY_DEBUG === 'true') {
		logger.info('run command', { command, args })
	}

	const result = spawnSync(command, args, {
		cwd: options.cwd,
		encoding: 'utf8',
		stdio: options.stdio ?? 'inherit'
	})

	if (result.error) {
		throw result.error
	}

	return result
}

const sshArgs = (config: RemoteConfig) => [
	'-p',
	config.remotePort,
	...(config.remoteSshKey ? ['-i', config.remoteSshKey] : []),
	'-o',
	'BatchMode=yes',
	'-o',
	'ConnectTimeout=10',
	'-o',
	'StrictHostKeyChecking=accept-new',
	`${config.remoteUser}@${config.remoteHost}`
]

export const ssh = (
	config: RemoteConfig,
	command: string,
	options: RunOptions = {}
) => run('ssh', [...sshArgs(config), command], options)

export const sshWithInput = (
	config: RemoteConfig,
	command: string,
	input: string
) => {
	if (process.env.DEPLOY_DEBUG === 'true') {
		logger.info('run SSH command with stdin', { command })
	}

	const result = spawnSync('ssh', [...sshArgs(config), command], {
		encoding: 'utf8',
		input,
		stdio: ['pipe', 'inherit', 'inherit']
	})

	if (result.error) {
		throw result.error
	}

	return result
}

export const rsyncToRemote = (
	config: RemoteConfig,
	source: string,
	destination: string,
	extraArgs: string[] = []
) =>
	run('rsync', [
		'-az',
		...extraArgs,
		'-e',
		[
			'ssh',
			'-p',
			config.remotePort,
			...(config.remoteSshKey ? ['-i', config.remoteSshKey] : []),
			'-o',
			'BatchMode=yes',
			'-o',
			'ConnectTimeout=10',
			'-o',
			'StrictHostKeyChecking=accept-new'
		].join(' '),
		source,
		`${config.remoteUser}@${config.remoteHost}:${destination}`
	])

export const rsyncFromRemote = (
	config: RemoteConfig,
	source: string,
	destination: string,
	extraArgs: string[] = []
) =>
	run('rsync', [
		'-az',
		...extraArgs,
		'-e',
		[
			'ssh',
			'-p',
			config.remotePort,
			...(config.remoteSshKey ? ['-i', config.remoteSshKey] : []),
			'-o',
			'BatchMode=yes',
			'-o',
			'ConnectTimeout=10',
			'-o',
			'StrictHostKeyChecking=accept-new'
		].join(' '),
		`${config.remoteUser}@${config.remoteHost}:${source}`,
		destination
	])

export const runOrExit = async (task: () => void | Promise<void>) => {
	try {
		await task()
	} catch (error) {
		logger.error(error instanceof Error ? error.message : String(error))
		process.exit(1)
	}
}
