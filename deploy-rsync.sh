#!/usr/bin/env bash
set -e

# ================================================================
# 🚀 Janv Native Rsync & Deploy Pipeline
# Architecture: Native Systemd + Rust Axum + Next.js 16 + Redis + Nginx on EC2
# Database: AWS RDS PostgreSQL 16 (ap-south-1)
# ================================================================

export COPYFILE_DISABLE=1

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR"
TERRAFORM_DIR="$ROOT_DIR/terraform"

PUBLIC_IP=$(cd "$TERRAFORM_DIR" && terraform output -raw public_ip)
RDS_ENDPOINT=$(cd "$TERRAFORM_DIR" && terraform output -raw rds_endpoint)
RDS_PORT=$(cd "$TERRAFORM_DIR" && terraform output -raw rds_port)
SSH_KEY="$TERRAFORM_DIR/janv-ec2-key.pem"
chmod 600 "$SSH_KEY"

DB_USER="janv_admin"
DB_PASS="JanvMasterSecurePass2026!"
DB_NAME="janv_db"
DATABASE_URL="postgres://${DB_USER}:${DB_PASS}@${RDS_ENDPOINT}:${RDS_PORT}/${DB_NAME}"

echo "================================================================"
echo "🚀 Starting Rsync & Native Deployment to AWS EC2: $PUBLIC_IP"
echo "🗄️ Database: $RDS_ENDPOINT:$RDS_PORT"
echo "================================================================"

# 1. Clean macOS extended attribute files locally and prepare rsync
echo "📦 Step 1: Syncing project source code via rsync..."
find "$ROOT_DIR/migrations" "$ROOT_DIR/janv-common" "$ROOT_DIR/janv-executor" "$ROOT_DIR/janv-api" "$ROOT_DIR/janv-web-next" -name "._*" -delete || true

rsync -avz --delete -e "ssh -o StrictHostKeyChecking=no -i $SSH_KEY" \
    --exclude='target' \
    --exclude='.git' \
    --exclude='janv-web-next/.next' \
    --exclude='janv-web-next/node_modules' \
    --exclude='.env' \
    --exclude='*.pem' \
    --exclude='._*' \
    --exclude='.DS_Store' \
    --exclude='terraform/.terraform' \
    --exclude='terraform/*.tfstate*' \
    "$ROOT_DIR/Cargo.toml" \
    "$ROOT_DIR/Cargo.lock" \
    "$ROOT_DIR/migrations" \
    "$ROOT_DIR/janv-common" \
    "$ROOT_DIR/janv-executor" \
    "$ROOT_DIR/janv-api" \
    "$ROOT_DIR/janv-web-next" \
    ubuntu@"$PUBLIC_IP":/home/ubuntu/app/

# 2. Configure Environment Variables on EC2
echo "⚙️ Step 2: Configuring environment file & cleaning remote metadata..."
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" ubuntu@"$PUBLIC_IP" bash -c "'
find /home/ubuntu/app -name \"._*\" -delete || true

cat <<EOF > /home/ubuntu/app/.env
DATABASE_URL=$DATABASE_URL
REDIS_URL=redis://127.0.0.1:6379
JWT_SECRET=janv-super-secure-production-jwt-token-key-2026-xyz
SUPER_ADMIN_EMAIL=admin@janv.dev
SUPER_ADMIN_PASSWORD=AdminPass2026!
NODE_ENV=production
PORT=8080
HOST=0.0.0.0
RUST_LOG=janv_api=info,tower_http=info
BACKEND_URL=http://127.0.0.1:8080/api
EOF
'"

# 3. Build Rust Axum API Natively on EC2
echo "🦀 Step 3: Compiling Rust Axum Backend natively on EC2..."
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" ubuntu@"$PUBLIC_IP" bash -c "'
set -e
source \$HOME/.cargo/env
cd /home/ubuntu/app
cargo build --release --package janv-api
'"

# 4. Build Next.js 16 Frontend Natively on EC2
echo "⚛️ Step 4: Installing dependencies and building Next.js 16 frontend..."
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" ubuntu@"$PUBLIC_IP" bash -c "'
set -e
cd /home/ubuntu/app/janv-web-next
npm ci
npm run build
'"

# 5. Configure Systemd Services and Nginx on EC2
echo "🛠️ Step 5: Configuring Systemd Services and Nginx reverse proxy..."
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" ubuntu@"$PUBLIC_IP" bash -c "'
sudo tee /etc/systemd/system/janv-api.service > /dev/null <<EOF
[Unit]
Description=Janv Rust Axum API Service
After=network.target redis-server.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/app
EnvironmentFile=/home/ubuntu/app/.env
ExecStart=/home/ubuntu/app/target/release/janv-api
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

sudo tee /etc/systemd/system/janv-web.service > /dev/null <<EOF
[Unit]
Description=Janv Next.js 16 Web Service
After=network.target janv-api.service

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/app/janv-web-next
EnvironmentFile=/home/ubuntu/app/.env
Environment=NODE_ENV=production
Environment=PORT=3000
Environment=HOSTNAME=0.0.0.0
ExecStart=/usr/bin/npm run start -- -p 3000 -H 0.0.0.0
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

sudo tee /etc/nginx/sites-available/default > /dev/null <<EOF
server {
    listen 80 default_server;
    server_name _;

    client_max_body_size 50M;

    location /api/v2/ {
        proxy_pass http://127.0.0.1:3000/api/v2/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection \"upgrade\";
        proxy_set_header Host \\\$host;
        proxy_cache_bypass \\\$http_upgrade;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:8080/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection \"upgrade\";
        proxy_set_header Host \\\$host;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
    }

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection \"upgrade\";
        proxy_set_header Host \\\$host;
        proxy_cache_bypass \\\$http_upgrade;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
    }
}
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now janv-api
sudo systemctl restart janv-api
sudo systemctl enable --now janv-web
sudo systemctl restart janv-web
sudo nginx -t
sudo systemctl restart nginx
'"

# 6. Verify Health Endpoints
echo "🔍 Step 6: Verifying Health Endpoints..."
sleep 5
for i in {1..20}; do
    STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://${PUBLIC_IP}/api/health" || echo "000")
    if [ "$STATUS" = "200" ]; then
        echo "✅ Rust API is HEALTHY (HTTP 200) on http://${PUBLIC_IP}/api/health"
        break
    fi
    echo "Waiting for Rust API... (status: $STATUS, attempt $i/20)"
    sleep 3
done

WEB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://${PUBLIC_IP}/adminLogin" || echo "000")
echo "✅ Next.js Frontend is UP (HTTP $WEB_STATUS) on http://${PUBLIC_IP}/adminLogin"

echo ""
echo "================================================================"
echo "🎉 DEPLOYMENT COMPLETE!"
echo "================================================================"
echo "🌐 Web Portal:        http://${PUBLIC_IP}"
echo "🔐 Admin Login:       http://${PUBLIC_IP}/adminLogin"
echo "🗄️ AWS RDS Database:  ${RDS_ENDPOINT}:${RDS_PORT}"
echo "🔑 SSH Command:       ssh -i terraform/janv-ec2-key.pem ubuntu@${PUBLIC_IP}"
echo "================================================================"
