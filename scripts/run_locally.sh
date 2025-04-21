#!/bin/bash
# Script to run dbt commands locally through Docker
# 
# Usage: ./scripts/run_locally.sh [dbt command]
# Examples:
#   ./scripts/run_locally.sh run
#   ./scripts/run_locally.sh test
#   ./scripts/run_locally.sh compile
#   ./scripts/run_locally.sh docs generate
#   ./scripts/run_locally.sh docs serve  # ドキュメントをローカルで表示

set -e

# プロジェクトのルートディレクトリに移動
cd "$(dirname "$0")/.."

# Load environment variables from .env file if it exists
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
else
    echo "Warning: .env file not found. Using default environment variables."
    # .envファイルがなければ.env.exampleからコピーを作成
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "Created .env file from .env.example. Please update with your settings."
    fi
fi

# ログディレクトリが存在しない場合は作成
mkdir -p logs

# Check if any command was provided
if [ -z "$1" ]; then
    echo "Error: No dbt command specified"
    echo "Usage: $0 [dbt command]"
    echo "Examples:"
    echo "  $0 run                # モデルを実行"
    echo "  $0 test               # テストを実行"
    echo "  $0 compile            # SQLのコンパイルのみ"
    echo "  $0 debug              # 接続テスト"
    echo "  $0 docs generate      # ドキュメント生成"
    echo "  $0 docs serve         # ドキュメントサーバーを起動"
    exit 1
fi

echo "Running dbt command: $@"

# ドキュメントサーバーを起動する特別なケース
if [ "$1" = "docs" ] && [ "$2" = "serve" ]; then
    echo "Starting dbt docs server..."
    docker-compose run --rm -p 8080:8080 dbt docs generate --project-dir /usr/src/app/dbt --profiles-dir /usr/src/app/dbt/profiles
    docker-compose run --rm -p 8080:8080 dbt docs serve --project-dir /usr/src/app/dbt --profiles-dir /usr/src/app/dbt/profiles --port 8080 --host 0.0.0.0
else
    # 通常のdbtコマンド実行
    docker-compose run --rm dbt $@ \
        --project-dir /usr/src/app/dbt \
        --profiles-dir /usr/src/app/dbt/profiles
fi

echo "✅ Local dbt command completed successfully!"
