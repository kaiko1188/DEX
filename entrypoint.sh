#!/bin/bash

# プロジェクトディレクトリが存在しない場合、Djangoプロジェクトを作成
if [ ! -f manage.py ]; then
    django-admin startproject myproject .
    mkdir -p myproject/static myproject/templates
fi

# マイグレーションを実行
python manage.py migrate

# スーパーユーザーを自動作成（存在しない場合）
echo "from django.contrib.auth.models import User; User.objects.filter(username='admin').exists() or User.objects.create_superuser('admin', 'admin@example.com', 'adminpassword')" | python manage.py shell

# 開発サーバーを起動
exec "$@"
