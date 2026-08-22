# Infrastructure

AWS CDK (TypeScript) stack for static hosting per
[ADR 0004](../docs/decisions/0004-hosting.md): app bucket + assets bucket
behind CloudFront, Route 53 alias and ACM certificate for
`sandtable.davetashner.com`, and the preview bucket for PR previews. Deployed
from GitHub Actions via the OIDC role in repo variable `AWS_ROLE_ARN`.
Story: `sand-a55.16`.
