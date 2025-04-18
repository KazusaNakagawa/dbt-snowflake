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
