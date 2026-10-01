# UBIQ Next Agent Contract

Status: active  
Scope: repository root

UBIQ Next is a Craft CMS and Next.js starter. It is not a scratch project.
Changes must preserve the Craft authoring model, GraphQL boundary, Next App
Router behavior, generated style-token system, deployment scripts, and existing
component conventions.

## Non-Negotiable Rules

```txt
1. Read target files before editing.
2. Keep code minimal, explicit, and production-quality.
3. Do not duplicate logic when an existing helper, hook, component, or script owns it.
4. Do not invent abstractions unless they remove real repeated complexity.
5. Do not change Craft project config without a content-model reason.
6. Do not edit generated files manually.
7. Do not commit secrets, licenses, database dumps, local env values, uploads, or runtime artifacts.
8. Do not revert user changes without explicit permission.
9. Do not claim a build, lint, deploy, cache path, preview path, or GraphQL path works without run evidence.
10. If validation fails, report the failure exactly.
11. Use centralized project APIs: GSAP through @/gsap, Craft data through query wrappers, style tokens through generated vars.
12. Keep frontend controls, animation, state, and CMS data responsibilities separated.
13. Preserve server rendering unless client behavior is required.
14. Preserve the release and deployment safety gates.
15. Keep documentation factual and concise.
```

## Evidence Discipline

For non-trivial claims, state the evidence type:

- Code-read evidence: file path and observed behavior.
- Run evidence: command and result.
- Craft evidence: section, field, entry type, global, schema, or control-panel behavior.
- Browser evidence: route, viewport, and observed UI.
- External-doc evidence: source and date-sensitive claim.
- Hypothesis: state what is not proved yet.

Never say something is working unless the relevant command or browser check was
actually run.

## Repository Shape

Primary surfaces:

```txt
craft/                  Craft CMS app, project config, modules, DDEV
app/                    Next app
app/scripts/            frontend build-time generators
app/src/app/            App Router routes and route handlers
app/src/Components/     shared frontend components
app/src/Sections/       CMS section renderers
app/src/Templates/      entry-level templates
app/src/queries/        gql.tada documents and fragments
app/src/lib/craft/      Craft URL, metadata, preview, query helpers
app/src/styles/         source tokens and generated style artifacts
app/src/animations/     GSAP config, element animations, transitions
app/src/store/          Zustand state
scripts/                local orchestration scripts
deploy/scripts/         manual Craft synchronization scripts
docs/specs/             implementation specs and architecture notes
.dev/specs/             current implementation plans
```

Place new code in the narrowest existing owner. Do not create a new folder or
generic helper if an established local surface already owns the behavior.

## Mandatory Working Flow

For small fixes:

1. Read target files.
2. Make the smallest safe edit.
3. Run the narrowest useful validation.
4. Report changed files and command results.

For new features, content-model changes, deployment changes, release changes, or
shared abstractions:

1. Restate the goal.
2. Read relevant code and docs.
3. Identify files to edit or create.
4. Identify validation commands.
5. Implement only the agreed scope.
6. Validate.
7. Report remaining risk.

Ask only when the answer cannot be discovered locally and a wrong assumption
would create real risk.

## Next.js Rules

<!-- BEGIN:nextjs-agent-rules -->

This is not the Next.js you know.

This version may have breaking changes, APIs, conventions, and file structure
that differ from training data. Read the relevant guide in
`node_modules/next/dist/docs/` before changing unfamiliar Next behavior. Heed
deprecation notices.

<!-- END:nextjs-agent-rules -->

Next app rules:

- Keep route files thin.
- Keep entry layout in `app/src/Templates/`.
- Keep CMS blocks in `app/src/Sections/`.
- Keep shared primitives in `app/src/Components/`.
- Do not move client state into server components.
- Do not convert server components to client components unless browser APIs,
  hooks, or event handlers are required.
- When client behavior is needed inside server-rendered markup, prefer a small
  client runtime/controller beside the server component.
- Do not bypass App Router metadata helpers for SEO/favicon/social image work.

## Craft And GraphQL Rules

Craft owns content, authoring, assets, forms, preview tokens, project config,
and cache-change events. Next owns rendering, routing, metadata, frontend state,
image rendering, and cache revalidation.

Rules:

- Craft data crosses into Next through GraphQL only.
- GraphQL documents live in `app/src/queries/`.
- Query wrappers live in `app/src/lib/craft/queries/` and own cache tags.
- Components and sections must not invent cache tags.
- Run `bun gql` after changing Craft fields, sections, globals, entry types,
  GraphQL permissions, fragments, or queries.
- Do not hardcode Craft URLs; use env values and helpers.
- Do not make normal content edits by changing project config.

Craft content-model changes must specify:

- authoring goal
- affected handles
- affected templates or components
- GraphQL schema impact
- seed/content impact
- validation command
- rollback boundary

## Style Token Rules

Source tokens live in:

```txt
app/src/styles/vars.ts
```

Generated files include:

```txt
app/src/styles/root.generated.scss
app/src/styles/vars.generated.scss
app/src/styles/vars.generated.ts
app/src/styles/maps.generated.scss
app/src/styles/utilities.generated.scss
```

