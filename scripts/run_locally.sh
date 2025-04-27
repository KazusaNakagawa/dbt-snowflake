#!/bin/bash
# Script to run dbt commands locally through Docker
# 
# Usage: ./scripts/run_locally.sh [dbt command]
# Examples:
#   ./scripts/run_locally.sh run
#   ./scripts/run_locally.sh test
#   ./scripts/run_locally.sh compile
#   ./scripts/run_locally.sh docs generate
#   ./scripts/run_locally.sh docs serve  # Run documentation server locally

set -e

# Change to the project root directory
cd "$(dirname "$0")/.."

# Improved environment variable loading method
if [ -f .env ]; then
    # Process file line by line, skipping comments and empty lines
    while IFS= read -r line || [ -n "$line" ]; do
        # Skip comment lines and empty lines
        if [[ ! $line =~ ^[[:space:]]*# && -n $line ]]; then
            # Export the line as an environment variable
            export "$line"
        fi
    done < .env
    echo "Environment variables loaded successfully"
else
    echo "Warning: .env file not found. Using default environment variables."
    # If .env file doesn't exist, create one from .env.example
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "Created .env file from .env.example. Please update with your settings."
    fi
fi

# Create logs directory if it doesn't exist
mkdir -p logs

# Check if a command was provided
if [ -z "$1" ]; then
    echo "Error: No dbt command specified"
    echo "Usage: $0 [dbt command]"
    echo "Examples:"
    echo "  $0 run                # Run models"
    echo "  $0 test               # Run tests"
    echo "  $0 compile            # Compile SQL only"
    echo "  $0 debug              # Test connection"
    echo "  $0 docs generate      # Generate documentation"
    echo "  $0 docs serve         # Start documentation server"
    exit 1
fi

echo "Running dbt command: $@"

# Special case for documentation server
if [ "$1" = "docs" ] && [ "$2" = "serve" ]; then
    echo "Starting dbt documentation server..."
    docker-compose -f docker-compose.local.yml run \
        --rm -p 8080:8080 dbt docs generate --project-dir /usr/src/app/dbt --profiles-dir /usr/src/app/dbt/profiles
    docker-compose -f docker-compose.local.yml run \
        --rm -p 8080:8080 dbt docs serve --project-dir /usr/src/app/dbt --profiles-dir /usr/src/app/dbt/profiles --port 8080 --host 0.0.0.0
else
    # Normal dbt command execution
    docker-compose -f docker-compose.local.yml run \
        --rm dbt $@ \
        --project-dir /usr/src/app/dbt \
        --profiles-dir /usr/src/app/dbt/profiles
fi

echo "✅ dbt command completed successfully!"
