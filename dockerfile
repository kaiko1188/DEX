# ベースイメージとして公式のPythonイメージを使用
FROM python:3.12

# 環境変数を設定
ENV PYTHONDONTWRITEBYTECODE 1
ENV PYTHONUNBUFFERED 1

# 作業ディレクトリを作成
WORKDIR /code

# システムパッケージのインストール
RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    default-mysql-client \
    && rm -rf /var/lib/apt/lists/*

# Pythonパッケージのインストール
COPY requirements.txt /code/
RUN pip install --no-cache-dir -r requirements.txt

# アプリケーションコードのコピー
COPY . /code/

# エントリポイントシェルスクリプトを実行可能にする
RUN chmod +x /code/entrypoint.sh

ENTRYPOINT ["/code/entrypoint.sh"]
