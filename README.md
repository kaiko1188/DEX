# Dapps Django Kit セットアップガイド

このガイドでは、Dapps Django Kit環境のセットアップ方法を説明します。

## 前提条件

- Docker
- Docker Compose

## セットアップ手順

### 1. リポジトリのクローン

```bash
git clone https://github.com/Kosuke-Mega/DEX_MetaverseCollage.git
cd DEX_MetaverseCollage
```

### 2. Dockerコンテナのビルドと起動
Dockerコンテナをビルドして起動します：

```bash
docker-compose up --build
```

### 3. スーパーユーザーの作成
Djangoのスーパーユーザーを作成します：

```bash
docker-compose exec web python manage.py createsuperuser
```

### 4. 生成されているDockerコンテナの起動
生成されているDockerコンテナを起動します：

```bash
docker-compose up -d
```

### 5. アプリケーションにアクセス
アプリケーションは `http://localhost:8000` でアクセス可能です。

# 追加コマンド
## データベースのマイグレーション
マイグレーションを適用する場合：

```bash
docker-compose exec web python manage.py migrate
```

## 新しいPythonパッケージのインストール
新しいPythonパッケージを追加するには、 requirements.txt を更新し、Dockerイメージを再ビルドします：

```bash
docker-compose up --build
```

# ファイル構成
- docker-compose.yml: Docker Composeの設定
- Dockerfile: Webサービス用のDocker設定
- entrypoint.sh: Djangoの初期化用エントリポイントスクリプト
- myproject/: Djangoプロジェクトディレクトリ
- requirements.txt: Python依存関係



このガイドを使用して、Dapps Django Kit環境をセットアップしてください。
