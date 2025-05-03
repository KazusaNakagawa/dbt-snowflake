import { Construct } from 'constructs'
import * as ecs from 'aws-cdk-lib/aws-ecs'
import * as sfn from 'aws-cdk-lib/aws-stepfunctions'
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks'
import * as ec2 from 'aws-cdk-lib/aws-ec2'


/**
 * Create a dbt debug task for ECS.
 * @param scope - The CDK construct scope.
 * @param cluster - The ECS cluster.
 * @param taskDefinition - The ECS task definition.
 * @param container - The ECS container definition.
 * @param environment - The environment variables for the task.
 * @param securityGroup - The security group for the task.
 * @param vpc - The VPC for subnet selection.
 * @returns The ECS Run Task for dbt debug.
 */
export function createDbtDebugTask(scope: Construct, cluster: ecs.Cluster, taskDefinition: ecs.FargateTaskDefinition, container: ecs.ContainerDefinition, environment: { name: string; value: string }[], securityGroup: ec2.SecurityGroup, vpc: ec2.IVpc): tasks.EcsRunTask {
  return new tasks.EcsRunTask(scope, 'DbtDebugTask', {
    cluster,
    taskDefinition,
    launchTarget: new tasks.EcsFargateLaunchTarget({
      platformVersion: ecs.FargatePlatformVersion.LATEST,
    }),
    containerOverrides: [{
      containerDefinition: container,
      command: ['debug'],
      environment: environment,
    }],
    securityGroups: [securityGroup],
    assignPublicIp: true,
    subnets: vpc.selectSubnets({ subnetType: ec2.SubnetType.PUBLIC }),
    integrationPattern: sfn.IntegrationPattern.RUN_JOB,
  });
}

/**
 * Create a dbt run task for ECS.
 * @param scope - The CDK construct scope.
 * @param cluster - The ECS cluster.
 * @param taskDefinition - The ECS task definition.
 * @param container - The ECS container definition.
 * @param environment - The environment variables for the task.
 * @param securityGroup - The security group for the task.
 * @param vpc - The VPC for subnet selection.
 * @returns The ECS Run Task for dbt run.
 */
export function createDbtRunTask(scope: Construct, cluster: ecs.Cluster, taskDefinition: ecs.FargateTaskDefinition, container: ecs.ContainerDefinition, environment: { name: string; value: string }[], securityGroup: ec2.SecurityGroup, vpc: ec2.IVpc): tasks.EcsRunTask {
  return new tasks.EcsRunTask(scope, 'DbtRunTask', {
    cluster,
    taskDefinition,
    launchTarget: new tasks.EcsFargateLaunchTarget({
      platformVersion: ecs.FargatePlatformVersion.LATEST,
    }),
    containerOverrides: [{
      containerDefinition: container,
      command: ['run', '--fail-fast'],
      environment: environment,
    }],
    securityGroups: [securityGroup],
    assignPublicIp: true,
    subnets: vpc.selectSubnets({ subnetType: ec2.SubnetType.PUBLIC }),
    integrationPattern: sfn.IntegrationPattern.RUN_JOB,
  });
}
