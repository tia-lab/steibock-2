import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { once } from 'node:events'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

// Run after `bun run build`. Uses a loopback GraphQL stub and synthetic secrets;
// no Craft content or remote cache is changed.
const appDir = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const prefix = `cache-check-${Date.now()}`
const counts = new Map<string, number>()
const versions = new Map([[`${prefix}-a`, 1], [`${prefix}-b`, 1]])
const graphql = createServer(async (request, response) => {
  let raw = ''
  for await (const chunk of request) raw += chunk
  const payload = JSON.parse(raw)
  const operation = /query\s+(\w+)/.exec(payload.query)?.[1]
  const uri = payload.variables?.uri?.[0]
  const key = operation === 'EntryByUri' ? uri : operation
  counts.set(key, (counts.get(key) ?? 0) + 1)
  let data: object
  if (operation === 'EntryByUri') {
    data = { entry: {
      __typename: 'legalPage_Entry', id: uri.endsWith('-a') ? '901' : '902',
      title: uri, uri, sectionHandle: 'pages', typeHandle: 'legalPage',
      pageSeo: null, image: null, richText: { html: `<p>${uri}-version-${versions.get(uri)}</p>` }
    } }
  } else if (operation === 'Globals') {
    data = { footer: null, legal: null, errorPage: null, seo: null }
  } else {
    data = { entries: [] }
  }
  response.setHeader('content-type', 'application/json')
  response.end(JSON.stringify({ data }))
})
graphql.listen(0, '127.0.0.1')
await once(graphql, 'listening')
const graphqlAddress = graphql.address()
assert.ok(graphqlAddress && typeof graphqlAddress !== 'string')
const reservation = createServer()
reservation.listen(0, '127.0.0.1')
await once(reservation, 'listening')
const nextAddress = reservation.address()
assert.ok(nextAddress && typeof nextAddress !== 'string')
await new Promise<void>((resolve) => reservation.close(() => resolve()))
const base = `http://127.0.0.1:${nextAddress.port}`
const next = spawn(process.execPath.includes('bun') ? 'node' : process.execPath,
  ['node_modules/next/dist/bin/next', 'start', '-p', String(nextAddress.port), '-H', '127.0.0.1'], {
    cwd: appDir,
    env: { ...process.env, NODE_ENV: 'production',
      CRAFT_GRAPHQL_ENDPOINT: `http://127.0.0.1:${graphqlAddress.port}/gql`,
      CRAFT_GRAPHQL_TOKEN: 'disposable-graphql-token', REVALIDATE_SECRET: 'disposable-revalidation-secret' },
    stdio: ['ignore', 'pipe', 'pipe']
  })
let logs = ''
next.stdout.on('data', chunk => { logs += chunk.toString() })
next.stderr.on('data', chunk => { logs += chunk.toString() })
const invalidate = (tags: string[], secret = 'disposable-revalidation-secret') => fetch(`${base}/api/revalidate`, {
  method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ secret, tags })
})
const read = async (uri: string) => {
  const response = await fetch(`${base}/${uri}`)
  assert.equal(response.status, 200)
  return response.text()
}
try {
  let ready = false
  for (let i = 0; i < 100; i++) {
    try {
      await fetch(`${base}/api/revalidate`)
      ready = true
      break
    } catch {
      if (next.exitCode !== null) throw new Error('Next exited before becoming ready')
      await new Promise(resolve => setTimeout(resolve, 100))
    }
  }
  assert.ok(ready, 'Production Next server did not start')
  const a = `${prefix}-a`, b = `${prefix}-b`
  assert.ok((await read(a)).includes(`${a}-version-1`))
  assert.ok((await read(b)).includes(`${b}-version-1`))
  const warm = new Map(counts)
  await read(a); await read(b)
  assert.deepEqual(counts, warm, 'Warm requests must reuse cached GraphQL data')
  versions.set(a, 2); versions.set(b, 2)
  assert.equal((await invalidate([`craft:entry-uri:${a}`])).status, 200)
  assert.ok((await read(a)).includes(`${a}-version-2`), 'Affected page must refresh')
  assert.ok((await read(b)).includes(`${b}-version-1`), 'Unrelated page must stay cached')
  assert.equal(counts.get(b), warm.get(b), 'Unrelated entry must not refetch')
  assert.equal(counts.get('Globals'), warm.get('Globals'), 'Globals stay cached on body edit')
  assert.equal(counts.get('Navigation'), warm.get('Navigation'), 'Navigation stays cached on body edit')
  assert.equal((await invalidate(['craft:entry-links'])).status, 200)
  assert.ok((await read(b)).includes(`${b}-version-2`), 'Shared linked-entry dependency refreshes')
  assert.ok((counts.get('Globals') ?? 0) > (warm.get('Globals') ?? 0))
  assert.ok((await read(a)).includes(`${a}-version-2`))
  versions.set(a, 3)
  assert.equal((await invalidate(['craft'], 'wrong-secret')).status, 401)
  assert.ok((await read(a)).includes(`${a}-version-2`), 'Invalid secret must not invalidate')
  assert.equal((await invalidate(['craft'])).status, 200)
  assert.ok((await read(a)).includes(`${a}-version-3`), 'Full fallback remains available')
  console.log('Production Next cache checks passed: targeted refresh, unrelated reuse, shared dependencies, authorization, full fallback.')
} catch (error) {
  console.error(logs.slice(-6000))
  throw error
} finally {
  if (next.exitCode === null) {
    next.kill('SIGTERM')
    await once(next, 'exit')
  }
  graphql.closeAllConnections()
  await new Promise<void>(resolve => graphql.close(() => resolve()))
}
