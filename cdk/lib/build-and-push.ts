// lib/build-and-push.ts
import * as child_process from 'child_process';
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function executeCommand(command: string): Promise<string> {
  return new Promise((resolve, reject) => {
    child_process.exec(command, (error, stdout, stderr) => {
      if (error) {
        reject(`実行エラー: ${error.message}`);
        return;
      }
      if (stderr) {
        console.log(`stderr: ${stderr}`);
      }
      resolve(stdout);
    });
  });
}

async function buildAndPushImage() {
  try {
    const awsRegion = process.env.AWS_REGION || 'us-east-1';
    const ecrRepoName = process.env.ECR_REPOSITORY_NAME || 'dbt-snowflake';
    
    console.log('AWSアカウントIDを取得中...');
    const awsAccountId = (await executeCommand('aws sts get-caller-identity --query Account --output text')).trim();
    
    const ecrRepositoryUri = `${awsAccountId}.dkr.ecr.${awsRegion}.amazonaws.com/${ecrRepoName}`;
    
    console.log('ECRにログイン中...');
    await executeCommand(`aws ecr get-login-password --region ${awsRegion} | docker login --username AWS --password-stdin ${ecrRepositoryUri}`);
    
    console.log('Dockerイメージをビルド中...');
    await executeCommand(`docker build -t ${ecrRepoName}:latest -f docker/Dockerfile .`);
    
    console.log('イメージにタグを付けています...');
    await executeCommand(`docker tag ${ecrRepoName}:latest ${ecrRepositoryUri}:latest`);
    
    console.log('ECRにイメージをプッシュ中...');
    await executeCommand(`docker push ${ecrRepositoryUri}:latest`);
    
    console.log(`イメージが正常にプッシュされました: ${ecrRepositoryUri}:latest`);
  } catch (error) {
    console.error('エラーが発生しました:', error);
    process.exit(1);
  }
}

buildAndPushImage();