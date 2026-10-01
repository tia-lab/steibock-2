import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { readRootEnv } from '../../scripts/root-env.ts'

export type RemoteConfig = {
	rootDir: string
	remoteHost: string
	remoteUser: string
	remotePort: string
	remoteSshKey?: string
	remoteProjectPath: string
	remotePhp: string
}

export const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '../..')

export const helpRequested = () =>
	process.argv.includes('--help') || process.argv.includes('-h')

export const requiredEnvHelp = () => `Required environment:
REMOTE_HOST
REMOTE_USER
REMOTE_PROJECT_PATH

Optional environment:
REMOTE_PORT              defaults to 22
REMOTE_SSH_KEY           path to private key
REMOTE_PHP               defaults to php83`

export const getRemoteConfig = (): RemoteConfig => {
	const env = {
		...process.env,
		...withoutEmptyValues(readRootEnv(rootDir))
	}
	const remoteHost = env.REMOTE_HOST
	const remoteUser = env.REMOTE_USER
	const remoteProjectPath = env.REMOTE_PROJECT_PATH

	if (!remoteHost || !remoteUser || !remoteProjectPath) {
		throw new Error(
			'Missing REMOTE_HOST, REMOTE_USER, or REMOTE_PROJECT_PATH.'
		)
	}

	if (
		!remoteProjectPath.startsWith('/') ||
		remoteProjectPath === '/' ||
		/[\r\n]/.test(remoteProjectPath)
	) {
		throw new Error('REMOTE_PROJECT_PATH must be a safe absolute path.')
	}

	const remoteSshKey = expandHome(env.REMOTE_SSH_KEY)

	if (remoteSshKey && !existsSync(remoteSshKey)) {
		throw new Error(`REMOTE_SSH_KEY does not exist: ${remoteSshKey}`)
	}

	return {
		rootDir,
		remoteHost,
		remoteUser,
		remotePort: env.REMOTE_PORT || '22',
		remoteSshKey,
		remoteProjectPath,
		remotePhp: env.REMOTE_PHP || 'php83'
	}
}

const expandHome = (value?: string) => {
	if (!value) {
		return undefined
	}

	if (value === '~') {
		return homedir()
	}

	if (value.startsWith('~/')) {
		return resolve(homedir(), value.slice(2))
	}

	return value
}

const withoutEmptyValues = (env: Record<string, string | undefined>) =>
	Object.fromEntries(
		Object.entries(env).filter((entry): entry is [string, string] =>
			Boolean(entry[1])
		)
	)

export const shellQuote = (value: string) =>
	`'${value.replace(/'/g, `'\\''`)}'`
