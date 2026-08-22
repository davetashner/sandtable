#!/usr/bin/env node
/**
 * CDK app entry point. One stack, one region: CloudFront certificates must
 * live in us-east-1 and everything else is global or region-agnostic.
 */
import * as cdk from 'aws-cdk-lib';
import { HostingStack } from '../lib/hosting-stack.js';

const app = new cdk.App();

new HostingStack(app, 'SandtableHosting', {
  env: { account: '205074708100', region: 'us-east-1' },
  description: 'Sandtable static hosting: S3 + CloudFront + ACM + Route 53 (ADR 0004, sand-a55.16)',
  domainName: 'sandtable.davetashner.com',
  hostedZoneId: 'Z2ONH2Z46JHXWL',
  hostedZoneName: 'davetashner.com',
  tags: { project: 'sandtable' },
});
