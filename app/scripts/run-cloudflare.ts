import { spawn, type ChildProcess } from 'node:child_process'
import {
	chmodSync,
	closeSync,
	existsSync,
	fsyncSync,
	openSync,
	unlinkSync,
	writeFileSync
} from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { scriptLog } from './logger'

type Signal = 'SIGINT' | 'SIGTERM' | 'SIGHUP'

const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const passthroughArgs = process.argv.slice(2).filter((arg) => arg !== '--')
const devVarsPath = resolve(appDir, '.dev.vars')
const openNextBinary = resolve(appDir, 'node_modules/.bin/opennextjs-cloudflare')
const wranglerBinary = resolve(appDir, 'node_modules/.bin/wrangler')
const logger = scriptLog('cloudflare')
const signals: Signal[] = ['SIGINT', 'SIGTERM', 'SIGHUP']
const requiredPreviewVariables = [
	'NEXT_PUBLIC_SITE_URL',
	'CRAFT_GRAPHQL_ENDPOINT',
	'CRAFT_PRIMARY_URL',
	'CRAFT_GRAPHQL_TOKEN',
	'CRAFT_PREVIEW_SECRET',
	'REVALIDATE_SECRET'
] as const
const previewVariables = [
	'NEXTJS_ENV',
	...requiredPreviewVariables,
	'CRAFT_PREVIEW_TOKEN_COOKIE'
] as const

async function runPreview() {
	const missing = requiredPreviewVariables.filter(
		(key) => !process.env[key]?.trim()
	)

	if (missing.length) {
		logger.error('missing required local preview variables', {
			variables: missing
		})
		process.exit(1)
	}

	if (existsSync(devVarsPath)) {
		logger.error('refusing to overwrite an existing .dev.vars file')
		process.exit(1)
	}

	const buildStatus = await run(openNextBinary, ['build'])
	if (buildStatus !== 0) process.exit(buildStatus)

	createDevVars()
	registerSignalCleanup()

	try {
		const migrationStatus = await run(wranglerBinary, [
			'd1',
			'migrations',
			'apply',
			'NEXT_TAG_CACHE_D1',
			'--local'
		])
		if (receivedSignal) process.exitCode = signalExitCode(receivedSignal)
		else if (migrationStatus !== 0) process.exitCode = migrationStatus
		else process.exitCode = await run(openNextBinary, [
			'preview',
			...passthroughArgs
		])
	} finally {
		removeSignalCleanup()
		cleanupDevVars()
	}
}

function createDevVars() {
	const lines = previewVariables.flatMap((key) => {
		const value =
			key === 'NEXTJS_ENV' ? 'development' : process.env[key]?.trim()
		return value ? [`${key}=${quoteDotenv(value)}`] : []
	})
	let descriptor: number | undefined
	let created = false

	try {
		descriptor = openSync(devVarsPath, 'wx', 0o600)
		created = true
		writeFileSync(descriptor, `${lines.join('\n')}\n`, 'utf8')
		fsyncSync(descriptor)
		closeSync(descriptor)
		descriptor = undefined
		chmodSync(devVarsPath, 0o600)
		logger.info('created ephemeral .dev.vars')
	} catch (error) {
		if (descriptor !== undefined) closeSync(descriptor)
		if (created) cleanupDevVars()
		throw error
	}
}

function quoteDotenv(value: string) {
	return `"${value
		.replaceAll('\\', '\\\\')
		.replaceAll('"', '\\"')
		.replaceAll('\r', '\\r')
		.replaceAll('\n', '\\n')}"`
}

function cleanupDevVars() {
	if (!existsSync(devVarsPath)) return

	try {
		unlinkSync(devVarsPath)
		logger.info('removed ephemeral .dev.vars')
	} catch (error) {
		process.exitCode ||= 1
		logger.error('failed to remove ephemeral .dev.vars', {
			error: error instanceof Error ? error.message : 'unknown error'
		})
	}
}

let activeChild: ChildProcess | undefined
let receivedSignal: Signal | undefined
const signalHandlers = new Map<Signal, () => void>()

function registerSignalCleanup() {
	for (const signal of signals) {
		const handler = () => {
			receivedSignal = signal
			process.exitCode = signalExitCode(signal)
			cleanupDevVars()
			activeChild?.kill(signal)
		}
		signalHandlers.set(signal, handler)
		process.once(signal, handler)
	}
}

function removeSignalCleanup() {
	for (const [signal, handler] of signalHandlers) {
		process.off(signal, handler)
	}
	signalHandlers.clear()
}

function run(binary: string, args: string[]) {
	return new Promise<number>((resolvePromise, reject) => {
		const child = spawn(binary, args, {
			cwd: appDir,
			env: process.env,
			stdio: 'inherit'
		})
		activeChild = child
		child.once('error', reject)
		child.once('exit', (code, signal) => {
			activeChild = undefined
			if (signal) {
				resolvePromise(signalExitCode(signal as Signal))
				return
			}
			resolvePromise(code ?? 1)
		})
	})
}

function signalExitCode(signal: Signal) {
	const signalNumbers: Record<Signal, number> = {
		SIGHUP: 1,
		SIGINT: 2,
		SIGTERM: 15
	}
	return 128 + signalNumbers[signal]
}

await runPreview()
