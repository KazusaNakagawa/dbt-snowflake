#!/bin/bash
set -e

# Configuration variables
AWS_REGION="us-east-1"
ECR_REPOSITORY_NAME="dbt-snowflake"
ECS_CLUSTER_NAME="dbt-cluster"
STACK_NAME="dbt-snowflake-stack"

# Create AWS ECR repository (if it doesn't exist)
aws ecr describe-repositories --repository-names ${ECR_REPOSITORY_NAME} --region ${AWS_REGION} || \
aws ecr create-repository --repository-name ${ECR_REPOSITORY_NAME} --region ${AWS_REGION}

# Get ECR repository URI
ECR_REPOSITORY_URI=$(aws ecr describe-repositories --repository-names ${ECR_REPOSITORY_NAME} --region ${AWS_REGION} --query 'repositories[0].repositoryUri' --output text)

# Login to ECR
aws ecr get-login-password --region ${AWS_REGION} | docker login --username AWS --password-stdin ${ECR_REPOSITORY_URI}

# Build and push Docker image
docker build -t ${ECR_REPOSITORY_NAME}:latest .
docker tag ${ECR_REPOSITORY_NAME}:latest ${ECR_REPOSITORY_URI}:latest
docker push ${ECR_REPOSITORY_URI}:latest

echo "Docker image pushed to ECR: ${ECR_REPOSITORY_URI}:latest"

# Create ECS cluster (if it doesn't exist)
aws ecs describe-clusters --clusters ${ECS_CLUSTER_NAME} --region ${AWS_REGION} || \
aws ecs create-cluster --cluster-name ${ECS_CLUSTER_NAME} --region ${AWS_REGION}

# Update task definition file (substitute environment variables)
sed -i '' "s|\${ECR_REPOSITORY_URI}|${ECR_REPOSITORY_URI}|g" ecs/task-definition.json
sed -i '' "s|\${AWS_REGION}|${AWS_REGION}|g" ecs/task-definition.json

# Register task definition
aws ecs register-task-definition --cli-input-json file://ecs/task-definition.json --region ${AWS_REGION}

# Update Step Functions state machine definition
sed -i '' "s|\${AWS_REGION}|${AWS_REGION}|g" step-functions/dbt-workflow.json

# Deploy Step Functions state machine
aws stepfunctions create-state-machine \
  --name "DBT-Snowflake-Workflow" \
  --definition file://step-functions/dbt-workflow.json \
  --role-arn "arn:aws:iam::123456789012:role/StepFunctionsServiceRole" \
  --region ${AWS_REGION} \
  --type STANDARD \
  || aws stepfunctions update-state-machine \
     --state-machine-arn "arn:aws:states:${AWS_REGION}:123456789012:stateMachine:DBT-Snowflake-Workflow" \
     --definition file://step-functions/dbt-workflow.json \
     --role-arn "arn:aws:iam::123456789012:role/StepFunctionsServiceRole" \
     --region ${AWS_REGION}

echo "Deployment completed!"
