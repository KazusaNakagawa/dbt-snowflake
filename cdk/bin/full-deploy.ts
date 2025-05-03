#!/usr/bin/env node
/**
 * Full Deployment Script
 * 
 * This script performs the following tasks in sequence:
 * 1. Deploy CDK stacks
 * 2. Build and push Docker images
 * 3. Execute Step Functions (optional)
 * 
 * Usage:
 * npm run full-deploy          # Deploy CDK stacks and Docker images
 * npm run full-deploy:run      # Deploy and then execute Step Functions
 */
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { buildAndPushImage, ensureRepositoryExists } from '../lib/build-and-push';

// Load .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// Load settings from environment variables (with default values)
const env = process.env.ENVIRONMENT || 'dev';
const ecrRepoName = process.env.ECR_REPOSITORY_NAME ? 
  `${process.env.ECR_REPOSITORY_NAME}-${env}` : `dbt-snowflake-${env}`;
const region = process.env.AWS_REGION || 'ap-northeast-1';
const accountId = process.env.AWS_ACCOUNT || '123456789012';

console.log('=== DBT Snowflake Full Deployment Tool ===');
console.log(`Date: ${new Date().toLocaleString('en-US')}`);
console.log(`Environment: ${env}`);
console.log(`Repository Name: ${ecrRepoName}`);
console.log(`Region: ${region}`);
console.log(`Account ID: ${accountId}`);
console.log('----------------------------------------');

async function main() {
  try {
    // Step 1: Deploy CDK stacks
    console.log('\n🔹 1/3: Deploying CDK stacks...');
    execSync('cdk deploy --require-approval never', { 
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..') 
    });
    console.log('✅ CDK stack deployment completed');
    
    // Step 2: Ensure repository exists and build/push Docker image
    console.log('\n🔹 2/3: Building and pushing Docker image...');
    ensureRepositoryExists(region, ecrRepoName);
    const imageUri = buildAndPushImage(
      accountId,
      region,
      ecrRepoName,
      'latest',
      'docker/Dockerfile'
    );
    console.log(`✅ Docker image push completed: ${imageUri}`);
    
    // Step 3: (Optional) Execute Step Functions
    const shouldRunStepFunctions = process.argv.includes('--run');
    if (shouldRunStepFunctions) {
      console.log('\n🔹 3/3: Executing Step Functions...');
      const stateMachineArn = `arn:aws:states:${region}:${accountId}:stateMachine:DBT-Snowflake-Workflow`;
      const executionName = `test-${Math.floor(Date.now() / 1000)}`;
      
      execSync(`aws stepfunctions start-execution --state-machine-arn ${stateMachineArn} --name ${executionName}`, {
        stdio: 'inherit'
      });
      
      console.log(`✅ Step Functions execution started: ${executionName}`);
      console.log(`👉 To check execution status: https://${region}.console.aws.amazon.com/states/home?region=${region}#/executions/details/${stateMachineArn}:${executionName}`);
    } else {
      console.log('\n🔹 3/3: Step Functions execution skipped');
      console.log('👉 To execute, use the --run option');
    }
    
    console.log('\n🎉 Deployment completed successfully!');
    console.log('\nNext Steps:');
    console.log('1. Execute Step Functions:');
    console.log(`   aws stepfunctions start-execution --state-machine-arn arn:aws:states:${region}:${accountId}:stateMachine:DBT-Snowflake-Workflow --name test-$(date +%s)`);
    console.log('2. Or run the ECS task directly:');
    console.log(`   aws ecs run-task --cluster dbt-cluster --task-definition dbt-task --launch-type FARGATE --network-configuration "awsvpcConfiguration={subnets=[subnet-011fa67b552fc4fb6],assignPublicIp=ENABLED}" --overrides '{"containerOverrides":[{"name":"dbt-container","command":["debug"]}]}'`);
  } catch (error) {
    console.error('\n❌ An error occurred during deployment:');
    console.error(error);
    process.exit(1);
  }
}

// Execute the script
main();