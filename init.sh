#!/bin/bash
# filepath: /Users/kazusa/code/dbt-snowflake/setup_project.sh

set -e

# Base directory
BASE_DIR="/Users/kazusa/code/dbt-snowflake"

# Create main directories
echo "Creating directory structure..."
mkdir -p ${BASE_DIR}/{models/{staging,marts/{core,marketing}},macros,profiles,seeds,tests,ecs,step-functions,iam,scripts}

# Create Dockerfile
cat > ${BASE_DIR}/Dockerfile << 'EOF'
FROM python:3.12-slim

WORKDIR /usr/src/app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    git \
    ssh \
    && rm -rf /var/lib/apt/lists/*

# Install dbt and Snowflake adapter
RUN pip install --no-cache-dir dbt-core dbt-snowflake

# Copy dbt project files
COPY . .

# Default command
ENTRYPOINT ["dbt"]
CMD ["run", "--profiles-dir", "/usr/src/app/profiles"]
EOF

# Create dbt_project.yml
cat > ${BASE_DIR}/dbt_project.yml << 'EOF'
name: 'snowflake_transformations'
version: '1.0.0'
config-version: 2

profile: 'dbt_snowflake'

model-paths: ["models"]
analysis-paths: ["analyses"]
test-paths: ["tests"]
seed-paths: ["seeds"]
macro-paths: ["macros"]
snapshot-paths: ["snapshots"]

target-path: "target"
clean-targets:
  - "target"
  - "dbt_packages"

models:
  snowflake_transformations:
    staging:
      +materialized: view
    marts:
      +materialized: table
EOF

# Create profiles.yml
mkdir -p ${BASE_DIR}/profiles
cat > ${BASE_DIR}/profiles/profiles.yml << 'EOF'
dbt_snowflake:
  target: dev
  outputs:
    dev:
      type: snowflake
      account: "{{ env_var('DBT_SNOWFLAKE_ACCOUNT') }}"
      user: "{{ env_var('DBT_SNOWFLAKE_USER') }}"
      password: "{{ env_var('DBT_SNOWFLAKE_PASSWORD') }}"
      role: "{{ env_var('DBT_SNOWFLAKE_ROLE', 'TRANSFORMER') }}"
      database: "{{ env_var('DBT_SNOWFLAKE_DATABASE', 'ANALYTICS') }}"
      warehouse: "{{ env_var('DBT_SNOWFLAKE_WAREHOUSE', 'TRANSFORMING') }}"
      schema: "{{ env_var('DBT_SNOWFLAKE_SCHEMA', 'DBT_TRANSFORMATIONS') }}"
      threads: 4
EOF

# Create sample model files
cat > ${BASE_DIR}/models/staging/stg_customers.sql << 'EOF'
{{
    config(
        materialized='view'
    )
}}

SELECT 
    customer_id,
    first_name,
    last_name,
    email
FROM raw.customers
EOF

cat > ${BASE_DIR}/models/staging/stg_orders.sql << 'EOF'
{{
    config(
        materialized='view'
    )
}}

SELECT 
    order_id,
    customer_id,
    order_date,
    status
FROM raw.orders
EOF

cat > ${BASE_DIR}/models/staging/stg_products.sql << 'EOF'
{{
    config(
        materialized='view'
    )
}}

SELECT 
    product_id,
    product_name,
    price,
    category
FROM raw.products
EOF

cat > ${BASE_DIR}/models/staging/schema.yml << 'EOF'
version: 2

models:
  - name: stg_customers
    description: Staged customer data
    columns:
      - name: customer_id
        description: Primary key
        tests:
          - unique
          - not_null
      - name: email
        description: Customer email address
        tests:
          - not_null
  
  - name: stg_orders
    description: Staged order data
    columns:
      - name: order_id
        description: Primary key
        tests:
          - unique
          - not_null
      - name: customer_id
        description: Foreign key to customers
        tests:
          - relationships:
              to: ref('stg_customers')
              field: customer_id
  
  - name: stg_products
    description: Staged product data
    columns:
      - name: product_id
        description: Primary key
        tests:
          - unique
          - not_null
EOF

cat > ${BASE_DIR}/models/marts/core/dim_customers.sql << 'EOF'
{{
    config(
        materialized='table'
    )
}}

SELECT 
    c.customer_id,
    c.first_name,
    c.last_name,
    c.email,
    COUNT(DISTINCT o.order_id) as order_count
FROM {{ ref('stg_customers') }} c
LEFT JOIN {{ ref('stg_orders') }} o ON c.customer_id = o.customer_id
GROUP BY 1, 2, 3, 4
EOF

cat > ${BASE_DIR}/models/marts/core/fct_orders.sql << 'EOF'
{{
    config(
        materialized='table'
    )
}}

SELECT 
    o.order_id,
    o.customer_id,
    o.order_date,
    o.status,
    p.product_id,
    p.price as unit_price,
    oi.quantity,
    oi.quantity * p.price as total_amount
FROM {{ ref('stg_orders') }} o
JOIN raw.order_items oi ON o.order_id = oi.order_id
JOIN {{ ref('stg_products') }} p ON oi.product_id = p.product_id
EOF

# Create AWS ECS task definition
cat > ${BASE_DIR}/ecs/task-definition.json << 'EOF'
{
  "family": "dbt-task",
  "executionRoleArn": "arn:aws:iam::123456789012:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::123456789012:role/dbtTaskRole",
  "networkMode": "awsvpc",
  "containerDefinitions": [
    {
      "name": "dbt-container",
      "image": "${ECR_REPOSITORY_URI}:latest",
      "essential": true,
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/dbt-tasks",
          "awslogs-region": "${AWS_REGION}",
          "awslogs-stream-prefix": "dbt"
        }
      },
      "secrets": [
        {
          "name": "DBT_SNOWFLAKE_ACCOUNT",
          "valueFrom": "arn:aws:ssm:${AWS_REGION}:123456789012:parameter/dbt/snowflake/account"
        },
        {
          "name": "DBT_SNOWFLAKE_USER",
          "valueFrom": "arn:aws:ssm:${AWS_REGION}:123456789012:parameter/dbt/snowflake/user"
        },
        {
          "name": "DBT_SNOWFLAKE_PASSWORD",
          "valueFrom": "arn:aws:ssm:${AWS_REGION}:123456789012:parameter/dbt/snowflake/password"
        },
        {
          "name": "DBT_SNOWFLAKE_ROLE",
          "valueFrom": "arn:aws:ssm:${AWS_REGION}:123456789012:parameter/dbt/snowflake/role"
        }
      ],
      "cpu": 1024,
      "memory": 2048
    }
  ],
  "requiresCompatibilities": [
    "FARGATE"
  ],
  "cpu": "1024",
  "memory": "2048"
}
EOF

# Create Step Functions workflow
cat > ${BASE_DIR}/step-functions/dbt-workflow.json << 'EOF'
{
  "Comment": "DBT Transformation Workflow",
  "StartAt": "DBT Run",
  "States": {
    "DBT Run": {
      "Type": "Task",
      "Resource": "arn:aws:states:::ecs:runTask.sync",
      "Parameters": {
        "LaunchType": "FARGATE",
        "Cluster": "dbt-cluster",
        "TaskDefinition": "dbt-task",
        "NetworkConfiguration": {
          "AwsvpcConfiguration": {
            "Subnets": ["subnet-12345", "subnet-67890"],
            "SecurityGroups": ["sg-12345"],
            "AssignPublicIp": "ENABLED"
          }
        },
        "Overrides": {
          "ContainerOverrides": [
            {
              "Name": "dbt-container",
              "Command": ["run"]
            }
          ]
        }
      },
      "Next": "DBT Test",
      "Catch": [
        {
          "ErrorEquals": ["States.ALL"],
          "Next": "Notify Failure"
        }
      ]
    },
    "DBT Test": {
      "Type": "Task",
      "Resource": "arn:aws:states:::ecs:runTask.sync",
      "Parameters": {
        "LaunchType": "FARGATE",
        "Cluster": "dbt-cluster",
        "TaskDefinition": "dbt-task",
        "NetworkConfiguration": {
          "AwsvpcConfiguration": {
            "Subnets": ["subnet-12345", "subnet-67890"],
            "SecurityGroups": ["sg-12345"],
            "AssignPublicIp": "ENABLED"
          }
        },
        "Overrides": {
          "ContainerOverrides": [
            {
              "Name": "dbt-container",
              "Command": ["test"]
            }
          ]
        }
      },
      "Next": "Success Notification",
      "Catch": [
        {
          "ErrorEquals": ["States.ALL"],
          "Next": "Notify Failure"
        }
      ]
    },
    "Success Notification": {
      "Type": "Task",
      "Resource": "arn:aws:states:::sns:publish",
      "Parameters": {
        "TopicArn": "arn:aws:sns:${AWS_REGION}:123456789012:dbt-notifications",
        "Message": "DBT workflow completed successfully!"
      },
      "End": true
    },
    "Notify Failure": {
      "Type": "Task",
      "Resource": "arn:aws:states:::sns:publish",
      "Parameters": {
        "TopicArn": "arn:aws:sns:${AWS_REGION}:123456789012:dbt-notifications",
        "Message": "DBT workflow failed. Please check the logs."
      },
      "End": true
    }
  }
}
EOF

# Create IAM policy files
cat > ${BASE_DIR}/iam/ecs-task-role.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameters",
        "secretsmanager:GetSecretValue",
        "logs:CreateLogStream",
        "logs:PutLogEvents"
      ],
      "Resource": "*"
    }
  ]
}
EOF

cat > ${BASE_DIR}/iam/step-functions-role.json << 'EOF'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ecs:RunTask",
        "ecs:StopTask",
        "ecs:DescribeTasks",
        "iam:PassRole",
        "sns:Publish"
      ],
      "Resource": "*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "events:PutTargets",
        "events:PutRule",
        "events:DescribeRule"
      ],
      "Resource": "arn:aws:events:*:*:rule/StepFunctionsGetEventsForECSTaskRule"
    }
  ]
}
EOF

# Create deployment script
cat > ${BASE_DIR}/deploy.sh << 'EOF'
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
EOF

# Create utility scripts
cat > ${BASE_DIR}/scripts/run_locally.sh << 'EOF'
#!/bin/bash
# Script to run dbt commands locally

set -e

# Load environment variables from .env file if it exists
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Use docker-compose to run dbt commands
docker-compose run --rm dbt $@

echo "Local dbt command completed!"
EOF

# Create docker-compose.yml for local development
cat > ${BASE_DIR}/docker-compose.yml << 'EOF'
version: '3'
services:
  dbt:
    build:
      context: .
      dockerfile: Dockerfile
    volumes:
      - .:/usr/src/app
    env_file:
      - .env
    working_dir: /usr/src/app
EOF

# Create README.md
cat > ${BASE_DIR}/README.md << 'EOF'
# DBT Snowflake ETL Pipeline

This project integrates dbt with Snowflake running on AWS infrastructure (ECS, Step Functions) using Docker containers.

## Architecture Overview

1. **DBT Containers**: Snowflake transformation logic containerized with Docker
2. **AWS ECS**: Container execution environment
3. **AWS Step Functions**: Workflow orchestration
4. **Snowflake**: Data warehouse platform

## Getting Started

### Prerequisites

- AWS CLI configured
- Docker and Docker Compose installed
- Snowflake account

### Local Development

1. Create a `.env` file with your Snowflake credentials:
   ```
   DBT_SNOWFLAKE_ACCOUNT=your_account
   DBT_SNOWFLAKE_USER=your_user
   DBT_SNOWFLAKE_PASSWORD=your_password
   DBT_SNOWFLAKE_ROLE=your_role
   DBT_SNOWFLAKE_DATABASE=your_database
   DBT_SNOWFLAKE_WAREHOUSE=your_warehouse
   DBT_SNOWFLAKE_SCHEMA=your_schema
   ```

2. Run dbt commands locally:
   ```
   ./scripts/run_locally.sh run
   ```

### Deployment

1. Update AWS region and account IDs in the scripts
2. Run the deployment script:
   ```
   ./deploy.sh
   ```

## Project Structure

- `models/`: DBT SQL models
  - `staging/`: Initial transformations from raw data
  - `marts/`: Business-specific transformations
- `macros/`: Reusable SQL functions
- `tests/`: Custom test definitions
- `seeds/`: Static data in CSV format
- `ecs/`: AWS ECS configurations
- `step-functions/`: AWS Step Functions workflow definitions

## Running the Pipeline

The pipeline can be triggered through AWS Step Functions console or API.
EOF

# Create .gitignore
cat > ${BASE_DIR}/.gitignore << 'EOF'
# DBT specific
target/
dbt_modules/
dbt_packages/
logs/

# Environment variables
.env
.env.*

# Python
__pycache__/
*.py[cod]
*$py.class
*.so
.Python
build/
develop-eggs/
dist/
downloads/
eggs/
.eggs/
lib/
lib64/
parts/
sdist/
var/
wheels/
*.egg-info/
.installed.cfg
*.egg

# Docker
.docker/

# Local development
.idea/
.vscode/
.DS_Store
EOF

# Make scripts executable
chmod +x ${BASE_DIR}/deploy.sh
chmod +x ${BASE_DIR}/scripts/run_locally.sh
chmod +x ${BASE_DIR}/setup_project.sh

echo "✨ プロジェクト構成の作成が完了しました！"
echo "以下のコマンドで実行権限を確認してください："
echo "ls -la ${BASE_DIR}/*.sh ${BASE_DIR}/scripts/*.sh"
echo ""
echo "次のステップ："
echo "1. Snowflake接続用の.envファイルを作成してください"
echo "2. AWSリソース用のIAMロールを確認してください"
echo "3. ./deploy.shを実行してAWSリソースをデプロイしてください"

exit 0
EOF

# Make the script executable and run it
chmod +x /Users/kazusa/code/dbt-snowflake/setup_project.sh
echo "⚡ セットアップスクリプトを作成しました！以下のコマンドで実行してください："
echo "cd /Users/kazusa/code/dbt-snowflake && ./setup_project.sh"