FROM --platform=linux/amd64 python:3.12.1-slim-bookworm

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
# NOTE: lower versions
#    messagetodict () got an unexpected keyword argument including_default_value_fields
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir \
    dbt-core==1.4.7 \
    dbt-snowflake==1.4.5 \
    boto3==1.34.11 \
    protobuf==3.20.3

# Copy only the dbt project files (not the entire directory)
COPY dbt/ /usr/src/app/dbt/
COPY .ssh/ /usr/src/app/.ssh/

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
