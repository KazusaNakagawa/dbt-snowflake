# DBT Snowflake ETL Pipeline

🔸 T.B.D
This project integrates dbt (data build tool) with Snowflake running on AWS infrastructure (ECS, Step Functions) using Docker containers.

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
   DBT_PROFILES_DIR=/usr/src/app/dbt/profiles
   DBT_SNOWFLAKE_ACCOUNT=your_account_identifier  # Without snowflakecomputing.com
   DBT_SNOWFLAKE_USER=your_user
   DBT_SNOWFLAKE_PASSWORD=your_password
   DBT_SNOWFLAKE_ROLE=your_role
   DBT_SNOWFLAKE_DATABASE=your_database
   DBT_SNOWFLAKE_WAREHOUSE=your_warehouse
   DBT_SNOWFLAKE_SCHEMA=your_schema
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
   ```bash
   docker-compose up
   ```
   or
   ```bash
   ./scripts/run_locally.sh run
   ```

3. dbt Command Reference:

   The `run_locally.sh` script supports various dbt commands:
   ```bash
   # Run all models
   ./scripts/run_locally.sh run
   
   # Compile models without running
   ./scripts/run_locally.sh compile
   
   # Test models
   ./scripts/run_locally.sh test
   
   # Generate and serve documentation
   ./scripts/run_locally.sh docs generate
   <!-- ./scripts/run_locally.sh docs serve -->
   
   # Debug
   ./scripts/run_locally.sh debug
   ```

4. Viewing the Results:
   - SQL compiled models are available in the `target/compiled/` directory
   - Run results are in `target/run_results.json`
   - Documentation is served at http://localhost:8080 when using `docs serve`

### Understanding Snowflake Components

- **Account**: Your Snowflake identifier (`account_name` in `account_name.snowflakecomputing.com`)
- **Warehouse**: The compute resource that executes SQL queries (not storage)
- **Database**: Where tables and views are stored
- **Schema**: Logical grouping of tables and views within a database
- **Role**: Security role that determines access permissions

### Deployment

1. Update AWS region and account IDs in the AWS resource files:
   - Update `aws/ecs/task-definition.json` with your container details
   - Update IAM roles in `aws/iam/` directory
   - Configure the state machine in `aws/step-functions/dbt-workflow.json`

2. Run the deployment script:
   ```bash
   ./deploy.sh
   ```

3. Monitor the deployment in the AWS Management Console.

## Project Structure

- `dbt/`: DBT project files
  - `models/`: DBT SQL models
    - `staging/`: Initial transformations from raw data
    - `marts/core/`: Business-specific transformations
  - `profiles/`: Contains Snowflake connection profiles
  - `target/`: Generated artifacts and compiled SQL
- `aws/`: AWS infrastructure definitions
  - `ecs/`: AWS ECS configurations
  - `iam/`: IAM roles and policies
  - `step-functions/`: AWS Step Functions workflow definitions
- `docker/`: Docker configuration
- `scripts/`: Utility scripts

## Data Model

The project uses a simple star schema:
- `dim_customers`: Customer dimension table
- `fct_orders`: Order fact table
- `stg_*`: Staging tables that clean and prepare source data

## Troubleshooting

- **Warehouse Errors**: Ensure the specified warehouse exists in your Snowflake account
- **Authentication Errors**: Check credentials and consider key pair authentication for MFA
- **Permission Errors**: Ensure your role has appropriate permissions to create objects in the target database
- **Schema Errors**: Cannot create views in shared databases like SNOWFLAKE_SAMPLE_DATA; use your own database
- **Container Issues**: If Docker fails to build, try:
  ```bash
  docker-compose down
  docker-compose build --no-cache
  docker-compose up
  ```

## Running the Pipeline

The pipeline can be triggered through:

1. **AWS Step Functions console**: Navigate to the deployed state machine and click "Start execution"
2. **AWS CLI**:
   ```bash
   aws stepfunctions start-execution \
     --state-machine-arn arn:aws:states:${AWS_REGION}:${AWS_ACCOUNT}:stateMachine:DbtWorkflow \
     --input '{"environment": "production"}'
   ```
3. **Programmatically**: Use AWS SDK in your application to trigger the workflow

## Contributing

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

*Last updated: April 21, 2025*
