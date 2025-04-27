#!/usr/bin/env node
/**
 * フルデプロイスクリプト
 * 
 * このスクリプトは以下の処理を一括で行います：
 * 1. CDKスタックのデプロイ
 * 2. Dockerイメージのビルドとプッシュ
 * 3. Step Functionsの実行（オプション）
 * 
 * 使用方法:
 * npm run full-deploy          # CDKとDockerイメージのデプロイ
 * npm run full-deploy:run      # デプロイ後にStep Functionsを実行
 */
import { execSync } from 'child_process';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { buildAndPushImage, ensureRepositoryExists } from '../lib/build-and-push';

// .env ファイルを読み込み
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

// 環境変数から設定を読み込み（デフォルト値付き）
const env = process.env.ENVIRONMENT || 'dev';
const ecrRepoName = process.env.ECR_REPOSITORY_NAME ? 
  `${process.env.ECR_REPOSITORY_NAME}-${env}` : `dbt-snowflake-${env}`;
const region = process.env.AWS_REGION || 'ap-northeast-1';
const accountId = process.env.AWS_ACCOUNT || '672648791083';

console.log('=== DBT Snowflake フルデプロイツール ===');
console.log(`日時: ${new Date().toLocaleString('ja-JP')}`);
console.log(`環境: ${env}`);
console.log(`リポジトリ名: ${ecrRepoName}`);
console.log(`リージョン: ${region}`);
console.log(`アカウント ID: ${accountId}`);
console.log('----------------------------------------');

async function main() {
  try {
    // Step 1: CDKスタックのデプロイ
    console.log('\n🔹 1/3: CDKスタックをデプロイ中...');
    execSync('cdk deploy --require-approval never', { 
      stdio: 'inherit',
      cwd: path.resolve(__dirname, '..') 
    });
    console.log('✅ CDKスタックのデプロイが完了しました');
    
    // Step 2: リポジトリの確認とイメージのビルド・プッシュ
    console.log('\n🔹 2/3: Dockerイメージをビルド・プッシュ中...');
    ensureRepositoryExists(region, ecrRepoName);
    const imageUri = buildAndPushImage(
      accountId,
      region,
      ecrRepoName,
      'latest',
      'docker/Dockerfile'
    );
    console.log(`✅ Dockerイメージのプッシュが完了しました: ${imageUri}`);
    
    // Step 3: (オプション) Step Functionsの実行
    const shouldRunStepFunctions = process.argv.includes('--run');
    if (shouldRunStepFunctions) {
      console.log('\n🔹 3/3: Step Functionsを実行中...');
      const stateMachineArn = `arn:aws:states:${region}:${accountId}:stateMachine:DBT-Snowflake-Workflow`;
      const executionName = `test-${Math.floor(Date.now() / 1000)}`;
      
      execSync(`aws stepfunctions start-execution --state-machine-arn ${stateMachineArn} --name ${executionName}`, {
        stdio: 'inherit'
      });
      
      console.log(`✅ Step Functions実行を開始しました: ${executionName}`);
      console.log(`👉 実行状況を確認するには: https://${region}.console.aws.amazon.com/states/home?region=${region}#/executions/details/${stateMachineArn}:${executionName}`);
    } else {
      console.log('\n🔹 3/3: Step Functions実行はスキップされました');
      console.log('👉 実行するには: --run オプションを付けてください');
    }
    
    console.log('\n🎉 デプロイが完了しました！');
    console.log('\n次のステップ:');
    console.log('1. Step Functionsを実行: ');
    console.log(`   aws stepfunctions start-execution --state-machine-arn arn:aws:states:${region}:${accountId}:stateMachine:DBT-Snowflake-Workflow --name test-$(date +%s)`);
    console.log('2. または ECS タスクを直接実行: ');
    console.log(`   aws ecs run-task --cluster dbt-cluster --task-definition dbt-task --launch-type FARGATE --network-configuration "awsvpcConfiguration={subnets=[subnet-011fa67b552fc4fb6],assignPublicIp=ENABLED}" --overrides '{"containerOverrides":[{"name":"dbt-container","command":["debug"]}]}'`);
  } catch (error) {
    console.error('\n❌ デプロイ中にエラーが発生しました:');
    console.error(error);
    process.exit(1);
  }
}

// スクリプトを実行
main();