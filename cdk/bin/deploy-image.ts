#!/usr/bin/env node
/**
 * Docker イメージのビルド・プッシュ専用スクリプト
 * 
 * このスクリプトは CDK デプロイとは別に、Docker イメージだけを更新したいときに使います。
 * NPM スクリプトとして実行できるようにしています: npm run deploy:image
 */
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
const accountId = process.env.AWS_ACCOUNT || '672648791083'; // このプロジェクトのデフォルト値

console.log('=== DBT Snowflake イメージデプロイツール ===');
console.log(`リポジトリ名: ${ecrRepoName}`);
console.log(`リージョン: ${region}`);
console.log(`アカウント ID: ${accountId}`);

async function main() {
  try {
    // リポジトリが存在することを確認
    ensureRepositoryExists(region, ecrRepoName);
    
    // イメージをビルドしてプッシュ
    const imageUri = buildAndPushImage(
      accountId,
      region,
      ecrRepoName,
      'latest',
      'docker/Dockerfile'
    );
    
    console.log('\n🎉 デプロイが完了しました！');
    console.log(`イメージ URI: ${imageUri}`);
    console.log('\n次のステップ:');
    console.log('1. Step Functions を使ってワークフローを実行: ');
    console.log(`   aws stepfunctions start-execution --state-machine-arn arn:aws:states:${region}:${accountId}:stateMachine:DBT-Snowflake-Workflow --name test-$(date +%s)`);
    console.log('2. または ECS タスクを直接実行: ');
    console.log(`   aws ecs run-task --cluster dbt-cluster --task-definition dbt-task --launch-type FARGATE --network-configuration "awsvpcConfiguration={subnets=[subnet-011fa67b552fc4fb6],assignPublicIp=ENABLED}" --overrides '{"containerOverrides":[{"name":"dbt-container","command":["debug"]}]}'`);
  } catch (error) {
    console.error('❌ デプロイ中にエラーが発生しました:', error);
    process.exit(1);
  }
}

// スクリプトを実行
main();
