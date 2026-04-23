#!/bin/bash
git init

cat <<EOF > .gitignore
node_modules/
dist/
.env
venv/
__pycache__/
clickhouse_data/
chroma_data/
EOF

git add .
git commit -m "chore: Enterprise v5.0 Observability Platform initialization"
echo "Repository initialized successfully!"
