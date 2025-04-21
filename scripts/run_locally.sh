#!/bin/bash
# Script to run dbt commands locally through Docker
# 
# Usage: ./scripts/run_locally.sh [dbt command]
# Examples:
#   ./scripts/run_locally.sh run
#   ./scripts/run_locally.sh test
#   ./scripts/run_locally.sh compile
#   ./scripts/run_locally.sh docs generate
#     When browser security restrictions may be involved.
#     cd ./target && python -m http.server 8000

set -e

# Load environment variables from .env file if it exists
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check if any command was provided
if [ -z "$1" ]; then
    echo "Error: No dbt command specified"
    echo "Usage: $0 [dbt command]"
    echo "Examples:"
    echo "  $0 run"
    echo "  $0 test"
    echo "  $0 compile"
    exit 1
fi

echo "Running dbt command: $@"

# Use docker-compose to run dbt commands with the correct project directory
docker-compose run --rm dbt $@ \
    --project-dir /usr/src/app/dbt \
    --profiles-dir /usr/src/app/dbt/profiles

echo "Local dbt command completed successfully!"
