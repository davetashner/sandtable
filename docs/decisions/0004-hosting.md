# 0004 — Static hosting on AWS (S3 + CloudFront), GitHub Actions via OIDC, assets outside git

- **Status:** accepted
- **Date:** 2026-08-22
- **Bead:** `sand-a55.4`

## Context

Everything in Sandtable is static: the built app, the scenario packs, the
PMTiles archives and the media. Two assets are large and read by byte range
(PMTiles) or are heavy binaries that should not bloat a git repository
(photographs, tile archives). Dave has an AWS account and prefers to use it.
The site should cost close to nothing, deploy from CI without long-lived
credentials, and give reviewers a preview of content and map changes before
merge.

## Decision

- **App:** a private S3 bucket behind **CloudFront** (origin access control).
  Hashed JS/CSS bundles are cached immutably; `index.html` is short-cached
  and invalidated on each deploy.
- **Assets:** a second S3 bucket (or prefix) behind the same CloudFront
  distribution for PMTiles, border GeoJSON, media originals and derivatives.
  S3 and CloudFront serve HTTP range requests natively, which PMTiles
  requires.
- **Domain / TLS:** Route 53 and an ACM certificate.
- **Deploy:** GitHub Actions assuming an IAM role via **OIDC** — no AWS keys
  in GitHub secrets. `main` → production; pull requests → a per-PR prefix in
  a preview bucket, cleaned up on merge.
- **Infrastructure as code:** AWS CDK in TypeScript (matches the app stack)
  under `infra/`; Terraform is an acceptable substitute if preferred.
- **Media and large files live in S3, not git.** The repository tracks the
  `media.json` manifests and optimized web derivatives may be generated at
  build time; originals, masters and tile archives are uploaded to the assets
  bucket by the media and tiles pipelines. A developer's local copy beside
  the manifest is a staging copy and is git-ignored. (The repo's history was
  rewritten before first push to honour this; it is ~200 KB.)
- **Cost:** cents per month at this scale; CloudFront's free tier covers
  1 TB/month of egress.

## Alternatives considered

- **AWS Amplify Hosting.** Git-connected, built-in previews, simpler — but
  less control over cache behaviours and large-asset handling, and the tiles
  would still need their own bucket. Reasonable fallback.
- **Cloudflare Pages / GitHub Pages / Netlify / Vercel.** Free and good; GitHub
  Pages handles large range-requested files poorly, the others impose asset
  size limits, and Dave prefers AWS.
- **A server (Node, containers).** Nothing needs one.
- **Git LFS for media.** Would keep binaries "in git" but still outside the
  repository proper; S3 is simpler, is where the site reads from anyway, and
  avoids LFS bandwidth quotas. Revisit only if build-time derivatives become
  heavy.

## Consequences

- Phase 0 includes the CDK stack, the OIDC role, the deploy workflow and a
  preview mechanism (`sand-a55.16`).
- The media pipeline (`sand-y0u.3`) and tiles pipeline upload to the assets
  bucket and emit the attribution/asset manifests the app reads.
- `.gitignore` excludes image binaries under `content/shared/media/`;
  `content/shared/media/README.md` documents the rule.
- `bd dolt push` uses the same GitHub remote (`refs/dolt/data`) so the
  backlog travels with the code.

## Identities (created 2026-08-22)

- **IAM role `sandtable-deployer`** (path `/sandtable/`), trusted by the
  account's GitHub OIDC provider for `repo:davetashner/sandtable:*`
  (audience `sts.amazonaws.com`); one-hour sessions. Its ARN is the GitHub
  repository variable `AWS_ROLE_ARN`; `AWS_REGION` is `us-east-1`.
- **IAM user `sandtable-deployer`** (same path and policy) for manual work
  from a laptop — media uploads, one-off syncs. Its access key lives only in
  the local AWS profile `sandtable-deployer`; it is never stored in GitHub.
- **Managed policy `sandtable-deployer`**: assume the CDK bootstrap roles
  (`cdk-hnb659fds-*`), read CloudFormation stack outputs, list/get/put/delete
  objects in buckets named `sandtable-*`, and create CloudFront
  invalidations. Everything else (bucket creation, distributions, DNS,
  certificates) is done by CDK through the bootstrap roles, so the policy
  stays small.
- The account was already CDK-bootstrapped (v30) in `us-east-1`.

## Domain (decided 2026-08-22)

- Production: **`sandtable.davetashner.com`** (`sandtable.com` was not
  available). The `davetashner.com` public hosted zone lives in the same AWS
  account (Route 53, zone `Z2ONH2Z46JHXWL`), so the CDK stack creates the
  A/AAAA alias records to CloudFront and a DNS-validated ACM certificate in
  `us-east-1` automatically.
- The certificate covers `sandtable.davetashner.com` and
  `*.sandtable.davetashner.com`, so PR previews can be served at
  `pr-<n>.sandtable.davetashner.com` (or a path prefix) from a preview bucket
  without further DNS work.
- No apex or `www` for now; the project page on davetashner.com links here.
