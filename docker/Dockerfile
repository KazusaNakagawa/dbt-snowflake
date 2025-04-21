FROM python:3.12-slim

WORKDIR /usr/src/app

# Install system dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    git \
    ssh \
    curl \
    ca-certificates \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Set environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DBT_PROFILES_DIR=/usr/src/app/dbt/profiles

# Install dbt and Snowflake adapter with specific versions for stability
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir dbt-core~=1.7.0 dbt-snowflake~=1.7.0 boto3

# Copy only the dbt project files (not the entire directory)
COPY dbt/ /usr/src/app/dbt/

# Create directory for logs
RUN mkdir -p /usr/src/app/logs

# Set working directory to dbt project
WORKDIR /usr/src/app/dbt

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
  CMD dbt --version || exit 1

# Default command - can be overridden by ECS task or command line
ENTRYPOINT ["dbt"]
CMD ["run", "--profiles-dir", "/usr/src/app/dbt/profiles"]
