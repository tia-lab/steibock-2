# UBIQ Next

## Contents

- [Essential Workflow: Local Craft, Cyon, And Next](#essential-workflow-local-craft-cyon-and-next)
- [Cloudflare Frontend Configuration](#cloudflare-frontend-configuration)
  - [Cloudflare Account And Resource Setup](#cloudflare-account-and-resource-setup)
  - [Cloudflare Build And Runtime Values](#cloudflare-build-and-runtime-values)
  - [Cloudflare GitHub Connection](#cloudflare-github-connection)
  - [GitHub Actions Validation](#github-actions-validation)
  - [Cloudflare Production Deployment](#cloudflare-production-deployment)
- [What This Is](#what-this-is)
- [What This Is Not](#what-this-is-not)
- [License](#license)
- [Runtime Matrix](#runtime-matrix)
- [Repository Layout](#repository-layout)
- [Project Startup](#project-startup)
- [Environment Contract](#environment-contract)
- [Commands](#commands)
- [Deployment](#deployment)
- [Craft Model](#craft-model)
- [GraphQL Organization](#graphql-organization)
- [Next Routing](#next-routing)
- [Template Router](#template-router)
- [Page Layout And Sections](#page-layout-and-sections)
- [Images](#images)
- [Forms](#forms)
- [Metadata](#metadata)
- [Live Preview](#live-preview)
- [Cache Revalidation](#cache-revalidation)
- [Navigation](#navigation)
- [Frontend Organization](#frontend-organization)
- [Frontend Config](#frontend-config)
- [Style Token Generation](#style-token-generation)
- [Theme System](#theme-system)
- [Global Cursor](#global-cursor)
- [Preload Runtime](#preload-runtime)
- [Cookie Management](#cookie-management)
- [Slider Component](#slider-component)
- [Animation Imports](#animation-imports)
- [Element Animations](#element-animations)
- [Parallax Component](#parallax-component)
- [Route Lifecycle](#route-lifecycle)
- [Page Transitions](#page-transitions)
- [Starter Database And Content](#starter-database-and-content)
- [Local URLs](#local-urls)
- [Commit Hooks](#commit-hooks)
- [What Not To Infer](#what-not-to-infer)
- [Current Validation Surface](#current-validation-surface)

UBIQ Next is a headless Craft CMS and Next.js starter.

Craft owns content, authoring, assets, forms, project config, preview tokens,
and cache-change events. Next owns routing, rendering, metadata, frontend
state, image rendering, and cache revalidation.

The boundary between the two apps is GraphQL.

## Essential Workflow: Local Craft, Cyon, And Next

Next and Craft are independent runtimes:

```sh
bun dev        # generate CSS tokens and start only Next
bun dev:craft  # start only local Craft through DDEV
```

Starting or stopping one command does not start or stop the other.

The repository has one private root `.env`. It is ignored by Git.
`.env.example` is the committed template. Local DDEV database and site values
are generated in `craft/.ddev/.env.web`, so local Craft never connects to the
hosted Cyon database.

`DEV_PORT` is the single local Next port:

```env
DEV_PORT=3000
```

`bun dev` uses it for Next, and local DDEV derives its callback as
`http://host.docker.internal:<DEV_PORT>/api/revalidate`. This container-only
hostname lets Craft reach the Next process running on the host.

Hosted Cyon cannot reach `localhost` or `host.docker.internal`. When local Next
must render and revalidate content from hosted Craft, expose the local Next port
temporarily:

```sh
cloudflared tunnel --url http://localhost:3000
```

Keep the tunnel running, set the hosted callback to the generated public URL,
and propagate only the hosted environment:

```env
CRAFT_REVALIDATE_URL=https://<temporary-tunnel>.trycloudflare.com/api/revalidate
```

```sh
bun craft:push:env
```

The tunnel forwards Cyon's request to the local `/api/revalidate` handler. The
same `REVALIDATE_SECRET` must exist locally and on Cyon. When local testing is
finished, restore `CRAFT_REVALIDATE_URL` to the stable Worker URL and run
`bun craft:push:env` again:

```env
CRAFT_REVALIDATE_URL=https://<production-domain>/api/revalidate
```

### Project Name

`PROJECT_NAME` owns the local project identity and DDEV hostname:

```env
PROJECT_NAME=ubiq-next-cyon-cf
```

Synchronize it with DDEV through:

```sh
bun env:create --project-name=ubiq-next-cyon-cf
```

The resulting local Craft URLs are:

```txt
Site:    http://ubiq-next-cyon.ddev.site
Admin:   http://ubiq-next-cyon.ddev.site/admin
GraphQL: http://ubiq-next-cyon.ddev.site/gql/api
```

### Install Dependencies

The root and `app/` are separate Bun packages:

```sh
bun install
bun --cwd app install
```

Running `bun install` at the repository root does not install dependencies from
`app/package.json`.

`bun dev` is safe from either the repository root or `app/`. The app-local
launcher loads the single root `.env` before starting Next, so no `app/.env`
file is required or allowed.

### Choose Which Craft Next Uses

`bun dev` reads the Craft GraphQL connection from root `.env`. To use local
Craft:

```env
CRAFT_GRAPHQL_ENDPOINT=http://ubiq-next-cyon.ddev.site/gql/api
CRAFT_PRIMARY_URL=http://ubiq-next-cyon.ddev.site
CRAFT_GRAPHQL_TOKEN=<token-from-local-craft>
DEV_PORT=3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

To use hosted Cyon Craft:

```env
CRAFT_GRAPHQL_ENDPOINT=https://<craft-domain>/gql/api
CRAFT_PRIMARY_URL=https://<craft-asset-domain>
CRAFT_GRAPHQL_TOKEN=<token-from-hosted-craft>
DEV_PORT=3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

The token must come from the same Craft database as the configured GraphQL
endpoint. Find or create it in:

```txt
Craft control panel -> Settings -> GraphQL -> Tokens
```

Restart `bun dev` after changing an env value. Next reads these values when the
server starts. A browser error from the previous configuration can remain until
the dev server and page are restarted.

Next exposes `/admin` as an environment-aware shortcut to Craft Admin. It
derives the destination from `CRAFT_GRAPHQL_ENDPOINT`, so it redirects to DDEV
when Next uses local Craft and to Cyon when Next uses hosted Craft. The redirect
is temporary so switching environments does not leave a permanent browser
redirect behind.

Connection summary:

| Goal                              | Craft runtime | Next GraphQL endpoint                              | Commands                         |
| --------------------------------- | ------------- | -------------------------------------------------- | -------------------------------- |
| Develop against local Craft       | DDEV          | `http://ubiq-next-cyon.ddev.site/gql/api`          | `bun dev:craft` and `bun dev`    |
| Develop against hosted Craft      | Cyon          | `https://<craft-domain>/gql/api`                    | `bun dev`                        |
| Replace Cyon from local           | DDEV -> Cyon  | Not used by the synchronization command            | `bun craft:push`                 |
| Update only hosted Craft env      | Cyon          | Not used by the environment command                | `bun craft:push:env`             |
| Replace local content from Cyon   | Cyon -> DDEV  | Switch back to local after the pull for validation | `bun craft:pull`, then `bun dev` |

### Test Local Craft First

Use this order before testing remote synchronization:

1. Set the local GraphQL values shown above in `.env`.
2. Run `bun dev:craft`.
3. Open the local Craft control panel and verify login, content, assets, and the
   `NextJs` GraphQL token.
4. Run `bun dev`.
5. Verify `http://localhost:<DEV_PORT>` renders local Craft content.
6. Run `bun gql` if the Craft schema or GraphQL permissions changed.

### Cyon Configuration

#### Cyon Readiness Checklist

Complete this checklist before connecting the Cloudflare Worker to hosted Craft.
Database access, SSH access, and the remote path are required before
`bun craft:push`; the public web and TLS settings are required before accepting
the first push as production-ready:

- create the empty MySQL database and database user in my.cyon
- grant that user full permissions on the database
- record the database host, name, username, and password
- select PHP 8.3 for the Cyon website
- verify that the Craft domain DNS resolves to the Cyon webhosting
- choose and verify the absolute `REMOTE_PROJECT_PATH`
- set the domain target folder, or `Zielordner`, to the `web/` directory inside
  `REMOTE_PROJECT_PATH`; if my.cyon displays a relative folder, it must resolve
  to the same `<REMOTE_PROJECT_PATH>/web` directory
- activate a trusted Let's Encrypt certificate for the Craft domain
- verify the SSH host, user, private key, and access to the remote path
- complete the hosted Craft, database, and SSH values in the ignored root
  `.env`

Do not configure Next or Cloudflare with an HTTPS Craft endpoint while the domain
uses Cyon's temporary self-signed certificate.

#### Create The Cyon Database First

Before the first `bun craft:push`, create an empty MySQL database and its
database user in the Cyon control panel. Record the values Cyon provides:

```txt
database host
database name
database username
database password
```

The synchronization workflow uses Cyon's standard MySQL port `3306`.

The SSH account and SSH password are not Craft database credentials. The
provided SSH access and repository scripts do not provision a Cyon database or
database user, so database creation is a required control-panel step.

`craft:push` connects to the database configured in `.env`, creates/imports the
Craft tables and content, and synchronizes the application. It requires the
empty database and its user to exist already.

The same private `.env` owns only the hosted values that differ per project:

```env
CRAFT_SECURITY_KEY=<project-security-key>
CRAFT_LICENSE_KEY='<optional-craft-license-key>'
PRIMARY_SITE_URL=https://<craft-domain>
CRAFT_DISALLOW_ROBOTS=true
CRAFT_PREVIEW_SECRET=<shared-random-preview-secret>
NEXT_PUBLIC_SITE_URL=

CRAFT_DB_SERVER=<cyon-database-host>
CRAFT_DB_DATABASE=<cyon-database-name>
CRAFT_DB_USER=<cyon-database-user>
CRAFT_DB_PASSWORD=<cyon-database-password>

REMOTE_HOST=<cyon-ssh-host>
REMOTE_USER=<cyon-ssh-user>
REMOTE_SSH_KEY=/absolute/path/to/private-key
REMOTE_PROJECT_PATH=<remote-craft-application-root>
```

`craft:push`, `craft:push:env`, and `craft:pull` derive the fixed hosted runtime
values instead of requiring duplicate configuration: production environment,
MySQL on port 3306, the primary site URL as the asset base URL, `@webroot` as
the asset path, dev mode off, and admin changes on. This keeps Craft system and
GraphQL settings available to hosted administrators. SSH defaults to port 22
and remote PHP defaults to `php83`.

After Next has a deployed URL, configure its stable public URL and enable
Craft-to-Next cache revalidation with:

```env
NEXT_PUBLIC_SITE_URL=https://<worker-domain>
REVALIDATE_SECRET=<shared-random-secret>
CRAFT_REVALIDATE_URL=https://<worker-domain>/api/revalidate
```

Keep the generated local `NEXT_PUBLIC_SITE_URL` until the Worker URL exists,
and leave the hosted `CRAFT_REVALIDATE_URL` empty. The former becomes Craft's
preview target base URL after it is changed to the deployed domain; an empty
hosted revalidation URL makes the Cyon revalidator a no-op.

After the first Craft deployment, propagate the Worker callback URL without
replacing remote content:

```sh
bun craft:push:env
```

`REMOTE_PROJECT_PATH` is the Craft application root. The Cyon domain document
root must point to:

```txt
<REMOTE_PROJECT_PATH>/web
```

Do not run a push or pull until the remote path and Cyon database values have
been verified.

The hosted Craft domain must return a valid public TLS certificate before Next
uses an `https://` GraphQL endpoint. Node rejects self-signed certificates with
`DEPTH_ZERO_SELF_SIGNED_CERT`; fix the Cyon domain/certificate instead of
disabling TLS verification.

After the first push, verify all three public routes before configuring Cloudflare:

```txt
https://<craft-domain>/
https://<craft-domain>/admin
https://<craft-domain>/gql/api
```

### Cloudflare Frontend Configuration

#### Cloudflare Account And Resource Setup

The frontend is one Cloudflare Worker built by OpenNext. Before the first
Cloudflare deployment, obtain the two local setup values as follows:

1. In the Cloudflare dashboard, open **Workers & Pages**, find **Account
   Details**, and copy **Account ID**. The dashboard search command **Copy
   account ID** provides the same value.
2. Open **My Profile → API Tokens**, select **Create Token**, then choose
   **Start from scratch**.
3. Give the token a project-specific name and grant only these policies:

   ```txt
   Account → D1 → Write
   Account → Workers R2 Storage → Write
   Account Resources → Include → Specific account → <your account>
   ```

4. Create and immediately copy the token; Cloudflare displays its value only
   once. Use a normal Cloudflare API token, not the Global API Key or an R2
   Access Key/Secret pair.
5. Add both values to the ignored root `.env` without committing them:

   ```env
   CLOUDFLARE_ACCOUNT_ID=<account-id>
   CLOUDFLARE_API_TOKEN=<custom-token>
   ```

Then run the explicit one-time setup:

```sh
bun cf:setup
```

This creates or finds the project-named R2 incremental cache and D1 tag cache,
applies the committed migration, and writes only the non-secret `database_id`
into `app/wrangler.jsonc`. Commit that ID before the first deployment. This
local setup token is separate from the token managed by Cloudflare's GitHub
integration. Once setup succeeds, it may be removed from `.env` and revoked if
local resource setup will not be run again.

#### Cloudflare Build And Runtime Values

Cloudflare build values and Worker runtime values are separate. Adding a value
under build settings does not expose it to the deployed Worker. Configure them
under these two dashboard locations:

1. **Settings → Builds → Build variables and secrets** for `cf:build`.
2. **Settings → Variables & Secrets** for the deployed Worker runtime.

| Value                    | Build | Runtime | Cloudflare type | Purpose                                      |
| ------------------------ | :---: | :-----: | --------------- | -------------------------------------------- |
| `CRAFT_GRAPHQL_ENDPOINT` |  Yes  |   Yes   | Variable        | Schema/SSG builds and runtime Craft queries  |
| `CRAFT_GRAPHQL_TOKEN`    |  Yes  |   Yes   | Secret          | Authenticated build and runtime Craft queries |
| `CRAFT_PRIMARY_URL`      |  Yes  |    No   | Variable        | Build-time image origins and `/admin` redirect |
| `NEXT_PUBLIC_SITE_URL`   |  Yes  |    No   | Variable        | Canonical production origin in the Next build |
| `CRAFT_PREVIEW_SECRET`   |  No   |   Yes   | Secret          | Runtime preview-route authentication         |
| `REVALIDATE_SECRET`      |  No   |   Yes   | Secret          | Runtime cache-callback authentication        |

The two Craft GraphQL values are the only values required in both Cloudflare
locations. Using the same values in both scopes is mandatory. Setting the
runtime-only secrets as Cloudflare build secrets is unnecessary; setting the
build-only values as runtime variables is harmless but unnecessary.

`CRAFT_REVALIDATE_URL` is not a Cloudflare Worker variable. Hosted Craft uses
it to call the Worker, so keep it in the ignored root `.env` and propagate it
to Cyon with `bun craft:push:env`. Never add `CLOUDFLARE_ACCOUNT_ID` or
`CLOUDFLARE_API_TOKEN` to either Cloudflare location.

#### Cloudflare GitHub Connection

Connect the GitHub repository in Cloudflare Workers Builds and use:

```txt
Worker/Application name: <PROJECT_NAME>
Root directory: /app
Production branch: main
Build command: bun run cf:build
Deploy command: bun run cf:deploy -- --keep-vars
Version command: bun run cf:upload -- --keep-vars
```

The Worker/Application name must exactly match `name` in
`app/wrangler.jsonc`. Enable builds for non-production branches to receive
preview versions. Cloudflare Access protection for those previews is optional.

Use `cf:build`, not the ordinary `build`, in Cloudflare Workers Builds. The
ordinary command verifies the Next application; `cf:build` first generates the
ignored GraphQL schema and gql.tada types, runs the Next build, and then packages
its output as the deployable OpenNext Worker.

#### GitHub Actions Validation

The repository's separate GitHub Actions workflow also runs `bun run cf:build`
as a validation check when its Craft GraphQL secrets are available. It never
deploys. Add `CRAFT_GRAPHQL_ENDPOINT` and `CRAFT_GRAPHQL_TOKEN` as GitHub
repository secrets if the full `CI / verify` build should be required. These
GitHub secrets are separate from Cloudflare build and Worker runtime values.

#### Cloudflare Production Deployment

Production deployment sequence:

1. Before the first deployment, configure every Cloudflare value from the
   scope table except `NEXT_PUBLIC_SITE_URL`, which is not yet known.
2. Push `main`. Cloudflare Workers Builds builds and deploys production.
   Non-production branches upload preview versions without replacing production.
3. Copy the stable workers.dev or custom Worker origin into root `.env`:

   ```env
   NEXT_PUBLIC_SITE_URL=https://<production-domain>
   CRAFT_REVALIDATE_URL=https://<production-domain>/api/revalidate
   ```

   Use the stable Worker or custom domain, not an uploaded-version preview URL.
4. Add `NEXT_PUBLIC_SITE_URL` under Cloudflare **Settings → Builds → Build
   variables and secrets**, then redeploy so Next compiles the production
   canonical origin into the application. Do not add `CRAFT_REVALIDATE_URL` to
   Cloudflare.
5. Propagate the frontend URL, callback URL, `REVALIDATE_SECRET`, and
   `CRAFT_PREVIEW_SECRET` to hosted Craft:

   ```sh
   bun craft:push:env
   ```

   Confirm with `PUSH CRAFT ENV TO REMOTE`. This updates only the hosted
   runtime environment; it does not synchronize source, database content, or
   assets.

Cloudflare Workers Builds owns Git-triggered frontend builds, branch previews,
and production deployment from `main`. Cloudflare also owns the Worker runtime
bindings, values, secrets, and domain. The local root `.env` is never uploaded.

### Push Local Craft To Cyon

```sh
bun dev:db:backup
bun craft:push
```

`dev:db:backup` exports the running local DDEV database to
`craft/_backup-db/db_<epoch-ms>.sql`. Timestamped development backups are local
and ignored by Git. The command also replaces the tracked
`craft/_backup-db/db.sql` with the same latest database so clones and bootstrap
receive the current canonical content.

`craft:push` is a complete, destructive local-to-remote synchronization:

- syncs the Craft source code
- selects the timestamped `db_<epoch-ms>.sql` or `.sql.gz` backup with the
  highest timestamp
- uses the tracked `db.sql` database when no timestamped backup exists
- converts MySQL 8-only collations for Cyon MariaDB 10.6
- attempts a timestamped remote database backup
- replaces the remote database
- replaces managed `uploads`, `Dummy`, and `SEO` asset directories
- installs remote Composer dependencies when required
- runs migrations, applies project config, and clears caches

Create a fresh backup immediately before a push when the remote must receive the
latest local content. The selected database contains authored content; the
managed directories contain the corresponding files. `cpresources` and
generated image transforms are not synchronized because Craft regenerates them.

The command displays the exact remote target and requires:

```txt
PUSH CRAFT TO REMOTE
```

### Push Only The Craft Environment To Cyon

```sh
bun craft:push:env
```

`craft:push:env` updates an existing hosted Craft installation without running
the full synchronization. It:

- verifies the remote Craft console entry point exists
- creates timestamped backups of the existing remote environment files
- replaces the remote Craft `.env` from the hosted values in the root `.env`
- replaces the private remote MySQL client configuration
- does not synchronize Craft source, database content, or assets
- does not run Composer, migrations, or Project Config

Use it after changing runtime-only values such as `NEXT_PUBLIC_SITE_URL`,
`CRAFT_REVALIDATE_URL`, or `CRAFT_PREVIEW_SECRET`. The command displays the
exact remote target and requires:

```txt
PUSH CRAFT ENV TO REMOTE
```

### Pull Cyon Craft Into Local DDEV

```sh
bun craft:pull
```

`craft:pull` is a complete, destructive remote-to-local content
synchronization:

- starts DDEV when required
- creates a timestamped local database backup
- downloads and replaces the local database
- replaces managed local `uploads`, `Dummy`, and `SEO` directories
- runs local migrations, applies local project config, and clears caches

The command requires:

```txt
PULL CRAFT FROM REMOTE
```

Craft source code and project config remain owned by Git and the local
repository; `craft:pull` does not pull PHP or project-config files from the
server.

GraphQL schema permissions are Project Config. If an administrator changes
them on hosted Craft, make the same change in local Craft before the next
`craft:push`; otherwise the locally owned Project Config will replace the
hosted change.

After pulling, set the local GraphQL endpoint in `.env`, use the token contained
in the pulled database, restart `bun dev`, and verify the pulled content
locally.

Both synchronization commands log through Pino. Separate `push-sync` and
`pull-sync` commands are unnecessary because `craft:push` and `craft:pull`
already synchronize the database, content, and managed assets.

## What This Is

This repository is a full starter for a small headless website system:

- a Craft CMS app under `craft/`
- a Next app under `app/`
- a section-based Craft page composer
- typed GraphQL queries through `gql.tada`
- Next App Router templates for pages, legal pages, and news entries
- live preview from Craft into Next
- tag-based cache revalidation from Craft into Next
- global SEO, footer, and legal/cookie content
- local DDEV orchestration for Craft
- Bun scripts for development, GraphQL generation, validation, and confirmed
  Craft synchronization

The current frontend is intentionally minimal. Several section components still
render placeholders. The important part is that the content model, GraphQL
shape, routing, preview path, and cache path are wired.

## What This Is Not

This is not a Craft Twig frontend.

This is not a theme.

This is not a generic page builder with unlimited visual controls.

This is not a GraphQL mutation client. Query access is the default frontend
contract.

The documented deployment uses Cyon for Craft and Cloudflare Workers for Next. The
application boundary remains environment-defined GraphQL.

This is not a cache dependency graph. Cache tags are coarse, explicit, and owned
by query wrappers and the Craft headless module.

## License

This repository is proprietary software owned by Mattia Chiesa and licensed to
UBIQ AG for UBIQ AG business purposes.

UBIQ AG may use, copy, modify, replicate, deploy, and reuse the starter for
UBIQ AG work, including internal work, client projects, prototypes, commercial
websites, and future UBIQ AG projects. The intellectual property, copyright,
authorship, source ownership, architecture, patterns, and original authorship of
the starter remain with Mattia Chiesa.

UBIQ AG's license continues indefinitely for UBIQ AG business purposes,
including if Mattia Chiesa later leaves, stops working with, or stops providing
services to UBIQ AG. This does not transfer ownership, authorship, copyright, or
intellectual property rights to UBIQ AG, its employees, contractors, clients, or
partners.

Employees and contractors may use the starter only while acting for UBIQ AG
business purposes. They may not reuse it for personal projects, freelance work,
other employers, side projects, or third-party work outside UBIQ AG.

See [LICENSE.md](LICENSE.md) and [NOTICE.md](NOTICE.md).

## Runtime Matrix

| Concern            | Owner          | Runtime                       | Current binding                               |
| ------------------ | -------------- | ----------------------------- | --------------------------------------------- |
| Content model      | Craft          | PHP / DDEV or Cyon            | `craft/config/project/`                       |
| Content editing    | Craft          | Control panel                 | local DDEV or hosted Cyon Craft admin         |
| Frontend rendering | Next           | Node                          | App Router under `app/src/app/`               |
| Data boundary      | Craft GraphQL  | HTTP                          | configured by `CRAFT_GRAPHQL_ENDPOINT`        |
| Query typing       | Next           | build/dev                     | `gql.tada` and `app/src/graphql-env.d.ts`     |
| Preview            | Craft + Next   | request-time                  | `/api/preview`                                |
| Cache invalidation | Craft + Next   | request-time                  | `/api/revalidate`                             |
| Images             | Craft + Next   | Craft transforms + Next Image | `ImageCraft`                                  |
| Forms              | Craft Freeform | Craft plugin                  | exposed through GraphQL when schema allows it |
| Preload            | Next           | client session                | `Preload` + `usePreloadStore`                 |

## Repository Layout

```txt
craft/
  .ddev/
  config/
  modules/
  web/
  composer.json
  craft

app/
  scripts/
  src/
    app/
    Components/
    Sections/
    Templates/
    animations/
    lib/craft/
    queries/
    styles/
  config.ts
  graphql/
    schema.graphql
  package.json
  next.config.ts
  tsconfig.json

scripts/
  run-app.ts
  craft-dev.ts
  set-admin-user.ts

deploy/
  scripts/
    craft-remote-push.ts
    craft-remote-pull.ts
```

Craft is intentionally nested. Next is intentionally nested under `app/`. The
repository root is the shared orchestration layer and owns `.env` and its
committed `.env.example` template.

## Project Startup

Use this sequence for a fresh local checkout.

### 1. Install dependencies

```sh
bun install
```

Root dependencies are required before repository scripts can run. Bootstrap
installs the separate Next app dependencies. Craft Composer dependencies are
installed by the local bootstrap or Craft dev script when missing.

### 2. Bootstrap the local project

Run the local bootstrap on a fresh checkout:

```sh
bun bootstrap
```

Use an explicit project name when the folder name is not the desired DDEV host:

```sh
bun bootstrap --project-name=pivotas-next
```

Bootstrap does the first-run work in order:

1. creates and syncs env files and project-derived Wrangler resource names
   through `bun env:create`
2. installs Next app dependencies in `app/`
3. writes the local Next URL and DDEV revalidation callback from `DEV_PORT`
4. starts Craft through DDEV
5. installs Composer dependencies when missing
6. imports `craft/_backup-db/db.sql` when Craft is not installed
7. applies Craft project config after a first-run database import
8. creates or reuses the local Craft GraphQL token
9. writes `CRAFT_GRAPHQL_TOKEN` to `.env`
10. regenerates the GraphQL schema and typed query output through `bun gql`

Bootstrap prints the generated local DDEV callback when it finishes. It does
not start a public tunnel: a tunnel is needed only when hosted Cyon must
revalidate a Next server running on the local machine.

After bootstrap completes, run:

```sh
bun dev
```

### 3. Environment files

`.env` is the only private runtime env file. `.env.example` is its committed
template.

`bun env:create` derives the local project name from the repository folder,
creates `.env` when missing, writes the project-specific local Craft endpoint
and asset origin, sets `DEV_PORT=3000` and the matching local Next URL, and
generates `CRAFT_SECURITY_KEY`, `REVALIDATE_SECRET`, and
`CRAFT_PREVIEW_SECRET`. It also synchronizes `craft/.ddev/config.yaml` and
the Worker, self-service, R2, and D1 names in `app/wrangler.jsonc`, then removes
stale generated DDEV router/env files. If the project name changes after D1 was
configured, it removes the obsolete D1 ID so `bun cf:setup` can bind the newly
named database. The Worker name equals `PROJECT_NAME`; the Next-specific cache
resources use the same project prefix with descriptive suffixes.

Existing values for keys in `.env.example` are preserved. The command also
removes obsolete keys, restores the template's grouping/comments, and
synchronizes `PROJECT_NAME` when it still contains the starter default. Use
`bun env:create --force` only when intentionally resetting `.env` from
`.env.example`.

Use an explicit project name when the folder name is not the desired DDEV host:

```sh
bun env:create --project-name=pivotas-next
```

### 4. Generate Sass tokens

Run this after changing `app/src/styles/vars.ts` or pulling changes that modify
the style generator:

```sh
bun css
```

### 5. Start Development Runtimes

```sh
bun dev
bun dev:craft
```

These commands are independent. `bun dev` starts only Next; `bun dev:craft`
starts only local Craft through DDEV.

### 6. Create or update the GraphQL schema token in Craft

Bootstrap creates or reuses the local token for the starter `NextJs` GraphQL
schema. If you manually replace the schema, make sure it can query:

- `pages`
- `news`
- `navigations`
- `footer`
- `legal`
- `seo`
- `uploads`
- Freeform forms if forms should be queried

Enable drafts and non-enabled elements if live preview should support them.

Copy the generated bearer token into:

```txt
CRAFT_GRAPHQL_TOKEN
```

### 7. Generate frontend GraphQL types

Run after:

- creating the GraphQL schema
- changing Craft fields, sections, entry types, globals, or GraphQL permissions
- changing GraphQL fragments or queries
- pulling changes that modify `craft/config/project/` or `app/src/queries/`

```sh
bun gql
```

If only the schema changed:

```sh
bun gql:schema
bun gql:types
```

If only query documents changed:

```sh
bun gql:check
```

### 8. Validate frontend code

```sh
bun run lint
bun run build
```

The build command generates CSS and checks queries against the locally generated
GraphQL schema before `next build`. Run `bun gql` explicitly when the Craft
schema, permissions, generated types, fragments, or queries change.

## Environment Contract

Environment files exist at the repository root:

```txt
.env
.env.example
```

Do not commit real project secrets.

- `.env` contains the private Craft connection, frontend, hosted database, and
  SSH values.
- `.env.example` documents the same keys with safe placeholders.
- Local DDEV receives generated local overrides in `craft/.ddev/.env.web`; it
  never uses the hosted database connection.

Required before the frontend can query Craft:

```txt
CRAFT_GRAPHQL_ENDPOINT
CRAFT_GRAPHQL_TOKEN
```

`CRAFT_PRIMARY_URL` adds a separate allowed Craft asset origin when it differs
from the GraphQL endpoint origin.

Local development normally sets:

```txt
DEV_PORT=3000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

`bun dev` validates `DEV_PORT`, starts Next on that port, and derives the local
`NEXT_PUBLIC_SITE_URL`. Local DDEV uses the same port for
`http://host.docker.internal:<DEV_PORT>/api/revalidate`. `DEV_PORT` is not
needed in Cloudflare or Cyon.

The frontend site URL resolves in this order:

1. `NEXT_PUBLIC_SITE_URL`
2. the current request origin
3. `http://localhost:3000`

Set `NEXT_PUBLIC_SITE_URL` to the exact workers.dev or custom production
origin for canonical metadata and preview redirects.

Cache revalidation uses:

```txt
REVALIDATE_SECRET
CRAFT_REVALIDATE_URL
```

`bun env:create` generates `REVALIDATE_SECRET`. Local Craft automatically
receives a callback derived from `DEV_PORT`; the root
`CRAFT_REVALIDATE_URL` remains the hosted callback and stays empty until the
Next deployment URL exists.

Live Preview requires:

```txt
CRAFT_PREVIEW_SECRET
NEXT_PUBLIC_SITE_URL
```

`bun env:create` generates `CRAFT_PREVIEW_SECRET`. The same value must be
configured in Cloudflare and propagated to Craft/Cyon. Local development
derives `NEXT_PUBLIC_SITE_URL` from `DEV_PORT`; after the first Worker
deployment, the root `.env` uses the stable production domain so
`bun craft:push:env` can configure Craft's production preview target.

Required for hosted Craft and remote synchronization:

```txt
CRAFT_SECURITY_KEY
PRIMARY_SITE_URL
CRAFT_DB_SERVER
CRAFT_DB_DATABASE
CRAFT_DB_USER
CRAFT_DB_PASSWORD
REMOTE_HOST
REMOTE_USER
REMOTE_PROJECT_PATH
```

`REMOTE_SSH_KEY` is optional when the SSH client can authenticate through its
normal key configuration. Set it to an absolute private-key path when the
project uses a dedicated key.

`CRAFT_DISALLOW_ROBOTS` is an explicit hosted policy and defaults to `true`.
Change it to `false` only when the production site should be indexed.

`CRAFT_LICENSE_KEY` is optional for an unlicensed/Solo installation. When a
paid Craft license is used, Craft reads it from this env value. Do not add
`craft/config/license.key` files; the env value is the single license source
for local and production Craft. Keep the value quoted because Craft license
keys contain characters that dotenv can otherwise parse incorrectly:

```env
CRAFT_LICENSE_KEY='paste-the-full-250-character-key'
```

Set the optional license directly in the private root `.env`. The value is
propagated to local Craft and Cyon by the existing environment workflows.

The important groups are:

- headless connection: Craft GraphQL endpoint and bearer token
- public origins: Next public site URL, Craft GraphQL origin, and Craft asset origin
- cache revalidation: one shared secret and the Next callback URL
- live preview: mandatory shared preview secret
- hosted Craft: security key, public site URL, robots policy, and optional license
- hosted database: Cyon host, database, user, and password
- manual Craft hosting: SSH target, key, and Craft application path

The local Craft GraphQL endpoint uses the generated DDEV host:

```txt
http://<project-name>.ddev.site/gql/api
```

Next derives the allowed Craft image origins from:

```txt
CRAFT_GRAPHQL_ENDPOINT
CRAFT_PRIMARY_URL
```

Local DDEV generates its own database, URL, asset, dev-mode, and
admin-change values in `craft/.ddev/.env.web`. Remote synchronization writes
the corresponding fixed production values to Cyon. These generated values do
not belong in the root `.env`.

## Commands

Run commands from the repository root unless a command explicitly says
otherwise. `bun dev` is the only public command intentionally supported from
both the root and `app/`.

### Environment

```sh
bun bootstrap
```

Bootstraps a fresh local checkout: creates/synchronizes `.env`, installs app
dependencies, starts DDEV Craft, imports the baseline database when required,
ensures the local GraphQL token, and regenerates GraphQL artifacts.

```sh
bun env:create
```

Creates `.env` from `.env.example` when it does not exist. It also syncs the
DDEV project name and Cloudflare resource names, writes `DEV_PORT=3000` and
project-specific local URLs, and generates the Craft security, revalidation,
and preview secrets.

```sh
bun env:create --project-name=pivotas-next
```

Uses `pivotas-next.ddev.site` even if the repository folder has a different
name.

```sh
bun env:create --force
```

Resets `.env` from `.env.example`, writes fresh local defaults, and regenerates
the secrets. Use this only when intentionally resetting the private runtime
environment.

### Development

```sh
bun dev
```

Generates frontend style tokens and starts only Next. Run it from the repository
root or from `app/`; both paths load the single root `.env`. Next listens on
`DEV_PORT`, which defaults to `3000`.

```sh
bun cf:preview
```

Builds and serves the OpenNext Worker locally. It transports only allowlisted
frontend variables through an owner-only, ephemeral `app/.dev.vars`, applies
the local D1 migration, and removes the file on exit. A pre-existing file makes
the command stop without overwriting it.

```sh
bun cf:typegen
```

Regenerates the ignored Worker binding declaration from
`app/wrangler.jsonc`.

```sh
bun dev:webpack
```

Starts Next with Webpack from the repository root as a diagnostic fallback.

```sh
bun dev:craft
```

Starts only Craft through DDEV, installs Composer dependencies if missing, checks
Craft install state, imports `craft/_backup-db/db.sql` if Craft is not installed
and the dump exists, then prints Craft URLs. It derives the local preview URL
and revalidation callback from `DEV_PORT`, and restarts running containers only
when the generated DDEV environment changed.

### Craft

```sh
bun dev:craft:stop
```

Stops the Craft DDEV project.

```sh
bun dev:craft:delete
```

Deletes the disposable local DDEV project and database after DDEV's
confirmation. It skips the database snapshot, so a stopped project is not
restarted merely for deletion. Source code and `craft/.ddev/` configuration
remain untouched.

```sh
bun craft:set-admin
```

Prompts for a Craft username and password, then sets the password through Craft
CLI. The default username prompt is `admin`.

```sh
bun dev:db:backup
```

Exports the running DDEV database to an ignored
`craft/_backup-db/db_<epoch-ms>.sql` file and copies the same database to the
tracked `craft/_backup-db/db.sql`. `craft:push` selects the backup with the
highest numeric timestamp and falls back to `db.sql` when none exists.

```sh
bun craft:push
bun craft:push:env
bun craft:pull
```

`craft:push` and `craft:pull` manually synchronize the Craft database, content,
and managed asset directories between local DDEV and Cyon. Both commands are
destructive, display the exact target, attempt the relevant backup, and require
the confirmation documented in the essential workflow.

`craft:push:env` replaces only the existing remote runtime environment and
database client configuration. It displays the exact target and requires its
own confirmation, but does not synchronize source, database content, or assets.

The managed asset list is currently `uploads`, `Dummy`, and `SEO`. Add any new
top-level Craft asset directory to the synchronization script before relying on
push or pull for it.

### GraphQL

```sh
bun gql:schema
```

Downloads the Craft GraphQL schema into `app/graphql/schema.graphql`.
Transient network failures are retried eight total attempts with exponential
delays from 10 seconds through 640 seconds; the command still exits nonzero when
Craft remains unavailable.

```sh
bun gql:types
```

Generates the `gql.tada` TypeScript environment into
`app/src/graphql-env.d.ts`.

```sh
bun gql:check
```

Checks GraphQL documents against the generated schema.

```sh
bun gql
```

Runs schema generation, type generation, and GraphQL checking.

```sh
bun gql:generate
```

Runs schema and TypeScript environment generation without the final document
check.

The root command delegates to the app-local `gql.tada` wrapper so the generated
schema and type files stay within the Next app and the OpenNext build does not
depend on a script above its Root Directory.

### Frontend

```sh
bun css
```

Generates Sass maps, root CSS variables, Sass aliases, and utility classes from
`app/src/styles/vars.ts`.

```sh
bun run lint
```

Lints the Next source, config, and app scripts, then type-checks the root
orchestration and Craft synchronization scripts. It does not lint PHP or
`craft/vendor`.

```sh
bun run build
```

Generates CSS tokens, checks queries against the committed GraphQL schema, then
runs `next build`. It does not introspect or regenerate the remote Craft schema;
run `bun gql` explicitly after schema, permission, generated-type, fragment, or
query changes. Static generation still requires the configured Craft GraphQL
endpoint and token to return page data.

```sh
bun run verify
```

Currently runs lint.

```sh
bun start
```

Starts the previously built Next application.

### Release

Use the release commands only from a clean `main` branch.

```sh
bun release:patch
bun release:minor
bun release:major
```

For an explicit version:

```sh
bun release set 0.2.0
```

The release script:

- requires `main`
- requires a clean worktree
- requires root `package.json` and `app/package.json` versions to match
- bumps both package versions
- refreshes root and app Bun lockfiles
- runs `bun run verify`
- commits the version bump
- creates an annotated tag named `ubiq-next-v{version}`
- pushes `main` and tags to `origin`

Release commit and tag messages use:

```txt
chore: release ubiq-next-v{version}
```

## Deployment

The canonical Craft workflow is
[Essential Workflow: Local Craft, Cyon, And Next](#essential-workflow-local-craft-cyon-and-next).

Next and Craft deploy independently:

- GitHub Actions installs, lints, and validates the OpenNext Worker build; it
  never deploys.
- Cloudflare Workers Builds creates branch previews and deploys `main` to
  production directly from the connected GitHub repository.
- OpenNext builds one Cloudflare Worker; Cloudflare owns its domain, runtime
  values, R2 incremental cache, D1 tag cache, and Images binding.
- Run `bun cf:setup` manually once per project; Workers Builds never creates
  those resources.
- Cyon owns the traditional PHP/MySQL Craft runtime and Craft domain.
- `bun craft:push` and `bun craft:pull` own manual Craft content
  synchronization; `bun craft:push:env` updates only the hosted runtime
  environment.
- Cloudflare Workers Builds never synchronizes Craft, runs releases, or creates
  the R2 and D1 resources managed by `bun cf:setup`.
- Review the displayed target and type the required confirmation before every
  push or pull.

Configure Cloudflare build and runtime values according to
[Cloudflare Build And Runtime Values](#cloudflare-build-and-runtime-values).
Build settings do not automatically become Worker runtime bindings.

Cloudflare's Git integration authenticates deployment, so the build does not
need repository-level Cloudflare account credentials. Missing application values
fail the build or runtime checks that consume them.

## Craft Model

The starter model is small by design.

The private [UBIQ Editorial Permissions plugin](craft/plugins/ubiq-editorial-permissions/README.md)
adds configurable Matrix action and page entry-type restrictions through Craft's
native user permissions. Its README covers installation, admin settings, testing,
and remaining acceptance checks.

### Entries

| Section     | Handle        | Entry types         | Purpose                      |
| ----------- | ------------- | ------------------- | ---------------------------- |
| Pages       | `pages`       | `page`, `legalPage` | normal pages and legal pages |
| News        | `news`        | `news`              | news collection              |
| Navigations | `navigations` | `navigation`        | named navigation definitions |

### Page Sections

Pages compose content through the `sections` Matrix field.

Current section entry types:

| Entry type       | Purpose                                                        |
| ---------------- | -------------------------------------------------------------- |
| `sectionHero`    | title, subtitle, image                                         |
| `sectionAbout`   | image/text block with variant                                  |
| `sectionContent` | rich text section                                              |
| `sectionCta`     | title, text, links                                             |
| `sectionContact` | title, text, Freeform form reference                           |
| `sectionNews`    | news display section with variant, limit, order, selected news |

Sections can opt into custom spacing through `customSpacing`, `spaceTop`, and
`spaceBottom`.

### Shared Content Fields

The reusable link model is represented by the `links` Matrix field.

The asset model is represented by the shared image field and image fragment.

Rich text is represented by the `richText` CKEditor field and queried as HTML.

### Globals

| Global     | Handle      | Purpose                                                              |
| ---------- | ----------- | -------------------------------------------------------------------- |
| Footer     | `footer`    | company/contact/social/footer data                                   |
| Legal      | `legal`     | cookie and legal UX copy                                             |
| Error Page | `errorPage` | editable 404 title, text, and fallback link                          |
| SEO        | `seo`       | site metadata defaults, icons, Open Graph fallbacks, `llms.txt` text |

## GraphQL Organization

GraphQL documents live under:

```txt
app/src/queries/
```

Main query surfaces:

| File              | Purpose                            |
| ----------------- | ---------------------------------- |
| `entry-by-uri.ts` | page, legal, and news entry lookup |
| `globals.ts`      | footer, legal, Error Page, and SEO globals |
| `navigation.ts`   | named navigation lookup            |
| `news.ts`         | news index lookup                  |

Fragments live under:

```txt
app/src/queries/fragments/
```

Current fragments:

| Fragment             | Purpose                  |
| -------------------- | ------------------------ |
| `AssetImageFragment` | Craft asset image shape  |
| `LinkFragment`       | reusable link shape      |
| `SectionFragment`    | page section union shape |
| `SeoFragment`        | per-entry SEO shape      |

Query wrappers live under:

```txt
app/src/lib/craft/queries/
```

Wrappers own cache tags. Components and templates should not invent cache tags.

## Next Routing

Routes are intentionally separated by content type.

```txt
app/src/app/page.tsx
```

Renders the Craft homepage. The internal Craft URI for the homepage is `home`.

```txt
app/src/app/[...slug]/page.tsx
```

Renders normal Craft pages and legal pages by URI.

```txt
app/src/app/news/page.tsx
```

Renders the news index.

```txt
app/src/app/news/[slug]/page.tsx
```

Renders a news detail page by querying the Craft URI:

```txt
news/{slug}
```

The homepage and news index are prerendered during the build. The catch-all
page route and news-detail route return an empty `generateStaticParams()` list,
so valid Craft URIs are generated on first access and then participate in
Next/OpenNext ISR.

Public routes do not read preview query parameters. Requests containing
`x-craft-preview-token` are internally rewritten before route selection to:

```txt
app/src/app/craft-preview/[[...slug]]/page.tsx
```

That route is dynamic and `no-store`. The browser keeps the normal public URL;
`craft-preview` is a reserved internal route prefix and must not be used as a
Craft page URI.

## Template Router

`app/src/Templates/TemplateRouter.tsx` routes entry types to templates:

| Craft entry type  | Next template   |
| ----------------- | --------------- |
| `page_Entry`      | `PageTemplate`  |
| `legalPage_Entry` | `LegalTemplate` |
| `news_Entry`      | `NewsTemplate`  |

Normal pages then render `sections` through:

```txt
app/src/Sections/SectionRouter.ts
```

The section router maps Craft section entry types to section components.

## Page Layout And Sections

Page layout is split into three layers.

### Routes

Files under `app/src/app/` are route boundaries. They should resolve params,
preview state, metadata, and data fetching, then hand typed entries to a
template.

Routes should stay thin. Do not put section rendering logic directly in route
files.

### Templates

Files under `app/src/Templates/` own entry-level layout.

Use templates when the full entry type changes the page structure:

| Entry type  | Template owns                    |
| ----------- | -------------------------------- |
| normal page | section-composed page layout     |
| legal page  | legal title and rich text layout |
| news entry  | news article/detail layout       |

Templates decide whether an entry uses sections. Legal and news entries do not
use the section composer unless that content model is intentionally changed.

### Sections

Files under `app/src/Sections/` own reusable CMS blocks.

`SectionRouter` must dispatch section entry types to section components. It
should not become a visual layout component itself.

Reusable sections are authored in Craft under `Reusable Sections`. Add a
`Section Reference` block inside a page `sections` builder to render one of
those reusable entries on that page. The reference block can override only
section spacing; content stays owned by the reusable section.

Expected flow for normal pages:

```txt
route -> TemplateRouter -> PageTemplate -> SectionRouter -> Section component
```

Section components receive one section block and render that block only. Shared
UI primitives still belong in `app/src/Components/`.

## Images

Craft owns assets and image transforms.

Next renders images through:

```txt
app/src/Components/ImageCraft/index.tsx
```

`ImageCraft` reads the typed asset fragment and normalizes relative Craft asset
URLs with:

```txt
app/src/lib/craft/assets.ts
```

This is required because Craft GraphQL can return relative transform URLs, while
Next Image needs a valid upstream origin.

Image placeholders are automatic when Craft returns the placeholder transform.
The asset fragment requests a small transformed image URL:

```txt
blurDataUrl
```

`ImageCraft` passes that value to Next Image as `blurDataURL` and sets
`placeholder="blur"` when available.

Callers can override this per image:

```tsx
<ImageCraft image={image} placeholder='empty' />
```

## Forms

Craft owns form authoring through Freeform.

Next renders Freeform data through:

```txt
app/src/Components/Form/
```

Craft sections should pass the selected Freeform form fragment directly to the
shared component:

```tsx
import { Form } from '@/Components'

<Form data={section.form?.[0]} />
```

The server component normalizes the Freeform GraphQL shape before passing it to
the client renderer. The client renderer builds fields from Craft's form
definition and submits through:

```txt
app/src/app/api/forms/freeform/route.ts
```

The route forwards submissions to Craft GraphQL using the selected form's
`submissionMutationName`. It keeps the Craft GraphQL token server-side and does
not expose it to the browser.

Supported field rendering currently includes:

- text-like inputs
- email, number, password
- textarea
- select and multi-select
- checkbox, checkbox groups, and radio groups
- hidden fields
- Freeform HTML and rich text blocks

File fields are rendered, but non-empty file uploads are not submitted through
the current GraphQL route. Add explicit upload handling before relying on file
fields in production forms.

The submit button uses the shared `Button` component. Success and error
messages use generated color tokens from the style system.

Required Craft/GraphQL setup:

- Freeform plugin enabled
- form selected in the relevant Craft section
- GraphQL schema can query Freeform forms
- GraphQL schema can execute the Freeform submission mutation
- `CRAFT_GRAPHQL_ENDPOINT` and `CRAFT_GRAPHQL_TOKEN` are available to Next

## Metadata

Next metadata is generated through:

```txt
app/src/lib/craft/metadata.ts
```

The fallback order is:

1. entry SEO fields
2. entry Open Graph fields
3. entry image
4. SEO global defaults

The root layout uses global SEO metadata. Page, legal, and news routes use
entry-aware metadata.

The public `llms.txt` endpoint lives at:

```txt
/llms.txt
```

Next serves it from:

```txt
app/src/app/llms.txt/route.ts
```

Craft owns the editable text in the SEO global field:

```txt
llmsText
```

If `llmsText` is empty, the route falls back to a minimal Markdown document
using the SEO global site name and site description.

The 404 page is rendered by:

```txt
app/src/app/not-found.tsx
```

Craft owns its editable content in the Error Page global:

```txt
errorPage
```

The page uses `errorPageTitle`, `text`, and the first `links` item. If the
global is empty, the frontend falls back to a minimal hardcoded 404 message and
home link.

## Live Preview

Craft preview targets point to Next through environment values. The committed
section configuration uses:

```txt
$NEXT_PUBLIC_SITE_URL/api/preview?uri={uri}&secret=${CRAFT_PREVIEW_SECRET}
```

`CRAFT_PREVIEW_SECRET` is mandatory and must have the same value in Next and
Craft. Do not hardcode it in Project Config. Do not add `token={token}`:
`token` is not an entry property, and Craft automatically appends its temporary
token when preview context is required.

Preview and View flow:

1. Craft resolves the Next URL and shared secret from its environment.
2. The normal View action has no preview token. Next validates the shared
   secret, disables any existing Draft Mode session, and redirects to the
   published frontend route.
3. Preview creates and appends Craft's temporary token automatically.
4. Next validates the shared secret and enables Draft Mode.
5. Next stores the Craft preview token in an HTTP-only cookie and also forwards
   it as a query parameter fallback.
6. Next redirects to the frontend route.
7. Draft Mode requests with the cookie use the existing request-aware query
   wrapper.
8. Requests carrying the query fallback are internally rewritten to the
   dynamic `craft-preview` route without changing the browser URL.
9. Both paths use the uncached preview GraphQL client.

The query fallback is retained for cross-origin Craft preview frames where the
browser may restrict third-party cookies. Normal public routes never read that
query parameter and remain eligible for ISR.

Preview queries do not use cache tags or persistent caching. Request-scoped
React memoization shares the entry result between metadata and page rendering
during one server render; the next preview refresh still requests fresh Craft
content.

Preview exit route:

```txt
/api/preview/exit
```

## Cache Revalidation

Normal Craft GraphQL requests use Next cache tags.

Tags are attached at the query-wrapper layer, not inside components. The main
wrapper lives in:

```txt
app/src/lib/craft/client.ts
```

Query wrappers live under:

```txt
app/src/lib/craft/queries/
```

Examples:

| Wrapper         | Typical tags                                                                              |
| --------------- | ----------------------------------------------------------------------------------------- |
| `getEntryByUri` | `craft`, `craft:entry-uri:{uri}`, `craft:entry-links`, `craft:assets`, `craft:news`, `craft:section:reusablesections` |
| `getGlobals`    | `craft`, `craft:globals`, `craft:navigation`, `craft:entry-links`, `craft:assets` |
| `getNavigation` | `craft`, `craft:navigation`, `craft:entry-links` |
| `getNews`       | `craft`, `craft:news`, `craft:assets` |

The frontend receives revalidation calls at:

```txt
/api/revalidate
```

The endpoint accepts `POST` JSON:

```json
{
	"secret": "shared-secret",
	"tags": ["craft:entry-uri:about"]
}
```

It validates `REVALIDATE_SECRET`, normalizes tags, rejects empty payloads,
limits requests to 128 tags, and calls `revalidateTag(tag, { expire: 0 })` for each tag.
In development it logs accepted tags with `[revalidate]`.

### Cloudflare Cache Lifecycle

Published Craft pages use ISR. Cache updates are event-driven by Craft rather
than a short fixed refresh interval.

| Status  | Meaning                                                                 |
| ------- | ----------------------------------------------------------------------- |
| `MISS`  | This route variant is not cached yet; Next renders and stores it.       |
| `HIT`   | OpenNext serves the already generated response from cache.              |
| `STALE` | OpenNext can serve previous output while Next regenerates it.            |

The initial request for a page is normally a `MISS`; later requests for the
same cache key become `HIT`. HTML and React Server Component requests are
separate cache variants, so a browser can require several navigations before
all variants are warm. There is no fixed rule that the second or fourth request
must be a `HIT`.

When an editor publishes a Craft change:

1. Craft sends the affected tags to `/api/revalidate` after the surrounding
   database transaction commits.
2. `revalidateTag(tag, { expire: 0 })` expires matching published data immediately.
3. A subsequent request must fetch fresh affected data. The callback does not
   push updated content into an already open browser tab.

Use normal requests when testing cache behavior. Hard reloads, disabled browser
caching, and `no-cache` headers do not demonstrate the normal Worker cache path.
Production-mode Next tests cover targeted data invalidation; deployed Worker
HTML/RSC propagation still needs separate validation.

The Craft module lives under:

```txt
craft/modules/headless/
```

It captures before state for element save/delete/restore events, skips drafts
and revisions, computes deterministic cache tags, and posts them to Next.
Events inside an outer transaction accumulate tags until commit; rollback
discards that pending dispatch. This buffer is not a persistent delivery queue.

Craft and Next read the same shared revalidation value:

```txt
REVALIDATE_SECRET
```

Craft sends requests to:

```txt
CRAFT_REVALIDATE_URL
```

For Cyon, revalidation is inactive when `CRAFT_REVALIDATE_URL` or
`REVALIDATE_SECRET` is empty. Local DDEV does not use the hosted callback:
`bun dev:craft` generates
`http://host.docker.internal:<DEV_PORT>/api/revalidate`.

When Next runs locally against hosted Cyon content, Cyon needs a public tunnel
to the local Next port. Set `CRAFT_REVALIDATE_URL` temporarily to the tunnel's
`/api/revalidate` URL and run `bun craft:push:env`. Production uses the stable
Worker `/api/revalidate` URL instead.

Ordinary body edits use URI tags. Shared dependencies retain conservative family
invalidation rather than building a reverse relationship index:

| Element change        | Tags emitted                                                                       |
| --------------------- | ---------------------------------------------------------------------------------- |
| page body             | `craft:entry-uri:{uri}` |
| entry identity/visibility/title change | old/new URI tags and `craft:entry-links` |
| news entry            | URI tags and `craft:news` |
| reusable section      | `craft:section:reusablesections` |
| navigation entry      | `craft:navigation` (also covers embedded footer navigation) |
| nested entry          | containing Entry/GlobalSet tags, including old/new owners |
| global set            | `craft:globals` |
| asset                 | `craft:assets` |
| multi-site, unknown ownership/section/state, or tag overflow | `craft` fallback |

Both Craft and Next normalize tags to lowercase URL-safe strings and cap the
payload at 128 tags. The builder uses the full `craft` fallback instead of
truncating required tags. Every query retains `craft` for manual full invalidation.

Temporary HTTP/connection failures receive at most one retry. Both attempts and
backoff share a two-second budget per dispatch: an initial 1.2-second request,
then a 100 ms delay and a request limited to the remaining time. A valid
`Retry-After` is honored only when it fits that budget. Authentication errors and
permanent configuration/TLS errors are not retried. Exhaustion logs one sanitized
warning and does not fail the Craft save. Longer outages still need a later
publish or manual invalidation; there is no durable retry queue.

After changing `DEV_PORT`, stop Next, run `bun run dev:craft` to regenerate the
DDEV callback and restart its containers, then run `bun run dev`. Retrying cannot
correct a stale port or mismatched secret.

Preview queries do not use this cache path. Preview rendering uses the preview
GraphQL client and `no-store`.

There are two separate cache layers:

- GraphQL Data Cache: the `cache hit` and `cache skip` messages printed by
  Next fetch logging
- full-route/CDN cache: the rendered HTML and RSC response stored by
  Next/OpenNext ISR

A GraphQL `cache hit` does not prove that the complete page response is cached.
Local development can verify the GraphQL path but cannot produce a meaningful
deployed Worker cache behavior.

Draft Mode and explicit preview-token requests stay private and bypass the
published-page cache. A successful callback alone is not evidence that all
regional Worker response variants have refreshed.

Focused validation (using the disposable fixture setup documented in the
[editorial plugin README](craft/plugins/ubiq-editorial-permissions/README.md)):

```sh
UBIQ_EDITORIAL_TEST_ROOT=/tmp/your-disposable-fixture php craft/modules/headless/tests/cache.php
UBIQ_EDITORIAL_TEST_ROOT=/tmp/your-disposable-fixture php craft/modules/headless/tests/retry-http.php
bun run build
bun app/scripts/check-cache-revalidation.ts
```

The last command starts a temporary production Next server and loopback GraphQL
stub with synthetic credentials. It checks affected/unrelated cache reuse,
shared dependencies, authentication, and full invalidation without editing Craft.

The Cyon endpoint used by this starter returns `415 Unsupported Media Type`
when different full GraphQL POST requests reach it concurrently. Next therefore
uses one static-generation worker, and `app/src/lib/craft/client.ts` serializes
published and preview GraphQL transport through one Node process-wide queue. The
query wrappers, cache tags, and preview `no-store` policy remain unchanged.

Do not introduce Redis, SQLite, or a custom dependency graph without production
evidence that the current tag granularity is too broad.

## Navigation

Navigation is content, not a hardcoded frontend list.

Craft stores named navigations in the `navigations` section.

Next queries a navigation by handle through:

```txt
app/src/queries/navigation.ts
```

Each navigation item can target an internal page or an external URL and can
contain child navigation items. `maxDepth` limits rendering to one through four
levels; it does not generate links or nesting. The default main navigation
handle is expected to be:

```txt
main
```

## Frontend Organization

Frontend code is split by responsibility, not by route first.

| Path                  | Owns                       | Put here                                                                                  |
| --------------------- | -------------------------- | ----------------------------------------------------------------------------------------- |
| `app/src/app/`        | Next App Router            | route files, API routes, metadata entry points                                            |
| `app/src/animations/` | animation implementation   | centralized GSAP config, animation registries, reusable animation effects                 |
| `app/src/Components/` | reusable UI primitives     | buttons, images, wrappers, layout utilities, modals, sidebars                             |
| `app/src/Sections/`   | CMS-rendered page sections | section components mapped from Craft Matrix section entry types                           |
| `app/src/Templates/`  | entry-type layouts         | page, legal page, and news detail templates                                               |
| `app/src/lib/craft/`  | Craft integration          | GraphQL client, preview client, metadata helpers, asset URL normalization, query wrappers |
| `app/src/queries/`    | GraphQL documents          | queries and fragments consumed by `gql.tada`                                              |
| `app/src/hooks/`      | reusable React hooks       | client-side behavior hooks that are not tied to one component                             |
| `app/src/store/`      | shared client state        | Zustand stores and other client state containers                                          |
| `app/src/styles/`     | global styling             | generated tokens, reset, theme layers, global Sass layers                                 |
| `app/config.ts`       | frontend runtime config    | generated token exports, animation defaults, media queries, Lenis options, theme defaults |

Rules:

- `app/src/app/` should stay thin. It resolves params, preview state, metadata, and
  hands entries to templates.
- `app/src/Templates/` decides which page-level layout an entry type uses.
- `app/src/Sections/` decides how a Craft section block renders.
- `app/src/Components/` must not know Craft entry types unless the component is
  explicitly a Craft adapter, like `ImageCraft`.
- `app/src/lib/craft/queries/` owns cache tags. Do not spread cache tag decisions
  through templates or components.

## Frontend Config

Shared frontend config is centralized in:

```txt
app/config.ts
```

It imports generated style values from:

```txt
app/src/styles/vars.generated.ts
```

Current config surfaces:

| Key           | Purpose                                                             |
| ------------- | ------------------------------------------------------------------- |
| `animation`   | shared durations and easing labels for GSAP or other animation code |
| `space`       | generated spacing tokens for TypeScript use                         |
| `colors`      | generated theme color tokens and shade values                       |
| `breakpoints` | generated breakpoint values                                         |
| `context`     | reusable media queries such as desktop, mobile, and reduced motion  |
| `lenis`       | global Lenis options                                                |
| `theme`       | theme enable flag and default theme                                 |

Do not duplicate breakpoint strings, animation durations, or theme color values
inside components. Import `config` or the generated vars instead.

## Style Token Generation

Style tokens are authored in TypeScript and compiled to Sass.

Source of truth:

```txt
app/src/styles/vars.ts
```

Generator:

```txt
app/scripts/generate-vars.ts
```

Helper functions for units, themes, responsive values, colors, maps, and utility
classes live under:

```txt
app/src/lib/styles/
```

Run the generator with:

```sh
bun css
```

The command generates:

| File                                      | Purpose                                                                |
| ----------------------------------------- | ---------------------------------------------------------------------- |
| `app/src/styles/maps.generated.scss`      | Sass maps for compile-time use, including breakpoints and token maps   |
| `app/src/styles/root.generated.scss`      | `:root` and `[data-theme]` CSS custom properties                       |
| `app/src/styles/vars.generated.scss`      | Sass aliases that point to generated CSS variables                     |
| `app/src/styles/utilities.generated.scss` | generated utility classes from `createUtility(...)` declarations       |
| `app/src/styles/vars.generated.ts`        | TypeScript token export consumed by `app/config.ts` and animation code |

Do not edit generated files manually. Change `app/src/styles/vars.ts`, then run:

```sh
bun css
```

The current responsive model is desktop-down:

```ts
export const breakpoints = defineBreakpoints({
	mobile: px(768)
})

const responsiveBase = 'desktop'
```

That means desktop values are emitted at `:root`, and mobile overrides are
emitted under `max-width: 767px`.

Example token:

```ts
const spacings = {
	global: responsive({
		desktop: rem(4),
		mobile: rem(1.25)
	})
} as const
```

Generated usage:

```scss
padding-left: $spacing-global;
padding-right: $spacing-global;
```

Utility classes are opt-in from `vars.ts` through `createUtility(...)`. If a
token group should not produce utility classes, do not pass it to
`createUtility`.

## Theme System

Theme tokens are authored in the same TypeScript token source:

```txt
app/src/styles/vars.ts
```

Themes are declared with `defineThemes(...)`:

```ts
export const themes = defineThemes({
	light: {
		default: true
	},
	dark: {}
})
```

Theme-aware tokens use `createThemed(...)`:

```ts
const themed = createThemed(themes, 'light', {
	alpha: true,
	palette: true
})

const colors = {
	primary: themed({
		light: hex('#f7f7f2'),
		dark: hex('#080f11')
	})
}
```

Run the generator after changing themes or theme colors:

```sh
bun css
```

The generator writes theme values into:

```txt
app/src/styles/root.generated.scss
app/src/styles/vars.generated.scss
app/src/styles/vars.generated.ts
```

CSS custom properties are emitted for `:root`, the default theme, and every
explicit theme selector:

```scss
:root,
[data-theme='light'] {
	--color-primary: rgb(...);
}

[data-theme='dark'] {
	--color-primary: rgb(...);
}
```

Each themed color always emits its base token:

```scss
--color-accent: rgb(...);
```

When `palette: true`, the generator also emits explicit white and black palette
ramps:

```scss
--color-accent-w-80: rgb(...); // accent mixed toward white
--color-accent-b-80: rgb(...); // accent mixed toward black
```

When `alpha: true`, it emits alpha ramps:

```scss
--color-accent-alpha-80: rgba(..., 0.8);
```

Set either option to `false` when a token should only generate the base color.

Sass should use generated aliases:

```scss
color: $color-secondary;
background-color: $color-primary;
border-color: $color-secondary-w-20;
```

TypeScript and GSAP should use `config`:

```ts
import { config } from '$/config'

config.colors.themes.light.primary
config.colors.themes.dark.accentW80
config.colors.themes.dark.accentB80
config.colors.themes.dark.accentAlpha80
```

When an animation must follow the active runtime theme, use CSS variable helpers
for non-interpolated values:

```ts
import { colorVar } from '@/lib/styles'

gsap.to(element, {
	backgroundColor: colorVar('accentW60')
})
```

`colorVar(...)` is typed from generated color tokens, so names autocomplete and
map to runtime CSS variables such as `var(--color-accent-w-60)`.

For GSAP color tweens that must interpolate smoothly when the theme changes,
use active theme values instead:

```ts
import { useThemeColors } from '@/hooks'

const { theme, colors } = useThemeColors()

gsap.to(element, {
	backgroundColor: colors.accentW60
})
```

Include `theme` in the hook dependencies for theme-reactive animations.

Runtime theme state lives in:

```txt
app/src/store/theme.ts
```

It is persisted with Zustand and starts from:

```ts
config.theme.default
```

`Layout` applies the active theme to the document body:

```tsx
<body data-theme={theme}>
```

The theme animation hook lives in:

```txt
app/src/hooks/use-theme.ts
```

It reads the active theme from the store and animates generated color CSS
variables on `document.body`. GSAP is imported only through `@/gsap`.

The switch component lives in:

```txt
app/src/Components/SwitchTheme/
```

It calls `useThemeStore(...).switchTheme` and is rendered only when:

```ts
config.theme.enabled
```

Rules:

- define themes and colors in `app/src/styles/vars.ts`
- run `bun css` after token changes
- do not hardcode theme colors in components
- do not edit generated theme files manually
- use `$color-*` in Sass and `config.colors` in TypeScript
- use `colorVar(...)` for non-interpolated runtime theme CSS variable references
- use `useThemeColors()` for GSAP color tweens that must animate smoothly across
  theme changes
- use `SwitchTheme` or `useThemeStore` actions to change theme state

## Global Cursor

The global cursor is controlled by:

```ts
cursor: {
	enabled: true
}
```

When disabled:

- `<Cursor />` is not rendered
- cursor hooks return no-op handlers
- buttons and links do not update cursor state
- no cursor GSAP animation or pointer listener runs

Cursor state lives in:

```txt
app/src/store/cursor.ts
```

The store is state-only. It does not import GSAP, touch the DOM, use timers, or
know about routing.

Interaction components use:

```txt
app/src/hooks/use-cursor-interaction.ts
```

Example:

```tsx
const cursorHandlers = useCursorInteraction({ variant: 'hover' })

<button {...cursorHandlers}>Open</button>
```

The reusable `Button`, `TransitionLink`, and `SwitchTheme` components already
wire this hook for the standard hover/active cursor states. Future interactive
components should use the same hook instead of animating the cursor directly.

The cursor renderer lives in:

```txt
app/src/Components/Cursor/
```

Only `Cursor` owns cursor animation. It uses refs, one global pointer listener,
and GSAP setters so pointer movement does not cause React re-renders.

Route changes reset cursor state from `Layout`, preventing stuck hover or active
states after navigation.

## Preload Runtime

The preload overlay is controlled by:

```ts
preload: {
	enabled: true
}
```

When disabled, `<Preload />` is not rendered from `Layout`.

Preload state lives in:

```txt
app/src/store/preload.ts
```

The store tracks:

```ts
type PreloadStatus = 'idle' | 'running' | 'done'
```

Completion is persisted in `sessionStorage`. This means preload runs once per
browser tab session, does not replay on client navigation, and does not replay
on refresh in the same tab.

Selector hooks live in:

```txt
app/src/hooks/use-preload.ts
```

Use them to sync page, hero, or section animations with preload completion:

```ts
const isPreloadDone = usePreloadDone()
const isPreloadRunning = usePreloadIs('running')
const status = usePreloadStatus()
```

`Preload` owns the GSAP fade timeline. Timelines must stay in refs so they can
be killed cleanly on component cleanup.

## Cookie Management

The cookie banner is controlled by:

```ts
cookies: {
	enabled: true
}
```

When disabled, `<CookiesBanner />` is not rendered from the root layout and no
cookie-banner client logic runs.

Cookie banner content is authored in Craft, not hardcoded in the frontend.

Craft owns the cookie copy and links through the `legal` global set:

| Craft field           | Frontend use                      |
| --------------------- | --------------------------------- |
| `cookieTitle`         | banner title                      |
| `richText`            | banner body HTML                  |
| `cookieDeclineLabel`  | decline button label              |
| `cookieAcceptLabel`   | accept button label               |
| `cookieConsentLabel`  | accept fallback label             |
| `cookieRetentionDays` | consent expiration in days        |
| `links`               | legal/privacy links in the banner |

Next reads this data through:

```txt
app/src/queries/globals.ts
app/src/Components/CookiesBanner/index.tsx
```

The server component normalizes Craft link values before passing them to the
client:

- internal Craft entries render through `TransitionLink`
- external links render as normal anchors
- Craft target values `self` and `blank` normalize to `_self` and `_blank`
- Craft URI `home` normalizes to `/`

Client consent state lives in:

```txt
app/src/store/cookie-consent.ts
```

The store is persisted into a browser cookie named:

```txt
ubiq-cookie-consent
```

State shape:

```ts
status: 'pending' | 'accepted' | 'declined'
expiresAt: number | null
updatedAt: number | null
```

Actions:

```ts
accept(retentionDays?: number | null)
decline(retentionDays?: number | null)
reset()
```

Read consent state from any client component:

```tsx
import {
	isCookieConsentExpired,
	useCookieConsentStore
} from '@/store/cookie-consent'

const status = useCookieConsentStore((state) => state.status)
const expiresAt = useCookieConsentStore((state) => state.expiresAt)
const accept = useCookieConsentStore((state) => state.accept)
const decline = useCookieConsentStore((state) => state.decline)
const reset = useCookieConsentStore((state) => state.reset)

const expired = isCookieConsentExpired(expiresAt)
```

Banner visibility is derived from store state:

- `pending` shows the banner
- `accepted` hides the banner
- `declined` hides the banner
- expired consent resets back to `pending`

The banner waits for persisted store hydration before showing, preventing a
brief flash for users who already accepted or declined.

## Slider Component

Reusable sliders should use Embla through the shared component:

```txt
app/src/Components/Slider/
```

The component follows the Embla structure:

```txt
viewport -> container -> slides
```

The viewport owns overflow clipping. The container uses Embla's standard flex
model, and each generated slide wrapper owns its own computed size:

```scss
.viewport {
	overflow: hidden;
}

.container {
	display: flex;
}

.slide {
	flex: 0 0 var(--slider-slide-size);
}
```

Embla measures the rendered slide sizes. It does not decide how wide a slide
should be. Use CSS and component props for sizing.

Example:

```tsx
import { Slider } from '@/Components'

export const Cards = () => {
	return (
		<Slider slideSize='24rem' gap='1rem' options={{ loop: false }}>
			<article>One</article>
			<article>Two</article>
			<article>Three</article>
		</Slider>
	)
}
```

### Sizing Modes

Use `slideSize` when each slide should have a fixed or responsive card width
and wider wrappers should reveal more slides:

```tsx
<Slider gap='4rem' slideSize='clamp(18rem, 22vw, 28rem)'>
	{items}
</Slider>
```

This is the right mode for a `Wrapper fluid='right'` or `Wrapper fluid='left'`
layout when the design should start on the normal grid and reveal more cards
toward the viewport edge on large screens.

Use `slidesPerView` when the design must always fit an exact number of slides
inside the current slider width:

```tsx
<Slider gap='2rem' slidesPerView={4}>
	{items}
</Slider>
```

This mode accounts for gaps. Four slides means four slides fit inside the
slider viewport, including the three gaps between them. On larger screens the
slides become wider; the slider does not reveal more than four at a time.

If both `slideSize` and `slidesPerView` are passed, `slidesPerView` wins.

### Gaps

The slider uses Embla's padding-gap pattern:

- the container has a negative left margin
- each slide has matching left padding

This keeps slide sizing predictable and lets Embla measure real slide widths.
Set the gap through the `gap` prop:

```tsx
<Slider gap='var(--space-md)' slideSize='24rem'>
	{items}
</Slider>
```

### Custom Styling

Use `className`, `slideClassName`, and `classes` for section-specific styling.
Do not fork the slider for one section.

```tsx
<Slider
	className={$.slider}
	slideClassName={$.slide}
	classes={{
		viewport: $.viewport,
		container: $.container,
		controls: $.controls,
		control: $.control,
		dots: $.dots,
		dot: $.dot,
		dotActive: $.dotActive,
		progress: $.progress,
		progressBar: $.progressBar
	}}
	gap='2rem'
	slideSize='24rem'>
	{items}
</Slider>
```

Use `style` only for dynamic values that cannot live in SCSS:

```tsx
<Slider style={{ '--slider-gap': '2rem' }} slideSize='24rem'>
	{items}
</Slider>
```

### Controls, Dots, And Progress

The default slider UI supports opt-in controls, dots, and progress:

```tsx
<Slider controls dots progress slideSize='24rem'>
	{items}
</Slider>
```

Defaults:

- `controls` renders previous/next icon buttons when passed
- `dots` renders one button per Embla snap when passed
- `progress` renders a horizontal scroll-progress bar when passed

The defaults are intentionally minimal. Section-specific visuals should be
styled with `classes` or replaced with render props.

### Custom Renderers

`Slider` owns the Embla instance and exposes a render context to custom UI.
Use render props when a section needs custom arrows, dots, progress, counters,
or a completely custom controls layout while keeping one slider declaration.

```tsx
<Slider
	gap='2rem'
	slideSize='24rem'
	renderPrevious={(slider) => (
		<ButtonIcon
			aria-label='Previous'
			disabled={!slider.canScrollPrev}
			onClick={slider.scrollPrev}>
			<IconLeft />
		</ButtonIcon>
	)}
	renderNext={(slider) => (
		<ButtonIcon
			aria-label='Next'
			disabled={!slider.canScrollNext}
			onClick={slider.scrollNext}>
			<IconRight />
		</ButtonIcon>
	)}
	renderDots={(slider) => (
		<div className={$.dots}>
			{slider.scrollSnaps.map((_, index) => (
				<button
					aria-current={index === slider.selectedIndex ? 'true' : undefined}
					key={index}
					onClick={() => slider.scrollTo(index)}
					type='button'
				/>
			))}
		</div>
	)}
	renderProgress={(slider) => (
		<div className={$.progress}>
			<div
				className={$.progressBar}
				style={{ transform: `scaleX(${slider.progress})` }}
			/>
		</div>
	)}>
	{items}
</Slider>
```

The render context exposes:

| Field           | Purpose                                    |
| --------------- | ------------------------------------------ |
| `emblaApi`      | raw Embla API instance                     |
| `canScrollPrev` | whether previous navigation is available  |
| `canScrollNext` | whether next navigation is available      |
| `selectedIndex` | active snap index                          |
| `scrollSnaps`   | Embla snap list                            |
| `progress`      | normalized scroll progress from `0` to `1` |
| `scrollPrev`    | previous snap callback                     |
| `scrollNext`    | next snap callback                         |
| `scrollTo`      | snap index callback                        |

Use `renderControls` only when the entire controls layout should be replaced:

```tsx
<Slider
	renderControls={(slider) => (
		<div className={$.customControls}>
			<button onClick={slider.scrollPrev}>Previous</button>
			<span>
				{slider.selectedIndex + 1} / {slider.scrollSnaps.length}
			</span>
			<button onClick={slider.scrollNext}>Next</button>
		</div>
	)}>
	{items}
</Slider>
```

Props:

| Prop             | Purpose                                                       |
| ---------------- | ------------------------------------------------------------- |
| `options`        | forwarded to `useEmblaCarousel(...)`                          |
| `controls`       | toggles previous/next controls                                |
| `dots`           | toggles scroll snap dots                                      |
| `progress`       | toggles default scroll-progress bar                           |
| `slideSize`      | fixed/responsive slide size; reveals more slides when wider   |
| `slidesPerView`  | exact visible slide count; slides resize to fit current width |
| `gap`            | sets `--slider-gap`                                           |
| `className`      | adds a class to the root slider element                       |
| `slideClassName` | adds a class to each generated slide wrapper                  |
| `classes`        | adds classes to internal slots                                |
| `style`          | adds root inline style and CSS custom properties              |
| `renderPrevious` | overrides previous control                                    |
| `renderNext`     | overrides next control                                        |
| `renderDots`     | overrides dots                                                |
| `renderProgress` | overrides progress                                            |
| `renderControls` | overrides the entire controls layout                          |

Rules:

- keep Embla setup inside the `Slider` component
- pass normal JSX children as slides
- use `slideSize` for fixed card width / reveal-more layouts
- use `slidesPerView` for exact count layouts
- use `options` only for Embla behavior, not visual styling
- keep section-specific card styling outside the slider component
- for fluid wrappers, choose `slideSize` when bigger screens should reveal more
  slides
- use render props for custom UI, not separate Embla instances

## Animation Imports

GSAP is centralized in:

```txt
app/src/animations/gsap.config.ts
```

The alias is:

```txt
@/gsap
```

All project animation code must import GSAP through that alias:

```ts
import { gsap } from '@/gsap'
```

Do not import directly from `gsap` inside animation implementations,
components, or hooks. The centralized file owns GSAP config, plugin exports,
and future animation defaults.

Animation hooks live in:

```txt
app/src/hooks/use-gsap.ts
app/src/hooks/use-gsap-mm.ts
```

Use `useGSAP` for component-scoped animations:

```tsx
'use client'

import { gsap } from '@/gsap'
import { useGSAP } from '@/hooks'
import { useRef } from 'react'

export const Example = () => {
	const scope = useRef<HTMLDivElement | null>(null)

	useGSAP(
		() => {
			gsap.from('[data-el="title"]', {
				y: 24,
				autoAlpha: 0,
				duration: 0.6,
				ease: 'power2.out'
			})
		},
		{ scope }
	)

	return (
		<div ref={scope}>
			<h2 data-el='title'>Title</h2>
		</div>
	)
}
```

Use `useGsapMatchMedia` when an animation should only exist inside a media
query. Passing a single query string does not require the callback context:

```tsx
import { config } from '$/config'
import { gsap } from '@/gsap'
import { useGsapMatchMedia } from '@/hooks'
import { useRef } from 'react'

export const Example = () => {
	const scope = useRef<HTMLDivElement | null>(null)
	const tl = useRef<GSAPTimeline | null>(null)

	useGsapMatchMedia(
		config.context.isDesktop,
		() => {
			tl.current = gsap.timeline({
				paused: true,
				defaults: {
					duration: config.animation.default,
					ease: config.animation.ease.out
				}
			})

			tl.current.to('[data-el="arrow"]', { xPercent: 100 })
		},
		{ scope }
	)

	return (
		<div ref={scope}>
			<span data-el='arrow'>Arrow</span>
		</div>
	)
}
```

The callback context is optional. Only read `context.conditions` when passing
named conditions as an object:

```tsx
useGsapMatchMedia(
	config.context,
	(context) => {
		if (context.conditions?.reduceMotion) return

		gsap.to('[data-el="image"]', {
			scale: context.conditions?.isDesktop ? 1.08 : 1,
			duration: config.animation.short
		})
	},
	{ scope }
)
```

Use page transitions for route-level leave/enter effects. Use `useGSAP` and
`useGsapMatchMedia` for component, section, and in-page animation.

## Element Animations

Use `Anim.*` for declarative element-level scroll animations:

```tsx
import { Anim } from '@/Components'

export const Example = () => {
	return (
		<Anim.section type='fade-up'>
			<h2>Animated section</h2>
		</Anim.section>
	)
}
```

The public API keeps native HTML semantics:

```tsx
<Anim.div type='fade'>Content</Anim.div>
<Anim.a href='/privacy' type='fade'>Privacy</Anim.a>
<Anim.button type='fade-up' buttonType='button'>Action</Anim.button>
```

The `type` prop selects an animation preset. In v1 the available presets are:

```txt
fade
fade-up
```

Animation presets live in:

```txt
app/src/animations/elements/
```

Rules:

- one file per animation preset
- no `Base` wrapper abstraction
- keep GSAP and ScrollTrigger imports behind `@/gsap`
- use `Anim.*` for regular element animations
- use page transitions only for route-level leave/enter effects

Every animation accepts GSAP and ScrollTrigger overrides:

```tsx
<Anim.div
	type='fade-up'
	fromVars={{ y: '4rem' }}
	vars={{ duration: 0.8 }}
	scrollTrigger={{ start: 'top 85%' }}>
	Content
</Anim.div>
```

Media overrides are inferred from `config.context`, so adding a new media query
there automatically makes it available in `media`:

```tsx
<Anim.div
	type='fade-up'
	media={{
		isDesktop: {
			fromVars: { y: '5rem' },
			vars: { duration: 1 }
		},
		isMobile: {
			fromVars: { y: '2rem' },
			vars: { duration: 0.45 }
		}
	}}>
	Content
</Anim.div>
```

Reduced motion is handled through `config.context.reduceMotion`. When active,
v1 presets set the final visible state immediately instead of animating motion.

## Parallax Component

Use `Parallax.*` for scroll-linked transform effects.

`Parallax` is separate from `Anim`:

- `Anim.*` is for reveal and entrance animations
- `Parallax.*` is for continuous scroll-linked movement, scale, or similar
  transform effects

The component follows the same server-safe rendering pattern as `Anim`: the
real HTML element renders on the server, and a small client runtime attaches
GSAP and ScrollTrigger.

```tsx
import { Parallax } from '@/Components'

<Parallax.div speed={0.2}>
	Content
</Parallax.div>
```

Use dot components for native HTML semantics:

```tsx
<Parallax.figure
	fromVars={{ yPercent: -10, scale: 1.08 }}
	vars={{ yPercent: 10, scale: 1 }}>
	<ImageCraft image={image} />
</Parallax.figure>

<Parallax.a href='/about' speed={0.15}>
	About
</Parallax.a>
```

Use the base component when the tag should be selected with `as`:

```tsx
<Parallax as='section' speed={0.12}>
	Section content
</Parallax>
```

Default behavior is vertical parallax. `speed` controls the generated
`yPercent` distance. Pass `axis='x'` for horizontal parallax.

Every parallax instance accepts GSAP and ScrollTrigger overrides:

```tsx
<Parallax.div
	speed={0.12}
	fromVars={{ yPercent: -6, scale: 1.12 }}
	vars={{ yPercent: 6, scale: 1.04 }}
	scrollTrigger={{
		start: 'top bottom',
		end: 'bottom top',
		scrub: true
	}}>
	<ImageCraft image={image} />
</Parallax.div>
```

Media overrides use the same `config.context` keys as element animations:

```tsx
<Parallax.div
	media={{
		isDesktop: {
			fromVars: { yPercent: -8, scale: 1.12 },
			vars: { yPercent: 8, scale: 1.04 }
		},
		isMobile: {
			fromVars: { yPercent: -3, scale: 1.06 },
			vars: { yPercent: 3, scale: 1.02 }
		}
	}}>
	Content
</Parallax.div>
```

Reduced motion is handled through `config.context.reduceMotion`. When active,
`Parallax` sets a final non-motion state and clears transform movement.

## Route Lifecycle

Route lifecycle state is separated from animation logic.

The lifecycle store lives in:

```txt
app/src/store/page-lifecycle.ts
```

It stores serializable state only:

```txt
idle -> leaving -> navigating -> entering -> idle
```

The route observer is called once from `Layout` through:

```txt
app/src/hooks/use-page-lifecycle.ts
```

Controlled navigation is exposed through:

```txt
app/src/hooks/use-page-transition.ts
app/src/Components/TransitionLink/
```

`TransitionLink` and internal `Button` links use the transition hook so the
lifecycle can start before `router.push(...)`. The lifecycle store does not
import GSAP. Animation presets belong in the hook or transition-runner layer.

## Page Transitions

Page transitions are named animation presets layered on top of the route
lifecycle.

Transition code lives in:

```txt
app/src/animations/transitions/
```

The public registry lives in:

```txt
app/src/animations/transitions/registry.ts
```

Current transitions:

| Name   | Behavior             | Target                           |
| ------ | -------------------- | -------------------------------- |
| `none` | no animation         | none                             |
| `fade` | fades content out/in | `[data-page-transition-content]` |

Omitting `transition` is the same as `transition="none"`:

```tsx
<TransitionLink href='/about'>About</TransitionLink>
```

Use a named transition when the navigation should animate:

```tsx
<TransitionLink href="/about" transition="fade">
  About
</TransitionLink>

<Button href="/contact" transition="fade">
  Contact
</Button>
```

The route flow is:

```txt
click -> leaving -> leave animation -> navigating -> entering -> enter animation -> idle
```

The layout exposes two transition targets:

```tsx
<div className='page-wrapper' data-page-transition-root>
	<Header />
	<main data-page-transition-content>{children}</main>
</div>
```

`data-page-transition-root` is the fallback target. Individual transitions may
override it with `rootSelector`. The current `fade` transition targets only
`data-page-transition-content`, so persistent chrome such as the header stays
visible.

Transition definitions use this shape:

```ts
export type PageTransition = {
	rootSelector?: string
	leave?: (context: PageTransitionContext) => Promise<void> | void
	enter?: (context: PageTransitionContext) => Promise<void> | void
}
```

To add a transition:

1. Create a file under `app/src/animations/transitions/`.
2. Import GSAP only from `@/gsap`.
3. Return safely when `context.root` is `null` or `context.signal.aborted`.
4. Register the transition in `registry.ts`.

Transition names are inferred from the registry, so `transition=""` autocomplete
comes from `PageTransitionName`.

Page or section animations that need lifecycle state can subscribe through:

```txt
app/src/hooks/use-page-lifecycle-effect.ts
```

## Starter Database And Content

`craft/_backup-db/db.sql` is the tracked canonical database. On an uninstalled
DDEV project, `bun bootstrap` imports that database, applies tracked Craft
project config, creates or reuses the local GraphQL token, and regenerates
frontend GraphQL artifacts.

`bun dev:db:backup` creates an ignored timestamped development snapshot and
replaces the tracked `db.sql` with the same contents. `bun craft:push` uses the
newest timestamped snapshot, or `db.sql` when no timestamped snapshot exists.

The baseline content proves the content model, routing, GraphQL shape, preview,
metadata, footer/legal globals, and navigation. Normal content changes belong
in Craft. There is no model-reset or seed-reset command.

## Local URLs

When DDEV uses the generated project name:

```txt
Craft site:  http://<project-name>.ddev.site
Craft admin: http://<project-name>.ddev.site/admin
GraphQL:     http://<project-name>.ddev.site/gql/api
Next site:   http://localhost:<DEV_PORT>
Next admin:  http://localhost:<DEV_PORT>/admin
```

The dev script prints the current Craft URLs from `craft/.ddev/config.yaml`.
`bun env:create` keeps that DDEV name aligned with `.env`. `DEV_PORT` defaults
to `3000`. The Next admin URL redirects to the Craft Admin origin configured
through `CRAFT_GRAPHQL_ENDPOINT`.

## Commit Hooks

Husky is installed.

The prepare-commit hook prefixes commit messages with the next commit number:

```txt
[n] type: subject
```

The pre-commit hook runs:

```txt
bun verify
```

The pre-push hook runs:

```txt
bun run build
```

The build checks committed GraphQL artifacts without regenerating them. Static
generation still requires the Craft GraphQL endpoint and token in `.env` to be
valid and reachable. An HTTPS endpoint must also present a trusted certificate;
never bypass this with `NODE_TLS_REJECT_UNAUTHORIZED=0`.

The commit message hook uses Commitlint with this starter's relaxed limits.

## What Not To Infer

Do not infer that every Craft field is exposed to GraphQL automatically. The
GraphQL schema must allow the content being queried.

Do not infer that preview and normal rendering share the same cache path.

Do not infer that a section component is visually complete because its Craft
model exists.

Do not infer that footer, SEO, legal, or navigation content is optional for a
complete site. They are part of the base contract.

Do not infer that every top-level Craft asset directory is synchronized
automatically. `craft:push` and `craft:pull` currently manage only `uploads`,
`Dummy`, and `SEO`.

## Current Validation Surface

For a normal local check, run:

```sh
bun run lint
bun run build
```

`bun run build` includes CSS generation and checks queries against the committed
GraphQL schema. Run `bun gql` explicitly when schema-derived artifacts need to
be refreshed.

The successful build route table must classify:

```txt
/                                  Static
/news                              Static
/[...slug]                         SSG
/news/[slug]                       SSG
/craft-preview/[[...slug]]         Dynamic
```

Local preview validation must confirm that published requests use the tagged
cache path, preview requests use `no-store`, and the visible URL never exposes
the internal `craft-preview` prefix.

After deploying the Worker, test the same normal route at least twice without
Draft Mode or `cache-control: no-cache`. Record the response headers and
rendered content. Then verify that
a Craft preview remains private/no-store and that a published Craft change
progresses through revalidation to a fresh cached response.

For Craft model changes, additionally run:

```sh
cd craft
ddev exec php craft project-config/apply --dry-run
```

Only claim a command works after running it in the current environment.
