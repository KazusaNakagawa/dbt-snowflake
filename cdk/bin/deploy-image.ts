#!/usr/bin/env node
/**
 * Dedicated script for building and pushing Docker images
 * 
 * This script is used to update only the Docker image, separate from CDK deployment.
 * It can be executed as an NPM script: npm run deploy:image
 */
import * as dotenv from 'dotenv';
import * as path from 'path';
import { buildAndPushImage, ensureRepositoryExists } from '../lib/build-and-push';

// Load the .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Load settings from environment variables (with default values)
const env = process.env.ENVIRONMENT || 'dev';
const ecrRepoName = process.env.ECR_REPOSITORY_NAME ? 
  `${process.env.ECR_REPOSITORY_NAME}-${env}` : `dbt-snowflake-${env}`;
const region = process.env.AWS_REGION || 'ap-northeast-1';
const accountId = process.env.AWS_ACCOUNT || '123456789012';

console.log('=== DBT Snowflake Image Deployment Tool ===');
console.log(`Repository Name: ${ecrRepoName}`);
console.log(`Region: ${region}`);
console.log(`Account ID: ${accountId}`);

async function main() {
  try {
    // Ensure the repository exists
    ensureRepositoryExists(region, ecrRepoName);
    
    // Build and push the image
    const imageUri = buildAndPushImage(
      accountId,
      region,
      ecrRepoName,
      'latest',
      'docker/Dockerfile'
    );
    
    console.log('\n🎉 Deployment completed successfully!');
    console.log(`Image URI: ${imageUri}`);
    console.log('\nNext Steps:');
    console.log('1. Execute the workflow using Step Functions:');
    console.log(`   aws stepfunctions start-execution --state-machine-arn arn:aws:states:${region}:${accountId}:stateMachine:DBT-Snowflake-Workflow --name test-$(date +%s)`);
    console.log('2. Or run the ECS task directly:');
    console.log(`   aws ecs run-task --cluster dbt-cluster --task-definition dbt-task --launch-type FARGATE --network-configuration "awsvpcConfiguration={subnets=[subnet-011fa67b552fc4fb6],assignPublicIp=ENABLED}" --overrides '{"containerOverrides":[{"name":"dbt-container","command":["debug"]}]}'`);
  } catch (error) {
    console.error('❌ An error occurred during deployment:', error);
    process.exit(1);
  }
}

// Execute the script
main();
