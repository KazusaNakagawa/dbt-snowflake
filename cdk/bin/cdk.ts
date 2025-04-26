#!/usr/bin/env node
import * as cdk from 'aws-cdk-lib';
import { DbtSnowflakeStack } from '../lib/dbt-stack';

const app = new cdk.App();
new DbtSnowflakeStack(app, 'CdkStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
