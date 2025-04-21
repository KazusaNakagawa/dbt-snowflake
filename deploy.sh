#!/bin/bash
set -e

# Configuration variables
AWS_REGION="ap-northeast-1"
ECR_REPOSITORY_NAME="dbt-snowflake"
ECS_CLUSTER_NAME="dbt-cluster"
STACK_NAME="dbt-snowflake-stack"
ENVIRONMENT="production"  # 環境変数（dev, staging, production など）
ARTIFACTS_BUCKET_NAME="dbt-snowflake-artifacts"  # DBTアーティファクト保存用のS3バケット

# 必要なS3バケットの作成（存在しない場合）
echo "Checking S3 bucket for artifacts..."
aws s3api head-bucket --bucket ${ARTIFACTS_BUCKET_NAME} 2>/dev/null || \
aws s3 mb s3://${ARTIFACTS_BUCKET_NAME} --region ${AWS_REGION} && \
echo "Created S3 bucket: ${ARTIFACTS_BUCKET_NAME}"

# Create AWS ECR repository (if it doesn't exist)
echo "Checking ECR repository..."
aws ecr describe-repositories --repository-names ${ECR_REPOSITORY_NAME} --region ${AWS_REGION} || \
aws ecr create-repository --repository-name ${ECR_REPOSITORY_NAME} --region ${AWS_REGION} && \
echo "Created ECR repository: ${ECR_REPOSITORY_NAME}"

# Get ECR repository URI
ECR_REPOSITORY_URI=$(aws ecr describe-repositories --repository-names ${ECR_REPOSITORY_NAME} --region ${AWS_REGION} --query 'repositories[0].repositoryUri' --output text)

# Login to ECR
echo "Logging in to ECR..."
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REPOSITORY_URI}

# Build and push Docker image
echo "Building and pushing Docker image..."
docker build -t ${ECR_REPOSITORY_NAME}:latest -f docker/Dockerfile .
docker tag ${ECR_REPOSITORY_NAME}:latest ${ECR_REPOSITORY_URI}:latest
docker push ${ECR_REPOSITORY_URI}:latest

echo "Docker image pushed to ECR: ${ECR_REPOSITORY_URI}:latest"

# Create ECS cluster (if it doesn't exist)
echo "Checking ECS cluster..."
aws ecs describe-clusters --clusters ${ECS_CLUSTER_NAME} --region ${AWS_REGION} || \
aws ecs create-cluster --cluster-name ${ECS_CLUSTER_NAME} --capacity-providers FARGATE --region ${AWS_REGION} && \
echo "Created ECS cluster: ${ECS_CLUSTER_NAME}"

# Create temp directory for processed files
TEMP_DIR=$(mktemp -d)

# Update task definition files (substitute environment variables)
echo "Updating task definitions..."
cp aws/ecs/task-definition.json ${TEMP_DIR}/
cp aws/ecs/artifacts-upload-task-definition.json ${TEMP_DIR}/
cp aws/step-functions/dbt-workflow.json ${TEMP_DIR}/

# 環境変数を置換
for file in ${TEMP_DIR}/*.json; do
  sed -i '' "s|\${ECR_REPOSITORY_URI}|${ECR_REPOSITORY_URI}|g" ${file}
  sed -i '' "s|\${AWS_REGION}|${AWS_REGION}|g" ${file}
  sed -i '' "s|\${ENVIRONMENT}|${ENVIRONMENT}|g" ${file}
  sed -i '' "s|\${ARTIFACTS_BUCKET_NAME}|${ARTIFACTS_BUCKET_NAME}|g" ${file}
done

# Register task definitions
echo "Registering task definitions..."
aws ecs register-task-definition --cli-input-json file://${TEMP_DIR}/task-definition.json --region ${AWS_REGION}
aws ecs register-task-definition --cli-input-json file://${TEMP_DIR}/artifacts-upload-task-definition.json --region ${AWS_REGION}

# Deploy Step Functions state machine
echo "Deploying Step Functions state machine..."
STATE_MACHINE_ARN="arn:aws:states:${AWS_REGION}:$(aws sts get-caller-identity --query 'Account' --output text):stateMachine:DBT-Snowflake-Workflow"

# Check if the state machine already exists
if aws stepfunctions describe-state-machine --state-machine-arn "${STATE_MACHINE_ARN}" --region ${AWS_REGION} 2>/dev/null; then
  echo "Updating existing state machine..."
  aws stepfunctions update-state-machine \
     --state-machine-arn "${STATE_MACHINE_ARN}" \
     --definition file://${TEMP_DIR}/dbt-workflow.json \
     --role-arn "arn:aws:iam::$(aws sts get-caller-identity --query 'Account' --output text):role/StepFunctionsServiceRole" \
     --region ${AWS_REGION}
else
  echo "Creating new state machine..."
  aws stepfunctions create-state-machine \
    --name "DBT-Snowflake-Workflow" \
    --definition file://${TEMP_DIR}/dbt-workflow.json \
    --role-arn "arn:aws:iam::$(aws sts get-caller-identity --query 'Account' --output text):role/StepFunctionsServiceRole" \
    --region ${AWS_REGION} \
    --type STANDARD
fi

# Clean up temporary directory
rm -rf ${TEMP_DIR}

echo "--------------------------------------"
echo "Deployment completed!"
echo "--------------------------------------"
echo "ECS Cluster: ${ECS_CLUSTER_NAME}"
echo "Docker Image: ${ECR_REPOSITORY_URI}:latest"
echo "Environment: ${ENVIRONMENT}"
echo "Artifacts Bucket: ${ARTIFACTS_BUCKET_NAME}"
echo ""
echo "To manually start the workflow:"
echo "aws stepfunctions start-execution --state-machine-arn ${STATE_MACHINE_ARN} --region ${AWS_REGION}"
echo "--------------------------------------"
