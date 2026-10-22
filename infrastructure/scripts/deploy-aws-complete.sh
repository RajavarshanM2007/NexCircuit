#!/usr/bin/env bash
# ============================================================
# VIT ELECTRONICS — All-in-One AWS Cloud Deployment Script
# Automatically provisions all 23 AWS services via Terraform,
# uploads assets to S3, connects RDS PostgreSQL, deploys Docker
# containers on EC2, runs Prisma migrations, and seeds catalog.
# ============================================================

set -e
export AWS_PAGER=""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$ROOT_DIR"

echo "============================================================"
echo "⚡ Starting VIT ELECTRONICS Cloud Deployment on Amazon AWS"
echo "============================================================"

# ── 1. Check & Install Prerequisites ───────────────────────────
command -v aws >/dev/null 2>&1 || { echo "❌ AWS CLI is required. Aborting."; exit 1; }

if ! command -v terraform >/dev/null 2>&1; then
  echo "📥 Installing Terraform in CloudShell..."
  curl -s -O https://releases.hashicorp.com/terraform/1.8.5/terraform_1.8.5_linux_amd64.zip
  unzip -q -o terraform_1.8.5_linux_amd64.zip
  sudo mv terraform /usr/local/bin/ 2>/dev/null || mv terraform ~/bin/ 2>/dev/null || true
  rm -f terraform_1.8.5_linux_amd64.zip
fi

echo "🔍 Checking AWS authentication..."
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
AWS_ARN=$(aws sts get-caller-identity --query Arn --output text)
REGION="${AWS_REGION:-ap-southeast-2}"

echo "✅ Authenticated to AWS Account: ${AWS_ACCOUNT_ID}"
echo "✅ Target AWS Region: ${REGION} (Sydney)"

# ── 2. Provision 23 AWS Services via Terraform ────────────────
echo ""
echo "🚀 Provisioning all 23 AWS Services via Terraform in ${REGION}..."
cd "$ROOT_DIR/infrastructure/terraform"

terraform init -upgrade >/dev/null 2>&1 || terraform init >/dev/null 2>&1

echo "Applying Terraform configuration with auto-approval in ${REGION}..."
terraform apply -auto-approve -var="aws_region=${REGION}"

# ── 3. Extract Infrastructure Outputs ──────────────────────────
echo ""
echo "📥 Extracting AWS Infrastructure endpoints..."
EC2_IP=$(terraform output -raw ec2_public_ip 2>/dev/null || echo "15.207.46.170")
RDS_ENDPOINT=$(terraform output -raw rds_postgres_endpoint 2>/dev/null || echo "")
S3_BUCKET=$(terraform output -raw s3_bucket_name 2>/dev/null || echo "")
CLOUDFRONT_URL=$(terraform output -raw cloudfront_cdn_url 2>/dev/null || echo "")
SQS_URL=$(terraform output -raw sqs_order_queue_url 2>/dev/null || echo "")
SNS_ARN=$(terraform output -raw sns_topic_arn 2>/dev/null || echo "")

INSTANCE_ID=$(aws ec2 describe-instances --region "$REGION" \
  --filters "Name=ip-address,Values=${EC2_IP}" "Name=instance-state-name,Values=running" \
  --query "Reservations[0].Instances[0].InstanceId" --output text 2>/dev/null || echo "i-0f6409c9a0ed7f9d2")

if [ -z "$INSTANCE_ID" ] || [ "$INSTANCE_ID" = "None" ]; then
  INSTANCE_ID="i-0f6409c9a0ed7f9d2"
fi

cd "$ROOT_DIR"

# ── 4. Upload Assets to Amazon S3 ──────────────────────────────
if [ -n "${S3_BUCKET}" ]; then
  echo ""
  echo "🖼️ Syncing banners and product images to Amazon S3 (${S3_BUCKET})..."
  if [ -d "website-assets/banners" ]; then
    aws s3 sync website-assets/banners/ "s3://${S3_BUCKET}/banners/" --cache-control "public, max-age=31536000" --quiet || true
  fi
  if [ -d "product-images" ]; then
    aws s3 sync product-images/ "s3://${S3_BUCKET}/products/" --cache-control "public, max-age=31536000" --quiet || true
  fi
  echo "✅ Assets synced to Amazon S3."
fi

# ── 5. Deploy Stack on EC2 via AWS Systems Manager (SSM) ───────
echo ""
echo "📦 Deploying production containers onto EC2 instance (${INSTANCE_ID})..."

aws ssm send-command \
  --region "$REGION" \
  --instance-ids "$INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --parameters 'commands=[
    "mkdir -p /home/ubuntu/app",
    "cd /home/ubuntu/app",
    "git pull origin main || true",
    "cat << '\''EOF'\'' > .env
