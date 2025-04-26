import * as cdk from 'aws-cdk-lib';
import * as ecr from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs'

/**
 * Create an ECR repository.
 * @param scope - The CDK construct scope.
 * @param id - The unique ID for the repository.
 * @param repositoryName - The name of the ECR repository.
 * @returns The created ECR repository.
 */
export function createEcrRepository(scope: Construct, id: string, repositoryName: string): ecr.Repository {
  return new ecr.Repository(scope, id, {
    repositoryName,
    removalPolicy: cdk.RemovalPolicy.DESTROY, // Retain for production environments.
    autoDeleteImages: true, // Automatically delete images when the repository is deleted.
  });
}