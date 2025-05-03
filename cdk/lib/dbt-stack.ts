import * as cdk from 'aws-cdk-lib'
import { Construct } from 'constructs'
import * as ecs from 'aws-cdk-lib/aws-ecs'
import * as iam from 'aws-cdk-lib/aws-iam'
import * as sfn from 'aws-cdk-lib/aws-stepfunctions'
import * as logs from 'aws-cdk-lib/aws-logs'
import * as s3 from 'aws-cdk-lib/aws-s3'
import * as dotenv from 'dotenv'
import * as path from 'path'
import * as ec2 from 'aws-cdk-lib/aws-ec2'
import { createEcrRepository } from './ecr';
import { createEcsExecutionRole, createDbtTaskRole } from './iam';
import { createDbtDebugTask, createDbtRunTask } from './dbt-task'
// import { createDbtSnowflakeSsmParameter } from './ssm';


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

    // dbt
    const sbtProfilesDir = process.env.DBT_PROFILES_DIR || '/usr/src/app/dbt/profiles'

    // Snowflake接続情報
    const snowflakeAccount = process.env.DB_SNOWFLAKE_ACCOUNT || ''
    const snowflakeHost = process.env.DB_SNOWFLAKE_HOST || ''
    const snowflakeUser = process.env.DB_SNOWFLAKE_USER || ''
    const snowflakePassword = process.env.DB_SNOWFLAKE_PASSWORD || ''
    const snowflakePrivateKeyPath = process.env.DB_SNOWFLAKE_PRIVATE_KEY_PATH || ''
    const snowflakeRole = process.env.DB_SNOWFLAKE_ROLE || 'ACCOUNTADMIN'
    const snowflakeDatabase = process.env.DB_SNOWFLAKE_DATABASE || 'MY_DBT_DB'
    const snowflakeWarehouse = process.env.DB_SNOWFLAKE_WAREHOUSE || 'TRANSFORMING'
    const snowflakeSchema = process.env.DB_SNOWFLAKE_SCHEMA || 'TPCH_SF1'

    // コンテナ定義
    const container = taskDefinition.addContainer('dbt-container', {
      image: ecs.ContainerImage.fromEcrRepository(repository, 'latest'),
      logging: ecs.LogDrivers.awsLogs({
        streamPrefix: 'dbt',
        logGroup: new logs.LogGroup(this, 'DbtLogGroup', {
          logGroupName: '/ecs/dbt-tasks',
          retention: logs.RetentionDays.TWO_YEARS,
          removalPolicy: cdk.RemovalPolicy.DESTROY,
        }),
      }),
      environment: {
        'DBT_PROFILES_DIR': sbtProfilesDir,
        'DB_SNOWFLAKE_ACCOUNT': snowflakeAccount,
        'DB_SNOWFLAKE_HOST': snowflakeHost,
        'DB_SNOWFLAKE_USER': snowflakeUser,
        'DB_SNOWFLAKE_PASSWORD': snowflakePassword,
        'DB_SNOWFLAKE_PRIVATE_KEY_PATH': snowflakePrivateKeyPath,
        'DB_SNOWFLAKE_ROLE': snowflakeRole,
        'DB_SNOWFLAKE_DATABASE': snowflakeDatabase,
        'DB_SNOWFLAKE_WAREHOUSE': snowflakeWarehouse,
        'DB_SNOWFLAKE_SCHEMA': snowflakeSchema,
      },
      healthCheck: {
        command: ['CMD-SHELL', 'dbt --version || exit 1'],
        interval: cdk.Duration.seconds(30),
        timeout: cdk.Duration.seconds(5),
        retries: 3,
        startPeriod: cdk.Duration.seconds(5),
      },
    })

    // const dbtSnowflakeConfig = {
    //   'DB_SNOWFLAKE_ACCOUNT': process.env.DB_SNOWFLAKE_ACCOUNT || 'your_account',
    //   'DB_SNOWFLAKE_HOST': process.env.DB_SNOWFLAKE_HOST || 'your_host',
    //   'DB_SNOWFLAKE_USER': process.env.DB_SNOWFLAKE_USER || 'your_user',
    //   'DB_SNOWFLAKE_PASSWORD': process.env.DB_SNOWFLAKE_PASSWORD || 'your_password',
    //   'DB_SNOWFLAKE_PRIVATE_KEY_PATH': process.env.DB_SNOWFLAKE_PRIVATE_KEY_PATH || 'your_private_key_path',
    //   'DB_SNOWFLAKE_ROLE': snowflakeRole,
    //   'DB_SNOWFLAKE_DATABASE': snowflakeDatabase,
    //   'DB_SNOWFLAKE_WAREHOUSE': snowflakeWarehouse,
    //   'DB_SNOWFLAKE_SCHEMA': snowflakeSchema,
    // };

    // createDbtSnowflakeSsmParameter(this, 'DbtSnowflakeConfig', '/dbt/snowflake/info', dbtSnowflakeConfig);

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
    // const subnets = vpc.publicSubnets.map(subnet => subnet.subnetId)

    // Security Groupを新しく作る
    const dbtSecurityGroup = new ec2.SecurityGroup(this, 'DbtSecurityGroup', {
      vpc,
      description: 'Security group for dbt tasks',
      allowAllOutbound: true, // ← ここが重要！！！
    })

    // dbt
    const environment = [
      { name: 'DB_SNOWFLAKE_ACCOUNT', value: snowflakeAccount },
      { name: 'DB_SNOWFLAKE_HOST', value: snowflakeHost },
      { name: 'DB_SNOWFLAKE_USER', value: snowflakeUser },
      { name: 'DB_SNOWFLAKE_PASSWORD', value: snowflakePassword },
      { name: 'DB_SNOWFLAKE_PRIVATE_KEY_PATH', value: snowflakePrivateKeyPath },
      { name: 'DB_SNOWFLAKE_ROLE', value: snowflakeRole },
      { name: 'DB_SNOWFLAKE_DATABASE', value: snowflakeDatabase },
      { name: 'DB_SNOWFLAKE_WAREHOUSE', value: snowflakeWarehouse },
      { name: 'DB_SNOWFLAKE_SCHEMA', value: snowflakeSchema },
    ]

    const dbtDebugTask = createDbtDebugTask(this, cluster, taskDefinition, container, environment, dbtSecurityGroup, vpc);
    const dbtRunTask = createDbtRunTask(this, cluster, taskDefinition, container, environment, dbtSecurityGroup, vpc);

    // Step Functions ステートマシン
    const definition = dbtDebugTask.next(dbtRunTask);

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
