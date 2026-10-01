import {
	existsSync,
	readFileSync,
	writeFileSync
} from 'node:fs'
import { resolve } from 'node:path'
import { gunzipSync, gzipSync } from 'node:zlib'
import { readRootEnv } from '../../scripts/root-env.ts'
import {
	type RemoteConfig,
	rootDir,
	shellQuote
} from './config'
import { sshWithInput } from './ssh'

export const assetDirs = ['uploads', 'Dummy', 'SEO']

const craftEnvKeys = [
	'CRAFT_ENVIRONMENT',
	'CRAFT_SECURITY_KEY',
	'CRAFT_LICENSE_KEY',
	'CRAFT_DB_DRIVER',
	'CRAFT_DB_SERVER',
	'CRAFT_DB_PORT',
	'CRAFT_DB_DATABASE',
	'CRAFT_DB_USER',
	'CRAFT_DB_PASSWORD',
	'PRIMARY_SITE_URL',
	'ASSET_BASE_URL',
	'ASSET_BASE_PATH',
	'CRAFT_DEV_MODE',
	'CRAFT_ALLOW_ADMIN_CHANGES',
	'CRAFT_DISALLOW_ROBOTS',
	'REVALIDATE_SECRET',
	'CRAFT_REVALIDATE_URL',
	'CRAFT_PREVIEW_SECRET',
	'NEXT_PUBLIC_SITE_URL'
] as const

const requiredProductionKeys = [
	'CRAFT_SECURITY_KEY',
	'CRAFT_DB_SERVER',
	'CRAFT_DB_DATABASE',
	'CRAFT_DB_USER',
	'CRAFT_DB_PASSWORD',
	'PRIMARY_SITE_URL',
	'CRAFT_PREVIEW_SECRET'
] as const

export type CraftRemoteEnv = Record<
	(typeof craftEnvKeys)[number],
	string
>

export const readCraftRemoteEnv = (): CraftRemoteEnv => {
	const file = resolve(rootDir, '.env')

	if (!existsSync(file)) {
		throw new Error('Missing .env. Run bun env:create first.')
	}

	const source = readRootEnv(rootDir, [file])
	const missing = requiredProductionKeys.filter((key) => !source[key])

	if (missing.length > 0) {
		throw new Error(
			`Missing hosted Craft values in .env: ${missing.join(', ')}`
		)
	}

	if (
		source.CRAFT_DB_SERVER === 'db' ||
		/(?:localhost|\.ddev\.site)(?:[:/]|$)/i.test(
			source.PRIMARY_SITE_URL || ''
		)
	) {
		throw new Error(
			'.env still contains local Craft values. Configure Cyon before pushing or pulling.'
		)
	}

	return {
		CRAFT_ENVIRONMENT: 'production',
		CRAFT_SECURITY_KEY: source.CRAFT_SECURITY_KEY!,
		CRAFT_LICENSE_KEY: source.CRAFT_LICENSE_KEY || '',
		CRAFT_DB_DRIVER: 'mysql',
		CRAFT_DB_SERVER: source.CRAFT_DB_SERVER!,
		CRAFT_DB_PORT: '3306',
		CRAFT_DB_DATABASE: source.CRAFT_DB_DATABASE!,
		CRAFT_DB_USER: source.CRAFT_DB_USER!,
		CRAFT_DB_PASSWORD: source.CRAFT_DB_PASSWORD!,
		PRIMARY_SITE_URL: source.PRIMARY_SITE_URL!,
		ASSET_BASE_URL: source.PRIMARY_SITE_URL!,
		ASSET_BASE_PATH: '@webroot',
		CRAFT_DEV_MODE: 'false',
		CRAFT_ALLOW_ADMIN_CHANGES: 'true',
		CRAFT_DISALLOW_ROBOTS: source.CRAFT_DISALLOW_ROBOTS || 'true',
		REVALIDATE_SECRET: source.REVALIDATE_SECRET || '',
		CRAFT_REVALIDATE_URL: source.CRAFT_REVALIDATE_URL || '',
		CRAFT_PREVIEW_SECRET: source.CRAFT_PREVIEW_SECRET!,
		NEXT_PUBLIC_SITE_URL: source.NEXT_PUBLIC_SITE_URL || ''
	}
}

