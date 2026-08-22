/**
 * Sandtable static hosting — ADR 0004 (docs/decisions/0004-hosting.md).
 *
 *   sandtable.davetashner.com        → app bucket     (built Vite app)
 *   sandtable.davetashner.com/assets → assets bucket  (PMTiles, borders, media)
 *   pr-<n>.sandtable.davetashner.com → preview bucket (one prefix per PR) + /assets
 *
 * Everything is private S3 behind CloudFront with origin access control. The
 * ACM certificate covers the host and the wildcard, so previews need no DNS
 * work per PR. Deploys are plain `aws s3 sync` + an invalidation, done by
 * GitHub Actions through the OIDC role — this stack owns the infrastructure,
 * not the content.
 */
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cdk from 'aws-cdk-lib';
import * as acm from 'aws-cdk-lib/aws-certificatemanager';
import * as cloudfront from 'aws-cdk-lib/aws-cloudfront';
import * as origins from 'aws-cdk-lib/aws-cloudfront-origins';
import * as route53 from 'aws-cdk-lib/aws-route53';
import * as targets from 'aws-cdk-lib/aws-route53-targets';
import * as s3 from 'aws-cdk-lib/aws-s3';
import type { Construct } from 'constructs';

const here = path.dirname(fileURLToPath(import.meta.url));
const functionsDir = path.join(here, '..', 'functions');

export interface HostingStackProps extends cdk.StackProps {
  /** Production host, e.g. sandtable.davetashner.com */
  readonly domainName: string;
  /** Existing public hosted zone that contains the parent domain. */
  readonly hostedZoneId: string;
  /** Zone name, e.g. davetashner.com */
  readonly hostedZoneName: string;
}

/** Path prefix under which the assets bucket is mounted on every distribution. */
export const ASSETS_PREFIX = '/assets/*';

export class HostingStack extends cdk.Stack {
  readonly appBucket: s3.Bucket;
  readonly assetsBucket: s3.Bucket;
  readonly previewBucket: s3.Bucket;
  readonly distribution: cloudfront.Distribution;
  readonly previewDistribution: cloudfront.Distribution;

