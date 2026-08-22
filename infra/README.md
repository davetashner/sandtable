# Infrastructure

AWS CDK (TypeScript) for static hosting per
[ADR 0004](../docs/decisions/0004-hosting.md). One stack, `SandtableHosting`,
in `us-east-1` (account `205074708100`). Story: `sand-a55.16`.

## What it creates

| Resource                         | Name / address                                   | Purpose                                          |
| -------------------------------- | ------------------------------------------------ | ------------------------------------------------ |
| S3 `sandtable-app-<acct>`        | origin of `sandtable.davetashner.com`            | the built app (`main`)                           |
| S3 `sandtable-assets-<acct>`     | `/assets/*` on every distribution                | PMTiles, border GeoJSON, media (versioned, CORS) |
| S3 `sandtable-preview-<acct>`    | origin of `*.sandtable.davetashner.com`          | PR previews, one `pr-<n>/` prefix each           |
| ACM certificate                  | host + `*.sandtable.davetashner.com`             | DNS-validated in the `davetashner.com` zone      |
| CloudFront `Distribution`        | `sandtable.davetashner.com`                      | app + `/assets/*`; SPA rewrite function          |
| CloudFront `PreviewDistribution` | `*.sandtable.davetashner.com`                    | host label → `pr-<n>/` prefix; `/assets/*`       |
| Route 53 A/AAAA aliases          | host and wildcard                                | point at the two distributions                   |
| CloudFront Functions             | `functions/spa-rewrite.js`, `preview-rewrite.js` | viewer-request URL rewriting                     |

All buckets are private (origin access control, TLS-only, public access
blocked). Bucket names match the deployer IAM policy scope `sandtable-*`.
Vite's hashed bundles are emitted under `app/` (not `assets/`) so the
`/assets/*` behaviour is free for the assets bucket — see `vite.config.ts`.

## How deploys work

- **`main` → production** (`.github/workflows/deploy.yml`): `cdk deploy` the
  stack (no-op if unchanged), build, `scripts/deploy-static.sh dist s3://app`,
  invalidate. Credentials: OIDC role in repo variable `AWS_ROLE_ARN`.
- **Pull requests → `https://pr-<n>.sandtable.davetashner.com`**
  (`.github/workflows/preview.yml`): build, sync to `pr-<n>/` in the preview
  bucket, invalidate `/pr-<n>/*`, sticky PR comment; the prefix is deleted when
  the PR closes. Forks and Dependabot are skipped (no OIDC role).
- **Infra PRs** (`.github/workflows/infra.yml`): typecheck, tests, `cdk synth`
  and a `cdk diff` against the live stack in the job summary.

Cache policy: `app/*` is `immutable` for a year; `index.html` and anything from
`public/` is `max-age=0, must-revalidate` and the deploy invalidates `/*`.

## Local commands

```bash
cd infra
npm ci
npm run typecheck
npm test            # node:test + aws-cdk-lib/assertions
npx cdk synth       # no credentials needed
AWS_PROFILE=sandtable-deployer npx cdk diff
AWS_PROFILE=sandtable-deployer npx cdk deploy
```

The account is CDK-bootstrapped (v30); the deployer role/user may assume the
bootstrap roles, so `cdk deploy` works from a laptop with the
`sandtable-deployer` profile as well as from Actions.

## Uploading assets

Media originals and tile archives are uploaded to the assets bucket by their
pipelines (`sand-y0u.3`, tiles) — or by hand while those land:

```bash
aws s3 sync content/shared/media s3://sandtable-assets-205074708100/media \
  --exclude "*" --include "*.png" --include "*.jpg" --include "*.webp" \
  --profile sandtable-deployer
```

They are then reachable at `https://sandtable.davetashner.com/assets/media/…`.
