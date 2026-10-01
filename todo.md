# TODO

- [ ] Complete the remaining [editorial permissions acceptance checks](craft/plugins/ubiq-editorial-permissions/README.md#recorded-evidence-and-remaining-acceptance): multi-site propagation, concurrent edits, permission revocation in open editors, slideout/bulk/paste interactions, and real starter image/link/reusable-section/preview workflows.
- [ ] Validate cache invalidation on a nonproduction Cloudflare Worker: affected routes refresh, unrelated data stays cached, and shared dependencies refresh across HTML/RSC responses. Local Craft and production-mode Next checks have passed.
- [ ] Complete real Craft cache lifecycle checks for asset changes, entry deletion/restoration, ownership moves, and publishing. See the local [spec](.dev/specs/craft-cache-revalidation.md) and [report](.dev/specs/craft-cache-revalidation-report.md) (Git-ignored).
