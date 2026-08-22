import assert from 'node:assert/strict';
import { test } from 'node:test';
import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import { HostingStack } from './hosting-stack.js';

function synth() {
  const app = new cdk.App();
  const stack = new HostingStack(app, 'Test', {
    env: { account: '123456789012', region: 'us-east-1' },
    domainName: 'sandtable.example.com',
    hostedZoneId: 'Z123',
    hostedZoneName: 'example.com',
  });
  return Template.fromStack(stack);
}

test('three private buckets named for the deployer policy scope', () => {
  const t = synth();
  t.resourceCountIs('AWS::S3::Bucket', 3);
  for (const name of [
    'sandtable-app-123456789012',
    'sandtable-assets-123456789012',
    'sandtable-preview-123456789012',
  ]) {
    t.hasResourceProperties('AWS::S3::Bucket', {
      BucketName: name,
      PublicAccessBlockConfiguration: { BlockPublicAcls: true, RestrictPublicBuckets: true },
    });
  }
});

test('one certificate covering the host and the wildcard', () => {
  const t = synth();
  t.resourceCountIs('AWS::CertificateManager::Certificate', 1);
  t.hasResourceProperties('AWS::CertificateManager::Certificate', {
    DomainName: 'sandtable.example.com',
    SubjectAlternativeNames: ['*.sandtable.example.com'],
    ValidationMethod: 'DNS',
  });
});

test('two distributions: production host and preview wildcard, both mounting /assets/*', () => {
  const t = synth();
  t.resourceCountIs('AWS::CloudFront::Distribution', 2);
  const dists = Object.values(t.findResources('AWS::CloudFront::Distribution')) as Array<{
    Properties: {
      DistributionConfig: { Aliases: string[]; CacheBehaviors: Array<{ PathPattern: string }> };
    };
  }>;
  const aliases = dists
    .map((d) => d.Properties.DistributionConfig.Aliases)
    .flat()
    .sort();
  assert.deepEqual(aliases, ['*.sandtable.example.com', 'sandtable.example.com']);
  for (const d of dists) {
    assert.deepEqual(
      d.Properties.DistributionConfig.CacheBehaviors.map((b) => b.PathPattern),
      ['/assets/*'],
    );
    // the /assets/* behaviour strips its prefix before hitting the bucket
    const assoc = (
      d.Properties.DistributionConfig.CacheBehaviors[0] as unknown as {
        FunctionAssociations: { EventType: string }[];
      }
    ).FunctionAssociations;
    assert.equal(assoc.length, 1);
    assert.equal(assoc[0]!.EventType, 'viewer-request');
  }
});

test('A and AAAA aliases for the host and the wildcard', () => {
  const t = synth();
  t.resourceCountIs('AWS::Route53::RecordSet', 4);
  for (const name of ['sandtable.example.com.', '*.sandtable.example.com.']) {
    for (const type of ['A', 'AAAA']) {
      t.hasResourceProperties('AWS::Route53::RecordSet', { Name: name, Type: type });
    }
  }
});

test('CloudFront functions use the 2.0 runtime', () => {
  const t = synth();
  t.resourceCountIs('AWS::CloudFront::Function', 3);
  t.allResourcesProperties('AWS::CloudFront::Function', {
    FunctionConfig: { Runtime: 'cloudfront-js-2.0' },
  });
});
