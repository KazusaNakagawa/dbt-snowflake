// lib/build-and-push.ts
import { execSync } from 'child_process';
import * as path from 'path';

/**
 * ローカルの Docker イメージを ECR にビルドしてプッシュするユーティリティ関数
 * @param accountId - AWS アカウント ID
 * @param region - AWS リージョン
 * @param repositoryName - ECR リポジトリ名
 * @param tag - イメージタグ（デフォルトは latest）
 * @param dockerfilePath - Dockerfile の相対パス
 * @param platform - ターゲットプラットフォーム（デフォルトは linux/amd64）
 * @returns プッシュされたイメージの URI
 */
export function buildAndPushImage(
  accountId: string,
  region: string,
  repositoryName: string,
  tag: string = 'latest',
  dockerfilePath: string = 'docker/Dockerfile',
  platform: string = 'linux/amd64'
): string {
  // リポジトリ URI を構築
  const repositoryUri = `${accountId}.dkr.ecr.${region}.amazonaws.com/${repositoryName}`;
  const imageUri = `${repositoryUri}:${tag}`;
  
  try {
    // プロジェクトのルートディレクトリを取得（cdk フォルダの親）
    const projectRoot = path.resolve(__dirname, '../..');
    
    console.log('🔹 ECR リポジトリにログイン中...');
    // AWS ECR にログイン
    execSync(`aws ecr get-login-password --region ${region} | docker login --username AWS --password-stdin ${repositoryUri}`, 
      { stdio: 'inherit', cwd: projectRoot });
    
    // Docker イメージのビルド（マルチプラットフォーム対応）
    console.log(`🔹 Docker イメージを ${platform} 向けにビルド中...`);
    execSync(`docker buildx create --use --name dbt-builder || true`, { stdio: 'inherit', cwd: projectRoot });
    execSync(`docker buildx build --platform ${platform} -t ${repositoryName}:${tag} -f ${dockerfilePath} --load .`, 
      { stdio: 'inherit', cwd: projectRoot });
    
    // ECR リポジトリ用にタグ付け
    console.log('🔹 ECR リポジトリ用にタグ付け中...');
    execSync(`docker tag ${repositoryName}:${tag} ${imageUri}`, 
      { stdio: 'inherit', cwd: projectRoot });
    
    // ECR リポジトリにプッシュ
    console.log('🔹 ECR リポジトリにプッシュ中...');
    execSync(`docker push ${imageUri}`, 
      { stdio: 'inherit', cwd: projectRoot });
    
    console.log(`✅ イメージが正常にプッシュされました: ${imageUri}`);
    return imageUri;
  } catch (error) {
    console.error('❌ イメージのビルド・プッシュ中にエラーが発生しました:', error);
    throw error;
  }
}

/**
 * ECR リポジトリが存在するか確認し、なければ作成するユーティリティ関数
 * @param region - AWS リージョン
 * @param repositoryName - ECR リポジトリ名
 * @returns true: 新規作成、false: 既に存在
 */
export function ensureRepositoryExists(region: string, repositoryName: string): boolean {
  try {
    // リポジトリが存在するか確認
    execSync(`aws ecr describe-repositories --repository-names ${repositoryName} --region ${region}`, 
      { stdio: 'pipe' });
    console.log(`📦 リポジトリが既に存在します: ${repositoryName}`);
    return false;
  } catch (error) {
    // エラーの場合は存在しないので作成
    console.log(`🔨 リポジトリを作成中: ${repositoryName}`);
    execSync(`aws ecr create-repository --repository-name ${repositoryName} --region ${region}`, 
      { stdio: 'inherit' });
    return true;
  }
}