Rules:

- Do not edit generated style files manually.
- Run `bun css` after changing source tokens.
- Use Sass aliases from `app/src/styles/export.scss`.
- Use `config.colors`, generated `vars`, or style helpers in TypeScript.
- Do not hardcode theme colors in reusable components.

## Component Rules

Shared components live in `app/src/Components/`.

Rules:

- Components should be small and focused.
- Prefer composition over configuration sprawl.
- Preserve native HTML semantics.
- Keep server-safe factories server-rendered, with client runtime only when
  browser behavior is required.
- Reusable interactive controls should use existing cursor hooks and button
  primitives.
- Do not create one-off component forks when props/classes/render props solve
  the requirement.

Current important primitives:

- `Button`
- `ButtonIcon`
- `TransitionLink`
- `ImageCraft`
- `Slider`
- `Anim`
- `Parallax`
- `Form`

## Animation Rules

GSAP is centralized in:

```txt
app/src/animations/gsap.config.ts
```

Rules:

- Import GSAP only through `@/gsap`.
- Use `useGSAP` for scoped component animation.
- Use `useGsapMatchMedia` for media-aware animation.
- Use `Anim.*` for scroll-triggered reveal/entrance effects.
- Use `Parallax.*` for continuous scroll-linked transform effects.
- Use page transitions only for route-level leave/enter behavior.
- Keep GSAP timelines in refs when they need lifecycle control.
- Respect `config.context.reduceMotion`.
- Do not mix transition lifecycle state with animation implementation.

## State Rules

Client state lives in `app/src/store/` and uses Zustand.

Rules:

- Stores should hold state and actions, not GSAP animation code.
- Browser persistence must be explicit.
- Hooks should wrap common selector patterns.
- Route, cursor, cookie, preload, and theme state should stay in their existing
  ownership surfaces.

## Forms Rules

Craft owns forms through Freeform. Next renders and submits them through:

```txt
app/src/Components/Form/
app/src/app/api/forms/freeform/route.ts
```

Rules:

- Do not hardcode project-specific fields in the form renderer.
- Render from the Freeform GraphQL form definition.
- Keep the Craft GraphQL token server-side.
- Report unsupported field behavior clearly.
- File uploads require explicit implementation before production use.

## Image Rules

Use `ImageCraft` for Craft assets.

Rules:

- Preserve Craft transform URLs.
- Do not fall back to original asset URLs to hide transform/config issues.
- Use blur placeholders when Craft returns `blurDataUrl`.
- Keep Next image remote patterns aligned with the origin of
  `CRAFT_GRAPHQL_ENDPOINT`.

## Environment Rules

Root env files:

```txt
.env
.env.example
```

Rules:

- `.env` is the only private runtime env file.
- `.env.example` is the committed template and must keep the same key set.
- Do not commit real secrets.
- Craft license comes from `CRAFT_LICENSE_KEY`; do not add license files.
- Remote scripts read SSH/deploy settings from env.

## Hosting, Synchronization, And Release Rules

Manual Craft synchronization scripts live in:

```txt
deploy/scripts/
```

Release script:

```txt
scripts/release.ts
```

Rules:

- Cloudflare Workers/OpenNext owns the Next runtime, cache bindings, images,
  domains, deployed versions, and direct GitHub build integration.
- Cloudflare Workers Builds creates branch previews and deploys production only
  from `main`; it never deploys or synchronizes Craft.
- GitHub Actions validates the repository and OpenNext build; it never deploys
  Craft or the Worker.
- Cyon owns the hosted PHP/MySQL Craft runtime.
- Keep Craft synchronization SSH settings provider-neutral.
- Preserve Craft push/pull destructive confirmations.
- Do not run Craft synchronization from commits, Workers Builds, releases, or
  OpenNext builds.
- Release must require `main`, a clean worktree, matching root/app versions,
  verification, commit, annotated tag, and push.
- Do not bypass release safety gates to save time.

## Validation Commands

Use the narrowest useful command first.

Common commands:

```sh
bun css
bun gql:check
bun gql
bun run lint
bun run build
bun run verify
```

When project config changes and Craft is available:

```sh
cd craft && ddev exec php craft project-config/apply --dry-run
```

When UI behavior changes, use browser evidence in addition to build evidence.

## Editing Hygiene

- Use `rg` for search.
- Use `apply_patch` for manual edits.
- Keep edits scoped.
- Do not touch unrelated dirty files.
- Do not edit `node_modules/`, `vendor/`, generated assets, uploads, database
  dumps, or local env files unless the task explicitly requires it.
- Do not add dependencies without a bounded purpose and validation command.
- Prefer existing project style over personal preference.

## Documentation Rules

- Keep README/docs factual and concise.
- Document public workflows, commands, and ownership boundaries.
- Do not include chat history.
- Do not include private/internal protocol language.
- Do not use marketing language.

## Final Report Rules

Final reports must include:

- files changed
- commands run
- command results
- unverified risk, if any

If no validation was run, say so directly.
