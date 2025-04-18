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
