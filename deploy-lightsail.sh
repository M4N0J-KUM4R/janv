#!/usr/bin/env bash
set -e

# ── Configuration ──────────────────────────────────────────
AWS_REGION="ap-south-1"
DB_NAME="janv-db"
DB_MASTER_USER="janv"
DB_MASTER_PASS="JanvSecretPass2026!"
DB_DEFAULT_NAME="janv_db"

INSTANCE_NAME="janv-app-server"
INSTANCE_BLUEPRINT="ubuntu_24_04"
INSTANCE_BUNDLE="micro_3_1" # 1GB RAM, 1 vCPU ($7/month)

echo "===================================================="
echo "🚀 Starting Amazon Lightsail Deployment (ap-south-1)"
echo "===================================================="

# 1. Create Lightsail PostgreSQL Database if it doesn't exist
echo "📦 Step 1: Checking Lightsail PostgreSQL Database ($DB_NAME)..."
DB_EXISTS=$(aws lightsail get-relational-databases --region "$AWS_REGION" --query "relationalDatabases[?name=='$DB_NAME'].name" --output text || true)

if [ -z "$DB_EXISTS" ]; then
    echo "Creating Lightsail PostgreSQL Database '$DB_NAME'..."
    aws lightsail create-relational-database \
        --region "$AWS_REGION" \
        --relational-database-name "$DB_NAME" \
        --relational-database-blueprint-id "postgres_16" \
        --relational-database-bundle-id "micro_2_0" \
        --master-database-name "$DB_DEFAULT_NAME" \
        --master-username "$DB_MASTER_USER" \
        --master-user-password "$DB_MASTER_PASS" \
        --publicly-accessible
fi

echo "Waiting for database '$DB_NAME' to become available..."
while true; do
    DB_STATE=$(aws lightsail get-relational-database --relational-database-name "$DB_NAME" --region "$AWS_REGION" --query "relationalDatabase.state" --output text || echo "creating")
    echo "Database state: $DB_STATE"
    if [ "$DB_STATE" = "available" ]; then
        break
    fi
    sleep 10
done

# Fetch Database Endpoint
DB_ENDPOINT=$(aws lightsail get-relational-database --relational-database-name "$DB_NAME" --region "$AWS_REGION" --query "relationalDatabase.masterEndpoint.address" --output text)
DB_PORT=$(aws lightsail get-relational-database --relational-database-name "$DB_NAME" --region "$AWS_REGION" --query "relationalDatabase.masterEndpoint.port" --output text)
echo "✅ Database Endpoint: $DB_ENDPOINT:$DB_PORT"

# 2. Create Lightsail Instance if it doesn't exist
echo "🖥️ Step 2: Checking Lightsail Instance ($INSTANCE_NAME)..."
INSTANCE_EXISTS=$(aws lightsail get-instances --region "$AWS_REGION" --query "instances[?name=='$INSTANCE_NAME'].name" --output text || true)

if [ -z "$INSTANCE_EXISTS" ]; then
    echo "Creating Lightsail Instance '$INSTANCE_NAME'..."
    aws lightsail create-instances \
        --region "$AWS_REGION" \
        --instance-names "$INSTANCE_NAME" \
        --availability-zone "${AWS_REGION}a" \
        --blueprint-id "$INSTANCE_BLUEPRINT" \
        --bundle-id "$INSTANCE_BUNDLE"
fi

echo "Waiting for instance '$INSTANCE_NAME' to be running..."
while true; do
    INST_STATE=$(aws lightsail get-instance --instance-name "$INSTANCE_NAME" --region "$AWS_REGION" --query "instance.state.name" --output text || echo "pending")
    echo "Instance state: $INST_STATE"
    if [ "$INST_STATE" = "running" ]; then
        break
    fi
    sleep 5
done

# Open Ports 80 (HTTP), 443 (HTTPS), and 22 (SSH) in Firewall
echo "🔥 Step 3: Configuring Firewall ports (80, 443, 22)..."
aws lightsail open-instance-public-ports \
    --region "$AWS_REGION" \
    --instance-name "$INSTANCE_NAME" \
    --port-info fromPort=80,toPort=80,protocol=tcp || true

aws lightsail open-instance-public-ports \
    --region "$AWS_REGION" \
    --instance-name "$INSTANCE_NAME" \
    --port-info fromPort=443,toPort=443,protocol=tcp || true

# Fetch Public IP
PUBLIC_IP=$(aws lightsail get-instance --instance-name "$INSTANCE_NAME" --region "$AWS_REGION" --query "instance.publicIpAddress" --output text)
echo "✅ Public IP Address: $PUBLIC_IP"

DATABASE_URL="postgres://${DB_MASTER_USER}:${DB_MASTER_PASS}@${DB_ENDPOINT}:${DB_PORT}/${DB_DEFAULT_NAME}"

echo ""
echo "===================================================="
echo "🎉 Deployment Setup Complete!"
echo "===================================================="
echo "Database URL: $DATABASE_URL"
echo "Public IP: http://$PUBLIC_IP"
echo ""
echo "Database Endpoint: $DB_ENDPOINT"