export const prepareRemoteRuntime = (
	config: RemoteConfig,
	env: CraftRemoteEnv
) => {
	const envPath = `${config.remoteProjectPath}/.env`
	const mysqlConfigPath = remoteMysqlConfigPath(config)
	const prepare = [
		'set -e',
		'umask 077',
		`mkdir -p ${shellQuote(config.remoteProjectPath)} ${shellQuote(`${config.remoteProjectPath}/storage`)}`,
		`cat > ${shellQuote(envPath)}`
	].join('\n')

	assertSuccess(
		sshWithInput(config, prepare, renderCraftEnv(env)),
		'upload remote Craft environment'
	)
	assertSuccess(
		sshWithInput(
			config,
			[
				'set -e',
				'umask 077',
				`cat > ${shellQuote(mysqlConfigPath)}`
			].join('\n'),
			renderMysqlConfig(env)
		),
		'upload remote database client configuration'
	)
}

export const remoteMysqlConfigPath = (config: RemoteConfig) =>
	`${config.remoteProjectPath}/storage/.mysql-client.cnf`

export const remoteMysql = (
	config: RemoteConfig,
	env: CraftRemoteEnv
) =>
	`mysql --defaults-extra-file=${shellQuote(remoteMysqlConfigPath(config))} ${shellQuote(env.CRAFT_DB_DATABASE)}`

export const remoteMysqlDump = (
	config: RemoteConfig,
	env: CraftRemoteEnv
) =>
	`mysqldump --defaults-extra-file=${shellQuote(remoteMysqlConfigPath(config))} --single-transaction --skip-lock-tables ${shellQuote(env.CRAFT_DB_DATABASE)}`

export const normalizeDumpForMariaDb = (
	source: string,
	destination: string
) => {
	const compressed = source.endsWith('.gz')
	const input = readFileSync(source)
	const sql = (compressed ? gunzipSync(input) : input)
		.toString('utf8')
		.replace(/utf8mb4_0900_ai_ci/g, 'utf8mb4_unicode_ci')
		.replace(/^SET @@SESSION\.SQL_LOG_BIN=.*;\r?\n/gm, '')

	writeFileSync(destination, gzipSync(sql))
}

export const stamp = () =>
	new Date().toISOString().replace(/[:.]/g, '-')

export const assertSuccess = (
	result: { status: number | null; signal: NodeJS.Signals | null },
	action: string
) => {
	if (result.status !== 0) {
		throw new Error(
			`${action} failed${result.signal ? ` (${result.signal})` : ` (exit ${result.status ?? 'unknown'})`}.`
		)
	}
}

const renderCraftEnv = (env: CraftRemoteEnv) =>
	`${craftEnvKeys
		.map((key) => `${key}=${dotenvQuote(env[key])}`)
		.join('\n')}\n`

const renderMysqlConfig = (env: CraftRemoteEnv) =>
	[
		'[client]',
		`host=${mysqlOptionQuote(env.CRAFT_DB_SERVER)}`,
		`port=${mysqlOptionQuote(env.CRAFT_DB_PORT || '3306')}`,
		`user=${mysqlOptionQuote(env.CRAFT_DB_USER)}`,
		`password=${mysqlOptionQuote(env.CRAFT_DB_PASSWORD)}`,
		''
	].join('\n')

const dotenvQuote = (value: string) =>
	`"${value
		.replace(/\\/g, '\\\\')
		.replace(/"/g, '\\"')
		.replace(/\$/g, '\\$')
		.replace(/\n/g, '\\n')}"`

const mysqlOptionQuote = (value: string) =>
	`"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
