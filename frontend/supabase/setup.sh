#!/bin/bash
# Supabase 本地启动脚本

echo "🚀 启动本地 Supabase..."

# 启动 Docker 容器
docker compose -f supabase/docker-compose.yml up -d

echo "⏳ 等待 Supabase 启动..."
sleep 10

echo "✅ Supabase 已启动!"
echo ""
echo "📋 访问地址:"
echo "   - API:        http://localhost:54321"
echo "   - Studio:     http://localhost:54323"
echo "   - PostgREST:  http://localhost:54321/rest/v1/"
echo "   - DB:         postgresql://postgres:postgres@localhost:54322/postgres"
echo ""
echo "🔑 ANON KEY:"
echo "   eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN1cGFiYXNlIiwicm9sZSI6ImFub24iLCJpYXQiOjE2NDUxOTIwMDAsImV4cCI6MTk2MDc2ODAwMH0.CRXP1A7WOeoJeXxjNni43kdQwgnWTRe1YDajsjpip9Y"
echo ""
echo "📝 下一步:"
echo "   1. 打开 http://localhost:54323 进入 Studio"
echo "   2. 在 SQL Editor 中运行 migrations/001_initial.sql"
echo "   3. 或者使用 Supabase CLI: supabase db push"
