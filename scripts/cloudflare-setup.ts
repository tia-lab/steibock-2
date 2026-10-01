import { spawnSync } from 'node:child_process'
import {
	readFileSync,
	renameSync,
	writeFileSync
} from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getCloudflareResourceNames } from './cloudflare-config.ts'
import { scriptLog } from './logger.ts'
import { rootProcessEnv } from './root-env.ts'

type D1Database = {
	name?: unknown
	uuid?: unknown
}

type WranglerConfig = {
	name?: string
	services?: Array<{ binding?: string; service?: string }>
	r2_buckets?: Array<{ binding?: string; bucket_name?: string }>
	d1_databases?: Array<{
		binding?: string
		database_name?: string
		database_id?: string
		migrations_dir?: string
	}>
}

const rootDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const appDir = resolve(rootDir, 'app')
const configPath = resolve(appDir, 'wrangler.jsonc')
const wranglerBinary = resolve(appDir, 'node_modules/.bin/wrangler')
const env: NodeJS.ProcessEnv = { ...rootProcessEnv(rootDir), CI: 'true' }
const logger = scriptLog('cloudflare-setup')

for (const key of ['CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN'] as const) {
	if (!env[key]?.trim()) {
		throw new Error(`${key} is required for Cloudflare resource setup.`)
	}
}

const { workerName, bucketName, databaseName } = getCloudflareResourceNames(
	env.PROJECT_NAME ?? ''
)
const config = readConfig()

validateConfiguredResources(config)
ensureR2Bucket(bucketName)
const databaseId = ensureD1Database(databaseName)
updateDatabaseId(config, databaseId)
runWrangler([
	'd1',
	'migrations',
	'apply',
	'NEXT_TAG_CACHE_D1',
	'--remote'
])

logger.info('Cloudflare resources are ready', {
	worker: workerName,
	r2Bucket: bucketName,
	d1Database: databaseName
})

function readConfig() {
	try {
		return JSON.parse(
			stripJsonComments(readFileSync(configPath, 'utf8'))
		) as WranglerConfig
	} catch {
		throw new Error('wrangler.jsonc must contain valid JSON before setup.')
	}
}

function validateConfiguredResources(value: WranglerConfig) {
	const selfService = value.services?.find(
		(item) => item.binding === 'WORKER_SELF_REFERENCE'
	)?.service
	const r2Name = value.r2_buckets?.find(
		(item) => item.binding === 'NEXT_INC_CACHE_R2_BUCKET'
	)?.bucket_name
	const d1Name = value.d1_databases?.find(
		(item) => item.binding === 'NEXT_TAG_CACHE_D1'
	)?.database_name

	if (
		value.name !== workerName ||
		selfService !== workerName ||
		r2Name !== bucketName ||
		d1Name !== databaseName
	) {
		throw new Error(
			'wrangler.jsonc resource names do not match the PROJECT_NAME-derived contract.'
		)
	}
}

function ensureR2Bucket(name: string) {
	const lookup = runWrangler(['r2', 'bucket', 'info', name, '--json'], true)

	if (lookup.status === 0) {
		const parsed = parseJsonObject(lookup.stdout, 'R2 bucket info')
		if (parsed.name !== name) throw new Error('Unexpected R2 bucket info response.')
		return
	}

	const missing = `${lookup.stdout}\n${lookup.stderr}`.toLowerCase()
	if (
		!missing.includes('not found') &&
		!missing.includes('does not exist') &&
		!missing.includes('no such') &&
		!missing.includes('10006')
	) {
		throw new Error('Unable to determine whether the R2 bucket exists.')
	}

	runWrangler(['r2', 'bucket', 'create', name])
	const created = parseJsonObject(
		runWrangler(['r2', 'bucket', 'info', name, '--json']).stdout,
		'created R2 bucket info'
	)
	if (created.name !== name) throw new Error('Created R2 bucket name mismatch.')
}

