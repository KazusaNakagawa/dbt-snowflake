import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as ecs from 'aws-cdk-lib/aws-ecs'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as sfn from 'aws-cdk-lib/aws-stepfunctions'
import * as tasks from 'aws-cdk-lib/aws-stepfunctions-tasks'
import * as logs from 'aws-cdk-lib/aws-logs'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import { createEcrRepository } from './ecr';
import { createEcsExecutionRole, createDbtTaskRole } from './iam';
import { createDbtSnowflakeSsmParameter } from './ssm';

dotenv.config({ path: path.resolve(__dirname, '../../.env') })

export class DbtSnowflakeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props)

    // 環境変数からの読み込み（デフォルト値付き）
    const env = process.env.ENVIRONMENT || 'dev'
    const ecrRepoName = process.env.ECR_REPOSITORY_NAME || 'dbt-snowflake'
    const artifactsBucketName = process.env.ARTIFACTS_BUCKET_NAME || 'dbt-snowflake-artifacts'

    // ECRリポジトリ
    const repository = createEcrRepository(this, 'DbtRepository', `${ecrRepoName}-${env}`);

    const artifactsBucket = s3.Bucket.fromBucketName(
      this, 
      'ArtifactsBucket', 
      artifactsBucketName
    )

    // IAMロール
    const executionRole = createEcsExecutionRole(this, 'EcsExecutionRole');
    const dbtTaskRole = createDbtTaskRole(this, 'DbtTaskRole', artifactsBucket.bucketArn);

    // ネットワーク設定のためにデフォルトVPCを使用
    const vpc = ec2.Vpc.fromLookup(this, 'DefaultVPC', {
      isDefault: true
    })

    // ECSクラスター
    const cluster = new ecs.Cluster(this, 'DbtCluster', {
      clusterName: 'dbt-cluster',
      vpc,
    })

    // ECSタスク定義
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'DbtTaskDefinition', {
      family: 'dbt-task',
      executionRole: executionRole,
      taskRole: dbtTaskRole,
      cpu: 1024,
      memoryLimitMiB: 2048,
      ephemeralStorageGiB: 21,
    })

    // コンテナ定義
    const container = taskDefinition.addContainer('dbt-container', {
      image: ecs.ContainerImage.fromEcrRepository(repository, 'latest'),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'dbt',
        logGroup: new logs.LogGroup(this, 'DbtLogGroup', {
          logGroupName: '/ecs/dbt-tasks',
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        }),
      }),
      environment: {
        'DBT_PROFILES_DIR': '/usr/src/app/dbt/profiles',
      },
      healthCheck: {
        command: ['CMD-SHELL', 'dbt --version || exit 1'],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(5),
      },
    })

    const dbtSnowflakeConfig = {
      'DB_SNOWFLAKE_ACCOUNT': process.env.DB_SNOWFLAKE_ACCOUNT || 'your_account',
      'DB_SNOWFLAKE_USER': process.env.DB_SNOWFLAKE_USER || 'your_user',
      'DB_SNOWFLAKE_PASSWORD': process.env.DB_SNOWFLAKE_PASSWORD || 'your_password',
      'DB_SNOWFLAKE_PRIVATE_KEY_PATH': process.env.DB_SNOWFLAKE_PRIVATE_KEY_PATH || 'your_private_key_path',
      'DB_SNOWFLAKE_ROLE': process.env.DB_SNOWFLAKE_ROLE || 'your_role',
      'DB_SNOWFLAKE_DATABASE': process.env.DB_SNOWFLAKE_DATABASE || 'your_database',
      'DB_SNOWFLAKE_WAREHOUSE': process.env.DB_SNOWFLAKE_WAREHOUSE || 'your_warehouse',
      'DB_SNOWFLAKE_SCHEMA': process.env.DB_SNOWFLAKE_SCHEMA || 'your_schema',
    };

    createDbtSnowflakeSsmParameter(this, 'DbtSnowflakeConfig', '/dbt/snowflake/info', dbtSnowflakeConfig);

    // Step Functionsのロール
    const stepFunctionsRole = new iam.Role(this, 'StepFunctionsRole', {
      assumedBy: new iam.ServicePrincipal('states.amazonaws.com'),
      roleName: 'StepFunctionsServiceRole',
    })

    stepFunctionsRole.addToPolicy(new iam.PolicyStatement({
      actions: [
        'ecs:RunTask',
        'ecs:StopTask',
        'ecs:DescribeTasks',
        'iam:PassRole',
      ],
      resources: ['*'], // 本番環境では制限的に設定すべき
    }))

    // サブネットを取得
    const subnets = vpc.publicSubnets.map(subnet => subnet.subnetId)

    // dbt debug タスク
    const dbtDebugTask = new tasks.EcsRunTask(this, 'DbtDebugTask', {
      cluster,
      taskDefinition,
      launchTarget: new tasks.EcsFargateLaunchTarget({
        platformVersion: ecs.FargatePlatformVersion.LATEST,
      }),
      // コンテナとコマンドの指定方法を修正
      containerOverrides: [{
        containerDefinition: container,
        command: ['debug'],
      }],
      securityGroups: [],
      assignPublicIp: true,
      subnets: vpc.selectSubnets({ subnetType: ec2.SubnetType.PUBLIC }),
      integrationPattern: sfn.IntegrationPattern.RUN_JOB,
    })

    // dbt run タスク
    const dbtRunTask = new tasks.EcsRunTask(this, 'DbtRunTask', {
      cluster,
      taskDefinition,
      launchTarget: new tasks.EcsFargateLaunchTarget({
        platformVersion: ecs.FargatePlatformVersion.LATEST,
      }),
      // コンテナとコマンドの指定方法を修正
      containerOverrides: [{
        containerDefinition: container,
        command: ['run', '--fail-fast'],
      }],
      securityGroups: [],
      assignPublicIp: true,
      subnets: vpc.selectSubnets({ subnetType: ec2.SubnetType.PUBLIC }),
      integrationPattern: sfn.IntegrationPattern.RUN_JOB,
    })

    // Step Functions ステートマシン
    const definition = dbtDebugTask.next(dbtRunTask)

    const stateMachine = new sfn.StateMachine(this, 'DbtWorkflow', {
      definition,
      stateMachineName: 'DBT-Snowflake-Workflow',
      role: stepFunctionsRole,
    })

    // 出力
    new cdk.CfnOutput(this, 'EcrRepositoryUri', {
      value: repository.repositoryUri,
      description: 'ECR Repository URI',
    })

    new cdk.CfnOutput(this, 'StateMachineArn', {
      value: stateMachine.stateMachineArn,
      description: 'Step Functions State Machine ARN',
    })
  }
}
