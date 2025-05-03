#!/usr/bin/env node
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as cdk from 'aws-cdk-lib';
import { DbtSnowflakeStack } from '../lib/dbt-stack';

dotenv.config({ path: path.resolve(__dirname, '../../.env') })
const env = process.env.ENVIRONMENT || 'dev';

const app = new cdk.App();
new DbtSnowflakeStack(app, `DbtSnowflakeStack-${env}`, {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION,
  },
});
