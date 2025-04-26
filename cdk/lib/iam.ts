import * as cdk from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';
/**
 * Create an ECS execution role.
 * @param scope - The CDK construct scope.
 * @param id - The unique ID for the role.
 * @returns The created IAM role.
 */
export function createEcsExecutionRole(scope: Construct, id: string): iam.Role {
  return new iam.Role(scope, id, {
    assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    roleName: 'ecsTaskExecutionRole',
    managedPolicies: [
      iam.ManagedPolicy.fromAwsManagedPolicyName('service-role/AmazonECSTaskExecutionRolePolicy'),
    ],
  });
}

/**
 * Create a dbt task role with necessary permissions.
 * @param scope - The CDK construct scope.
 * @param id - The unique ID for the role.
 * @param bucketArn - The ARN of the S3 bucket for artifacts.
 * @returns The created IAM role.
 */
export function createDbtTaskRole(scope: Construct, id: string, bucketArn: string): iam.Role {
  const role = new iam.Role(scope, id, {
    assumedBy: new iam.ServicePrincipal('ecs-tasks.amazonaws.com'),
    roleName: 'dbtTaskRole',
  });

  role.addToPolicy(new iam.PolicyStatement({
    actions: [
      'logs:CreateLogStream',
      'logs:PutLogEvents',
      'ssm:GetParameters',
      'secretsmanager:GetSecretValue',
    ],
    resources: ['*'],
  }));

  role.addToPolicy(new iam.PolicyStatement({
    actions: [
      's3:PutObject',
      's3:GetObject',
      's3:ListBucket',
    ],
    resources: [
      bucketArn,
      `${bucketArn}/*`,
    ],
  }));

  return role;
}