  constructor(scope: Construct, id: string, props: HostingStackProps) {
    super(scope, id, props);

    const { domainName, hostedZoneId, hostedZoneName } = props;
    const wildcard = `*.${domainName}`;
    // 'sandtable' from 'sandtable.davetashner.com' — the record name inside the zone
    const subdomain = domainName.slice(0, domainName.length - hostedZoneName.length - 1);

    // ---------------------------------------------------------------- buckets
    // Names follow the deployer IAM policy, which is scoped to sandtable-*.
    const bucketDefaults: s3.BucketProps = {
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      encryption: s3.BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      objectOwnership: s3.ObjectOwnership.BUCKET_OWNER_ENFORCED,
    };

    this.appBucket = new s3.Bucket(this, 'AppBucket', {
      ...bucketDefaults,
      bucketName: `sandtable-app-${this.account}`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    this.assetsBucket = new s3.Bucket(this, 'AssetsBucket', {
      ...bucketDefaults,
      bucketName: `sandtable-assets-${this.account}`,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
      versioned: true, // media originals and tile archives are expensive to recreate
      // PMTiles readers issue HTTP range requests, sometimes cross-origin
      // (vite dev server, local tools). Let them.
      cors: [
        {
          allowedMethods: [s3.HttpMethods.GET, s3.HttpMethods.HEAD],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
          exposedHeaders: ['ETag', 'Content-Length', 'Content-Range', 'Accept-Ranges'],
          maxAge: 3000,
        },
      ],
    });

    this.previewBucket = new s3.Bucket(this, 'PreviewBucket', {
      ...bucketDefaults,
      bucketName: `sandtable-preview-${this.account}`,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: true,
      // The preview workflow deletes pr-<n>/ when a PR closes; this is the
      // safety net for PRs that never close cleanly.
      lifecycleRules: [{ expiration: cdk.Duration.days(30) }],
    });

    // ------------------------------------------------------------ certificate
    const zone = route53.HostedZone.fromHostedZoneAttributes(this, 'Zone', {
      hostedZoneId,
      zoneName: hostedZoneName,
    });

    const certificate = new acm.Certificate(this, 'Certificate', {
      domainName,
      subjectAlternativeNames: [wildcard],
      validation: acm.CertificateValidation.fromDns(zone),
    });

    // -------------------------------------------------------- edge functions
    const spaRewrite = new cloudfront.Function(this, 'SpaRewrite', {
      functionName: 'sandtable-spa-rewrite',
      comment: 'SPA routing: extensionless paths → /index.html',
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      code: cloudfront.FunctionCode.fromFile({
        filePath: path.join(functionsDir, 'spa-rewrite.js'),
      }),
    });

    const previewRewrite = new cloudfront.Function(this, 'PreviewRewrite', {
      functionName: 'sandtable-preview-rewrite',
      comment: 'pr-<n>.<domain>/path → /pr-<n>/path, with SPA fallback',
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      code: cloudfront.FunctionCode.fromFile({
        filePath: path.join(functionsDir, 'preview-rewrite.js'),
      }),
    });

    // CloudFront forwards the full path; the assets bucket has no /assets prefix.
    const assetsRewrite = new cloudfront.Function(this, 'AssetsRewrite', {
      functionName: 'sandtable-assets-rewrite',
      comment: '/assets/<key> → /<key> on the assets bucket',
      runtime: cloudfront.FunctionRuntime.JS_2_0,
      code: cloudfront.FunctionCode.fromFile({
        filePath: path.join(functionsDir, 'assets-rewrite.js'),
      }),
    });

    // --------------------------------------------------------- distributions
    const assetsBehavior: cloudfront.BehaviorOptions = {
      origin: origins.S3BucketOrigin.withOriginAccessControl(this.assetsBucket),
      viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
      allowedMethods: cloudfront.AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
      cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
      responseHeadersPolicy: cloudfront.ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS_WITH_PREFLIGHT,
      compress: true,
      functionAssociations: [
        { function: assetsRewrite, eventType: cloudfront.FunctionEventType.VIEWER_REQUEST },
      ],
    };

    const securityHeaders = new cloudfront.ResponseHeadersPolicy(this, 'SecurityHeaders', {
      responseHeadersPolicyName: 'sandtable-security-headers',
      securityHeadersBehavior: {
        contentTypeOptions: { override: true },
        frameOptions: { frameOption: cloudfront.HeadersFrameOption.DENY, override: true },
        referrerPolicy: {
          referrerPolicy: cloudfront.HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
          override: true,
        },
        strictTransportSecurity: {
          accessControlMaxAge: cdk.Duration.days(365),
          includeSubdomains: true,
          override: true,
        },
      },
    });

    const commonDistribution: Partial<cloudfront.DistributionProps> = {
      certificate,
      defaultRootObject: 'index.html',
      httpVersion: cloudfront.HttpVersion.HTTP2_AND_3,
      minimumProtocolVersion: cloudfront.SecurityPolicyProtocol.TLS_V1_2_2021,
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100, // NA + EU
      enableIpv6: true,
      additionalBehaviors: { [ASSETS_PREFIX]: assetsBehavior },
    };

    this.distribution = new cloudfront.Distribution(this, 'Distribution', {
      ...commonDistribution,
      comment: `Sandtable — ${domainName}`,
      domainNames: [domainName],
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.appBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy: securityHeaders,
        compress: true,
        functionAssociations: [
          { function: spaRewrite, eventType: cloudfront.FunctionEventType.VIEWER_REQUEST },
        ],
      },
    });

    this.previewDistribution = new cloudfront.Distribution(this, 'PreviewDistribution', {
      ...commonDistribution,
      comment: `Sandtable PR previews — ${wildcard}`,
      domainNames: [wildcard],
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(this.previewBucket),
        viewerProtocolPolicy: cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: cloudfront.CachePolicy.CACHING_OPTIMIZED,
        responseHeadersPolicy: securityHeaders,
        compress: true,
        functionAssociations: [
          { function: previewRewrite, eventType: cloudfront.FunctionEventType.VIEWER_REQUEST },
        ],
      },
    });

    // ------------------------------------------------------------------ DNS
    for (const [name, record, dist] of [
      ['Prod', subdomain, this.distribution],
      ['Preview', `*.${subdomain}`, this.previewDistribution],
    ] as const) {
      const target = route53.RecordTarget.fromAlias(new targets.CloudFrontTarget(dist));
      new route53.ARecord(this, `${name}AliasA`, { zone, recordName: record, target });
      new route53.AaaaRecord(this, `${name}AliasAAAA`, { zone, recordName: record, target });
    }

    // -------------------------------------------------------------- outputs
    // The deploy workflows read these with `aws cloudformation describe-stacks`.
    const out = (id: string, value: string, description: string) =>
      new cdk.CfnOutput(this, id, { value, description, exportName: `sandtable-${id}` });

    out('AppBucketName', this.appBucket.bucketName, 'S3 bucket for the built app (main)');
    out('AssetsBucketName', this.assetsBucket.bucketName, 'S3 bucket for tiles, borders, media');
    out('PreviewBucketName', this.previewBucket.bucketName, 'S3 bucket for PR previews (pr-<n>/)');
    out('DistributionId', this.distribution.distributionId, 'CloudFront distribution (production)');
    out(
      'PreviewDistributionId',
      this.previewDistribution.distributionId,
      'CloudFront distribution (PR previews)',
    );
    out('SiteUrl', `https://${domainName}`, 'Production URL');
    out('PreviewUrlPattern', `https://pr-<n>.${domainName}`, 'PR preview URL pattern');
  }
}
