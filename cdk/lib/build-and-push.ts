// lib/build-and-push.ts
import { execSync } from 'child_process';
import * as path from 'path';

/**
 * Utility function to build and push a local Docker image to ECR
 * @param accountId - AWS account ID
 * @param region - AWS region
 * @param repositoryName - ECR repository name
 * @param tag - Image tag (default is latest)
 * @param dockerfilePath - Relative path to the Dockerfile
 * @param platform - Target platform (default is linux/amd64)
 * @returns The URI of the pushed image
 */
export function buildAndPushImage(
  accountId: string,
  region: string,
  repositoryName: string,
  tag: string = 'latest',
  dockerfilePath: string = 'docker/Dockerfile',
  platform: string = 'linux/amd64'
): string {
  // Construct the repository URI
  const repositoryUri = `${accountId}.dkr.ecr.${region}.amazonaws.com/${repositoryName}`;
  const imageUri = `${repositoryUri}:${tag}`;
  
  try {
    // Get the project's root directory (parent of the cdk folder)
    const projectRoot = path.resolve(__dirname, '../..');
    
    console.log('🔹 Logging in to the ECR repository...');
    // Log in to AWS ECR
    execSync(`aws ecr get-login-password --region ${region} | docker login --username AWS --password-stdin ${repositoryUri}`, 
      { stdio: 'inherit', cwd: projectRoot });
    
    // Build the Docker image (multi-platform support)
    console.log(`🔹 Building the Docker image for ${platform}...`);
    execSync(`docker buildx create --use --name dbt-builder || true`, { stdio: 'inherit', cwd: projectRoot });
    execSync(`docker buildx build --platform ${platform} -t ${repositoryName}:${tag} -f ${dockerfilePath} --load .`, 
      { stdio: 'inherit', cwd: projectRoot });
    
    // Tag the image for the ECR repository
    console.log('🔹 Tagging the image for the ECR repository...');
    execSync(`docker tag ${repositoryName}:${tag} ${imageUri}`, 
      { stdio: 'inherit', cwd: projectRoot });
    
    // Push the image to the ECR repository
    console.log('🔹 Pushing the image to the ECR repository...');
    execSync(`docker push ${imageUri}`, 
      { stdio: 'inherit', cwd: projectRoot });
    
    console.log(`✅ The image has been successfully pushed: ${imageUri}`);
    return imageUri;
  } catch (error) {
    console.error('❌ An error occurred while building and pushing the image:', error);
    throw error;
  }
}

/**
 * Utility function to check if an ECR repository exists, and create it if it does not
 * @param region - AWS region
 * @param repositoryName - ECR repository name
 * @returns true if the repository was newly created, false if it already exists
 */
export function ensureRepositoryExists(region: string, repositoryName: string): boolean {
  try {
    // Check if the repository exists
    execSync(`aws ecr describe-repositories --repository-names ${repositoryName} --region ${region}`, 
      { stdio: 'pipe' });
    console.log(`📦 The repository already exists: ${repositoryName}`);
    return false;
  } catch (error) {
    // If an error occurs, the repository does not exist, so create it
    console.log(`🔨 Creating the repository: ${repositoryName}`);
    execSync(`aws ecr create-repository --repository-name ${repositoryName} --region ${region}`, 
      { stdio: 'inherit' });
    return true;
  }
}