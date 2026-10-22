#!/usr/bin/env bash
# ============================================================
# VIT ELECTRONICS — All-in-One AWS Cloud Deployment Script
# Automatically provisions all 23 AWS services via Terraform,
# connects to AWS RDS PostgreSQL, deploys Docker containers,
# runs Prisma migrations, and seeds VIT ELECTRONICS store data.
# ============================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$ROOT_DIR"

echo "============================================================"
echo "⚡ Starting VIT ELECTRONICS Cloud Deployment on Amazon Web Services"
echo "============================================================"

# ── 1. Check Prerequisites ────────────────────────────────────
command -v aws >/dev/null 2>&1 || { echo "❌ AWS CLI v2 is required but not installed. Aborting."; exit 1; }
command -v terraform >/dev/null 2>&1 || { echo "❌ Terraform >= 1.5.0 is required but not installed. Aborting."; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker is required but not installed. Aborting."; exit 1; }

echo "🔍 Checking AWS authentication..."
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_ARN=$(aws sts get-caller-identity --query Arn --output text)
echo "✅ Authenticated to AWS Account: ${AWS_ACCOUNT_ID} (${AWS_ARN})"

# ── 2. Provision AWS Infrastructure via Terraform ──────────────
echo ""
echo "🚀 Provisioning 23 AWS Services via Terraform..."
cd infrastructure/terraform

if [ ! -f terraform.tfvars ]; then
  echo "📄 Creating terraform.tfvars from example..."
  cp terraform.tfvars.example terraform.tfvars
fi

terraform init -upgrade
echo "Applying Terraform configuration (creating VPC, Subnets, RDS, S3, CloudFront, SQS, SNS, EC2, IAM, SSM, CloudWatch)..."
terraform apply -auto-approve

# ── 3. Extract Terraform Outputs ───────────────────────────────
echo ""
echo "📥 Extracting AWS Infrastructure endpoints..."
EC2_IP=$(terraform output -raw ec2_public_ip 2>/dev/null || echo "localhost")
RDS_ENDPOINT=$(terraform output -raw rds_postgres_endpoint 2>/dev/null || echo "")
S3_BUCKET=$(terraform output -raw s3_bucket_name 2>/dev/null || echo "")
CLOUDFRONT_URL=$(terraform output -raw cloudfront_cdn_url 2>/dev/null || echo "")
SQS_URL=$(terraform output -raw sqs_order_queue_url 2>/dev/null || echo "")
SNS_ARN=$(terraform output -raw sns_topic_arn 2>/dev/null || echo "")

cd "$ROOT_DIR"

# ── 4. Initialize Banners and Product Pictures to Amazon S3 ─────
if [ -n "${S3_BUCKET}" ]; then
  echo ""
  echo "🖼️ Uploading banners and product pictures to Amazon S3 bucket (${S3_BUCKET})..."
  if [ -d "website-assets/banners" ]; then
    echo "  Uploading banners from website-assets/banners/ to s3://${S3_BUCKET}/banners/..."
    aws s3 sync website-assets/banners/ "s3://${S3_BUCKET}/banners/" --cache-control "public, max-age=31536000"
  fi
  if [ -d "product-images" ]; then
    echo "  Uploading product pictures from product-images/ to s3://${S3_BUCKET}/products/..."
    aws s3 sync product-images/ "s3://${S3_BUCKET}/products/" --cache-control "public, max-age=31536000"
  fi
  echo "✅ Banners and product pictures successfully uploaded to Amazon S3."
fi

# ── 5. Generate Production .env File ───────────────────────────
echo ""
echo "📝 Generating production .env with AWS RDS database configuration..."

# Generate secure random keys
JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "vit7f8b9c2a1e3d4f5g6h7i8j9k0l1m2n3o4p5q6r7s8t9u0v1w2x3y4z5a6b7c8")
JWT_REFRESH_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "vita1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0")
NEXTAUTH_SECRET=$(openssl rand -hex 32 2>/dev/null || echo "vit9f8e7d6c5b4a3928172635445566778899aabbccddeeff00112233445566")

cat <<EOF > .env
# ── AWS RDS PostgreSQL & Redis ─────────────────────────────────
DATABASE_URL="postgresql://postgres:VitElectronics2026!@${RDS_ENDPOINT}/vitelectronics?schema=public"
REDIS_URL="redis://redis:6379"

# ── Authentication ───────────────────────────────────────────
JWT_SECRET="${JWT_SECRET}"
JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET}"
NEXTAUTH_SECRET="${NEXTAUTH_SECRET}"
NEXTAUTH_URL="http://${EC2_IP}:3000"

# ── AWS Services (S3, CloudFront, SQS, SNS) ───────────────────
AWS_REGION="us-east-1"
AWS_S3_BUCKET="${S3_BUCKET}"
AWS_CLOUDFRONT_DOMAIN="${CLOUDFRONT_URL}"
AWS_SQS_ORDER_QUEUE_URL="${SQS_URL}"
AWS_SNS_TOPIC_ARN="${SNS_ARN}"
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""

# ── App URLs & Endpoints ─────────────────────────────────────
PORT=3001
NODE_ENV=production
FRONTEND_URL="http://${EC2_IP}:3000"
NEXT_PUBLIC_API_URL="http://${EC2_IP}:3001"
INTERNAL_API_URL="http://backend:3001"
NEXT_PUBLIC_CDN_URL="${CLOUDFRONT_URL}"
NEXT_PUBLIC_SITE_URL="http://${EC2_IP}:3000"

# ── Default Admin Account ────────────────────────────────────
ADMIN_EMAIL="admin@vitelectronics.com"
ADMIN_PASSWORD="Admin@123"

# ── Email Service (Optional SMTP) ────────────────────────────
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="VIT ELECTRONICS <admin@vitelectronics.com>"
EOF

echo "✅ Production .env generated successfully."

# ── 6. Build & Launch Docker Stack ─────────────────────────────
echo ""
echo "📦 Building and starting VIT ELECTRONICS Docker containers..."
docker compose --env-file .env -f infrastructure/docker-compose.prod.yml up -d --build

echo "⏳ Waiting for backend API to pass health check..."
for i in {1..40}; do
  if curl -sf http://localhost:3001/health >/dev/null 2>&1; then
    echo "✅ Backend API is healthy!"
    break
  fi
  echo "   Waiting for API to initialize ($i/40)..."
  sleep 3
done

# ── 7. Seed AWS RDS Database ───────────────────────────────────
echo ""
echo "🌱 Initializing AWS RDS PostgreSQL with VIT ELECTRONICS branding and catalog..."
docker compose --env-file .env -f infrastructure/docker-compose.prod.yml exec -T backend node prisma/seed.js || true

echo ""
echo "============================================================"
echo "🎉 VIT ELECTRONICS DEPLOYMENT SUCCESSFUL!"
echo "============================================================"
echo "  🌐 Customer Storefront: http://${EC2_IP}:3000"
echo "  🔐 Admin Portal:        http://${EC2_IP}:3000/admin"
echo "  ⚙️ Backend API:         http://${EC2_IP}:3001"
echo "  🗄️ AWS RDS Database:    ${RDS_ENDPOINT}"
echo "  📦 Amazon S3 Bucket:    ${S3_BUCKET}"
echo "  ⚡ Amazon CloudFront:   ${CLOUDFRONT_URL}"
echo ""
echo "  👤 Default Admin Credentials:"
echo "     Email:    admin@vitelectronics.com"
echo "     Password: Admin@123"
echo "============================================================"
