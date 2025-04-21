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
   DBT_PROFILES_DIR=/usr/src/app/profiles
   DBT_SNOWFLAKE_ACCOUNT=your_account_identifier  # Without snowflakecomputing.com
   DBT_SNOWFLAKE_USER=your_user
   DBT_SNOWFLAKE_PASSWORD=your_password
   DBT_SNOWFLAKE_ROLE=ACCOUNTADMIN  # Or another role with appropriate permissions
   DBT_SNOWFLAKE_DATABASE=MY_DBT_DB  # Your writable database, not SNOWFLAKE_SAMPLE_DATA
   DBT_SNOWFLAKE_WAREHOUSE=TRANSFORMING  # Must exist in your Snowflake account
   DBT_SNOWFLAKE_SCHEMA=TPCH_SF1
   ```

   **Important Notes**:
   - For the `DBT_SNOWFLAKE_ACCOUNT` value, only use the account identifier without the `.snowflakecomputing.com` domain
   - If MFA is enabled, you may need to set up key pair authentication:
     ```
     # Generate keys (no passphrase)
     openssl genrsa 2048 | openssl pkcs8 -topk8 -inform PEM -out rsa_key.p8 -nocrypt
     openssl rsa -in rsa_key.p8 -pubout -out rsa_key.pub
     
     # Register in Snowflake with SQL
     ALTER USER your_user SET RSA_PUBLIC_KEY='contents_of_rsa_key.pub';
     
     # Then update profiles.yml to use private_key_path instead of password
     ```

2. Run dbt commands locally:
   ```
   docker-compose up
   ```
   or
   ```
   ./scripts/run_locally.sh run
   ```

3. dbt CMD docs

   read ``./scripts/run_locally.sh`` doc string

### Understanding Snowflake Components

- **Account**: Your Snowflake identifier (`account_name` in `account_name.snowflakecomputing.com`)
- **Warehouse**: The compute resource that executes SQL queries (not storage)
- **Database**: Where tables and views are stored
- **Schema**: Logical grouping of tables and views within a database
- **Role**: Security role that determines access permissions

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

## Troubleshooting

- **Warehouse Errors**: Ensure the specified warehouse exists in your Snowflake account
- **Authentication Errors**: Check credentials and consider key pair authentication for MFA
- **Permission Errors**: Ensure your role has appropriate permissions to create objects in the target database
- **Schema Errors**: Cannot create views in shared databases like SNOWFLAKE_SAMPLE_DATA; use your own database

## Running the Pipeline

The pipeline can be triggered through AWS Step Functions console or API.