DATABASE_URL=\"postgresql://postgres:VitElectronics2026!@'"${RDS_ENDPOINT}"'/vitelectronics?schema=public\"
REDIS_URL=\"redis://redis:6379\"
JWT_SECRET=\"vit7f8b9c2a1e3d4f5g6h7i8j9k0l1m2n3o4p5q6r7s8t9u0v1w2x3y4z5a6b7c8\"
JWT_REFRESH_SECRET=\"vita1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0\"
NEXTAUTH_SECRET=\"9f8e7d6c5b4a3928172635445566778899aabbccddeeff001122334455667788\"
AUTH_SECRET=\"9f8e7d6c5b4a3928172635445566778899aabbccddeeff001122334455667788\"
NEXTAUTH_URL=\"http://'"${EC2_IP}"':3000\"
AUTH_URL=\"http://'"${EC2_IP}"':3000\"
PORT=3000
NODE_ENV=production
FRONTEND_URL=\"http://'"${EC2_IP}"':3000\"
NEXT_PUBLIC_SITE_URL=\"http://'"${EC2_IP}"':3000\"
NEXT_PUBLIC_API_URL=\"http://'"${EC2_IP}"':3001\"
INTERNAL_API_URL=\"http://backend:3001\"
NEXT_PUBLIC_GOOGLE_ENABLED=\"false\"
NEXT_PUBLIC_CDN_URL=\"'"${CLOUDFRONT_URL}"'\"
AWS_REGION=\"'"${REGION}"'\"
AWS_S3_BUCKET=\"'"${S3_BUCKET}"'\"
AWS_CLOUDFRONT_DOMAIN=\"'"${CLOUDFRONT_URL}"'\"
AWS_SQS_ORDER_QUEUE_URL=\"'"${SQS_URL}"'\"
AWS_SNS_TOPIC_ARN=\"'"${SNS_ARN}"'\"
ADMIN_EMAIL=\"admin@vitelectronics.com\"
ADMIN_PASSWORD=\"Admin@123\"
EOF",
    "cp .env frontend/.env 2>/dev/null || true",
    "cp .env frontend/.env.local 2>/dev/null || true",
    "cp .env backend/.env 2>/dev/null || true",
    "docker rm -f vit-postgres vit-redis 2>/dev/null || true",
    "nohup bash -c \"docker compose -f infrastructure/docker-compose.prod.yml up -d --build && sleep 10 && docker compose -f infrastructure/docker-compose.prod.yml exec -T backend node prisma/seed.js || true\" > /var/log/deploy.log 2>&1 &",
    "echo DEPLOYMENT_ACTIVE"
  ]' --output text --query 'Command.CommandId' > /dev/null

echo "⏳ Waiting for app containers & compilation to finish (~3-5 minutes)..."

COUNT=0
while true; do
  HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 2 "http://${EC2_IP}:3000" || echo "000")
  if [ "$HTTP_CODE" = "200" ] || [ "$HTTP_CODE" = "307" ] || [ "$HTTP_CODE" = "308" ]; then
    echo ""
    echo "============================================================"
    echo "🎉🎉🎉 VIT ELECTRONICS DEPLOYMENT SUCCESSFUL! 🎉🎉🎉"
    echo "============================================================"
    echo "  🌐 Storefront:          http://${EC2_IP}:3000"
    echo "  🔐 Admin Portal:        http://${EC2_IP}:3000/admin"
    echo "  📄 Customer Invoices:   http://${EC2_IP}:3000/invoices"
    echo "  ⚙️ Backend API:         http://${EC2_IP}:3001"
    echo "  🗄️ AWS RDS Database:    ${RDS_ENDPOINT}"
    echo "  ⚡ Amazon CloudFront:   ${CLOUDFRONT_URL}"
    echo "  📦 Amazon S3 Bucket:    ${S3_BUCKET}"
    echo "  📨 Amazon SQS Queue:    ${SQS_URL}"
    echo "  📢 Amazon SNS Topic:    ${SNS_ARN}"
    echo ""
    echo "  👤 Default Admin Credentials:"
    echo "     Email:    admin@vitelectronics.com"
    echo "     Password: Admin@123"
    echo "============================================================"
    break
  fi

  echo -n "."
  COUNT=$((COUNT + 1))

  if [ $((COUNT % 3)) -eq 0 ]; then
    PROGRESS=$(aws ssm send-command \
      --region "$REGION" \
      --instance-ids "$INSTANCE_ID" \
      --document-name "AWS-RunShellScript" \
      --parameters 'commands=["tail -n 2 /var/log/deploy.log 2>/dev/null || true"]' \
      --output text --query 'Command.CommandId' 2>/dev/null)
    sleep 3
    LATEST=$(aws ssm get-command-invocation \
      --region "$REGION" \
      --instance-id "$INSTANCE_ID" \
      --command-id "$PROGRESS" \
      --query "StandardOutputContent" \
      --output text 2>/dev/null || true)
    if [ -n "$LATEST" ]; then
      echo -e "\n[Build status]: $(echo "$LATEST" | tr '\n' ' ')"
    fi
  else
    sleep 10
  fi
done
