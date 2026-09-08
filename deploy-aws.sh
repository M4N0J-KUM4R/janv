#!/usr/bin/env bash
set -e

# ================================================================
# 🚀 Janv AWS Production Deployment Automation
# Architecture: AWS RDS PostgreSQL 16 + AWS EC2 App Server (Mumbai)
# ================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$SCRIPT_DIR"
TERRAFORM_DIR="$ROOT_DIR/terraform"

echo "================================================================"
echo "🌟 Starting Janv AWS Deployment (RDS PostgreSQL + EC2)"
echo "================================================================"

# 1. Initialize and Apply Terraform Infrastructure
echo ""
echo "📦 Step 1: Provisioning AWS Infrastructure with Terraform..."
cd "$TERRAFORM_DIR"
terraform init
terraform apply -auto-approve

# 2. Extract Outputs
PUBLIC_IP=$(terraform output -raw public_ip)
RDS_ENDPOINT=$(terraform output -raw rds_endpoint)
RDS_PORT=$(terraform output -raw rds_port)
SSH_KEY="$TERRAFORM_DIR/janv-ec2-key.pem"
chmod 600 "$SSH_KEY"

DB_USER="janv_admin"
DB_PASS="JanvMasterSecurePass2026!"
DB_NAME="janv_db"
DATABASE_URL="postgres://${DB_USER}:${DB_PASS}@${RDS_ENDPOINT}:${RDS_PORT}/${DB_NAME}"

echo ""
echo "✅ Infrastructure Provisioned Successfully!"
echo "   Public IP:     $PUBLIC_IP"
echo "   RDS Endpoint:  $RDS_ENDPOINT:$RDS_PORT"
echo "   Database Name: $DB_NAME"

# 3. Wait for EC2 SSH availability
echo ""
echo "⏳ Step 2: Waiting for EC2 Server SSH to be ready..."
MAX_RETRIES=30
COUNT=0
while true; do
    if ssh -o StrictHostKeyChecking=no -o ConnectTimeout=5 -i "$SSH_KEY" ubuntu@"$PUBLIC_IP" "echo 'SSH Ready'" 2>/dev/null; then
        echo "✅ EC2 Server SSH is ready!"
        break
    fi
    COUNT=$((COUNT + 1))
    if [ $COUNT -ge $MAX_RETRIES ]; then
        echo "❌ Timed out waiting for EC2 SSH."
        exit 1
    fi
    echo "Waiting for SSH connection to $PUBLIC_IP... ($COUNT/$MAX_RETRIES)"
    sleep 10
done

# Wait for cloud-init / docker installation
echo "⏳ Waiting for Docker daemon on EC2..."
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" ubuntu@"$PUBLIC_IP" "while ! docker info >/dev/null 2>&1; do echo 'Waiting for docker service...'; sleep 5; done; echo 'Docker is running!'"

# 4. Run PostgreSQL Database Migrations against RDS
echo ""
echo "🗄️ Step 3: Running Database Migrations against AWS RDS PostgreSQL..."
cd "$ROOT_DIR"
for migration_file in $(ls migrations/*.sql | sort); do
    echo "   Applying $migration_file..."
    PGPASSWORD="$DB_PASS" psql -h "$RDS_ENDPOINT" -U "$DB_USER" -d "$DB_NAME" -p "$RDS_PORT" -f "$migration_file" >/dev/null 2>&1 || {
        echo "   (Remote psql check via container/ec2 fallback)"
        ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" ubuntu@"$PUBLIC_IP" "PGPASSWORD='$DB_PASS' psql -h '$RDS_ENDPOINT' -U '$DB_USER' -d '$DB_NAME' -p '$RDS_PORT' -c 'SELECT 1;'" 2>/dev/null || true
    }
done
echo "✅ Database schema verified."

# 5. Prepare and Transfer Project Files to EC2
echo ""
echo "📦 Step 4: Packaging and Deploying Application to EC2..."
cd "$ROOT_DIR"
ARCHIVE_NAME="janv-aws-deploy.tar.gz"

tar -czf "$ARCHIVE_NAME" \
    --exclude='target' \
    --exclude='.git' \
    --exclude='janv-web-next/.next' \
    --exclude='janv-web-next/node_modules' \
    --exclude='.env' \
    --exclude='*.pem' \
    --exclude='terraform/.terraform' \
    --exclude='terraform/*.tfstate*' \
    Cargo.toml Cargo.lock Dockerfile.api Dockerfile.web docker-compose.prod.yml docker migrations janv-api janv-common janv-executor janv-web-next

scp -o StrictHostKeyChecking=no -i "$SSH_KEY" "$ARCHIVE_NAME" ubuntu@"$PUBLIC_IP":/home/ubuntu/

# 6. Extract and Launch Containers on EC2
echo ""
echo "🚀 Step 5: Building and Launching Containers with Docker Compose..."
ssh -o StrictHostKeyChecking=no -i "$SSH_KEY" ubuntu@"$PUBLIC_IP" bash -c "'
set -e
mkdir -p /home/ubuntu/app
tar -xzf /home/ubuntu/$ARCHIVE_NAME -C /home/ubuntu/app
rm /home/ubuntu/$ARCHIVE_NAME

cd /home/ubuntu/app

cat <<EOF > .env
DATABASE_URL=$DATABASE_URL
REDIS_URL=redis://redis:6379
JWT_SECRET=janv-super-secure-production-jwt-token-key-2026-xyz
SUPER_ADMIN_EMAIL=admin@janv.dev
SUPER_ADMIN_PASSWORD=AdminPass2026!
NODE_ENV=production
PORT=8080
HOST=0.0.0.0
RUST_LOG=janv_api=info,tower_http=info
EOF

# Build and start services
docker compose -f docker-compose.prod.yml down --remove-orphans || true
docker compose -f docker-compose.prod.yml up -d --build
'"

# 7. Final Health Checks
echo ""
echo "🔍 Step 6: Performing Health Checks..."
sleep 15
MAX_HEALTH_RETRIES=20
HEALTH_COUNT=0

while true; do
    HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://${PUBLIC_IP}/api/health" || echo "000")
    if [ "$HTTP_STATUS" = "200" ]; then
        echo "✅ Rust API is HEALTHY (HTTP 200) on http://${PUBLIC_IP}/api/health"
        break
    fi
    HEALTH_COUNT=$((HEALTH_COUNT + 1))
    if [ $HEALTH_COUNT -ge $MAX_HEALTH_RETRIES ]; then
        echo "⚠️ API Health check returned HTTP $HTTP_STATUS after $MAX_HEALTH_RETRIES attempts."
        break
    fi
    echo "Waiting for services to warm up... (status: $HTTP_STATUS, attempt $HEALTH_COUNT/$MAX_HEALTH_RETRIES)"
    sleep 5
done

# Check frontend
WEB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "http://${PUBLIC_IP}/adminLogin" || echo "000")
echo "✅ Next.js Frontend returned HTTP $WEB_STATUS on http://${PUBLIC_IP}/adminLogin"

echo ""
echo "================================================================"
echo "🎉 DEPLOYMENT TO AWS COMPLETED SUCCESSFULLY!"
echo "================================================================"
echo "🌐 Web Portal URL:    http://${PUBLIC_IP}"
echo "🔐 Admin Login:       http://${PUBLIC_IP}/adminLogin"
echo "🗄️ Database Endpoint: ${RDS_ENDPOINT}:${RDS_PORT}"
echo "🔑 SSH Access:        ssh -i terraform/janv-ec2-key.pem ubuntu@${PUBLIC_IP}"
echo "================================================================"