function ensureD1Database(name: string) {
	let databases = listD1Databases()
	let matches = databases.filter((item) => item.name === name)

	if (matches.length === 0) {
		runWrangler(['d1', 'create', name])
		databases = listD1Databases()
		matches = databases.filter((item) => item.name === name)
	}

	if (matches.length !== 1 || typeof matches[0].uuid !== 'string') {
		throw new Error('Expected exactly one named D1 database with a UUID.')
	}

	return matches[0].uuid
}

function listD1Databases() {
	const output = runWrangler(['d1', 'list', '--json']).stdout
	const parsed: unknown = JSON.parse(output)
	if (!Array.isArray(parsed)) throw new Error('Unexpected D1 list JSON response.')
	return parsed as D1Database[]
}

function updateDatabaseId(value: WranglerConfig, databaseId: string) {
	const binding = value.d1_databases?.find(
		(item) => item.binding === 'NEXT_TAG_CACHE_D1'
	)
	if (!binding) throw new Error('NEXT_TAG_CACHE_D1 binding is missing.')
	if (binding.database_id === databaseId) return

	const content = readFileSync(configPath, 'utf8')
	const bindingPattern =
		/\{[^{}]*"binding"\s*:\s*"NEXT_TAG_CACHE_D1"[^{}]*\}/
	const bindingBlock = content.match(bindingPattern)?.[0]
	if (!bindingBlock) throw new Error('Unable to locate the D1 binding object.')

	let updatedBlock: string
	if (/"database_id"\s*:/.test(bindingBlock)) {
		updatedBlock = bindingBlock.replace(
			/("database_id"\s*:\s*)"[^"]*"/,
			`$1"${databaseId}"`
		)
	} else {
		updatedBlock = bindingBlock.replace(
			/^(\s*)("database_name"\s*:\s*"[^"]+"\s*,)/m,
			`$1$2\n$1"database_id": "${databaseId}",`
		)
	}
	if (updatedBlock === bindingBlock) {
		throw new Error('Unable to update only the D1 database_id.')
	}

	const temporaryPath = `${configPath}.tmp`
	writeFileSync(temporaryPath, content.replace(bindingBlock, updatedBlock), {
		mode: 0o644
	})
	renameSync(temporaryPath, configPath)
	logger.info('updated the non-secret D1 database_id', {
		file: 'app/wrangler.jsonc'
	})
}

function stripJsonComments(content: string) {
	let result = ''
	let inString = false
	let escaped = false
	let lineComment = false
	let blockComment = false

	for (let index = 0; index < content.length; index += 1) {
		const current = content[index]
		const next = content[index + 1]

		if (lineComment) {
			if (current === '\n') {
				lineComment = false
				result += current
			}
			continue
		}
		if (blockComment) {
			if (current === '*' && next === '/') {
				blockComment = false
				index += 1
			} else if (current === '\n') {
				result += current
			}
			continue
		}
		if (!inString && current === '/' && next === '/') {
			lineComment = true
			index += 1
			continue
		}
		if (!inString && current === '/' && next === '*') {
			blockComment = true
			index += 1
			continue
		}

		result += current
		if (inString && current === '\\' && !escaped) {
			escaped = true
			continue
		}
		if (current === '"' && !escaped) inString = !inString
		escaped = false
	}

	return result
}

function parseJsonObject(output: string, label: string) {
	const parsed: unknown = JSON.parse(output)
	if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
		throw new Error(`Unexpected ${label} JSON response.`)
	}
	return parsed as Record<string, unknown>
}

function runWrangler(args: string[], allowFailure = false) {
	const result = spawnSync(wranglerBinary, args, {
		cwd: appDir,
		env,
		encoding: 'utf8',
		stdio: ['ignore', 'pipe', 'pipe']
	})
	const status = result.status ?? 1

	// Bun sets result.error for normal non-zero child exits. Preserve those
	// results so callers can handle expected failures such as a missing bucket.
	if (result.error && result.status === null) throw result.error
	if (!allowFailure && status !== 0) {
		const detail = (result.stderr || result.stdout).trim()
		throw new Error(
			`Wrangler command failed: ${args.slice(0, 3).join(' ')}${
				detail ? `\n${detail}` : ''
			}`
		)
	}

	return {
		status,
		stdout: result.stdout,
		stderr: result.stderr
	}
}
