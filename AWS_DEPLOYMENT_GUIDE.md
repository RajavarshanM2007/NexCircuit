# VIT ELECTRONICS — AWS Cloud Production Deployment Guide

A complete, production-ready guide to provisioning, configuring, and deploying the **VIT ELECTRONICS E-Commerce Platform** on **Amazon Web Services (AWS)** using native AWS cloud services (including managed Amazon RDS PostgreSQL, Amazon S3, Amazon CloudFront, SQS, SNS, and EC2).

---

## 1. AWS Cloud Architecture: 23 Managed Services Overview

The entire platform is architected to utilize **23 core AWS services**, combining maximum reliability, automated scaling, data durability, security, and strict AWS Free Tier cost guardrails:

| # | AWS Service | Layer / Category | Resource Name & Purpose in VIT Electronics | Free Tier / Sizing |
|---|---|---|---|---|
| **1** | **Amazon VPC** | Networking | `vitelectronics-vpc` — Dedicated private virtual network (10.0.0.0/16) | Free (Always) |
| **2** | **Amazon VPC Subnets** | Networking | 4 Subnets across 2 Availability Zones (`public-1`, `public-2`, `db-1`, `db-2`) | Free (Always) |
| **3** | **Amazon Internet Gateway (IGW)** | Networking | `vitelectronics-igw` — Bi-directional direct internet communication | Free (Always) |
| **4** | **Amazon Route Tables** | Networking | `vitelectronics-public-rt` — Route table associating public subnets to IGW | Free (Always) |
| **5** | **Amazon VPC Flow Logs** | Network Forensics | `vitelectronics-flow-log` — Captures IP network traffic metadata for security | Free Tier eligible |
| **6** | **Amazon EC2** | Compute | `vitelectronics-app-server` (`t3.micro`) — Runs Dockerized app containers | 750 hrs/mo free |
| **7** | **Amazon EBS** | Block Storage | `vitelectronics-ec2-root-ebs` (30 GB gp3 encrypted root block volume) | 30 GB/mo free |
| **8** | **Amazon Elastic IP (EIP)** | Networking | `vitelectronics-elastic-ip` — Static public IPv4 address attached to EC2 | Standard allocation |
| **9** | **Amazon ALB (Application Load Balancer)** | Load Balancing | `vitelectronics-alb` — Layer 7 multi-AZ reverse proxy distributing traffic | Standard tier |
| **10** | **AWS Auto Scaling Group (ASG)** | Compute Scaling | `vitelectronics-asg` — Multi-AZ dynamic fleet management (1–3 instances) | Free tier compute |
| **11** | **AWS EC2 Launch Template** | Infrastructure as Code | `vitelectronics-launch-template` — Defines Ubuntu AMI, user-data, IAM roles | Free (Always) |
| **12** | **Amazon RDS PostgreSQL 16** | Managed Database | `vitelectronics-postgres` (`db.t3.micro`, 20 GB gp3) — Managed relational DB | 750 hrs/mo free |
| **13** | **Amazon S3** | Object Storage | `vitelectronics-media-*` — Private media bucket for images and PDF invoices | 5 GB standard free |
| **14** | **Amazon CloudFront** | Edge CDN | `vitelectronics-cloudfront-cdn` — Low-latency global CDN with Origin Access Control | 1 TB/mo transfer free |
| **15** | **Amazon SQS** | Message Queue | `vitelectronics-order-queue` & `orders-dlq` — Decoupled async order processing | 1,000,000 requests free |
| **16** | **Amazon SNS** | Notification Service | `vitelectronics-order-alerts-topic` — Real-time email and push event alerts | 1,000,000 publishes free |
| **17** | **Amazon DynamoDB** | NoSQL Database | `vitelectronics-cart-sessions` — Low-latency session/cart store with automated TTL | 25 GB free |
| **18** | **Amazon OpenSearch Service** | Search Engine | `vitelectronics-search` — Full-text search engine (with PostgreSQL fallback) | Free tier eligible |
| **19** | **Amazon CloudWatch Logs** | Telemetry & Logging | `/aws/ec2/vitelectronics`, VPC flow logs, Step Functions execution logs | 5 GB log ingestion free |
| **20** | **Amazon CloudWatch Alarms** | Observability | High EC2 CPU (>80%), High RDS CPU (>80%), Low RDS Free Storage (<2GB) | 10 alarms free |
| **21** | **Amazon CloudWatch Dashboard** | Monitoring UI | `vitelectronics-operations-dashboard` — Single-pane view of compute, DB & SQS | 3 dashboards free |
| **22** | **AWS CloudTrail** | Audit & Compliance | `vitelectronics-audit-trail` — Multi-region governance and AWS API audit logging | Always free for 90d |
| **23** | **AWS Step Functions** | Serverless Workflow | `vitelectronics-order-fulfillment-workflow` — Order fulfillment & PDF invoice pipeline | 4,000 state transitions free |
| **24** | **AWS KMS** | Cryptographic Security | `alias/vitelectronics-key` — Customer Managed Key (CMK) with automated key rotation | Free Tier allowance |
| **25** | **AWS WAFv2** | Application Security | `vitelectronics-alb-waf` — Web ACL protecting against SQLi, XSS, and DDoS | Standard rules |
| **26** | **AWS IAM** | Identity & Access | `vitelectronics-ec2-app-role`, least-privilege instance profiles & service roles | Always free |
| **27** | **AWS Systems Manager (SSM)** | Management & Secrets | SSM Parameter Store (encrypted secrets) + SSM Session Manager (SSH-less shell) | Standard params free |
| **28** | **AWS Budgets** | Cost Guardrail | `vitelectronics-spending-guardrail` — Automated email notifications at $1 threshold | Free |

---

## 2. One-Line Copy-Paste AWS CLI Deployment Command

Your friend can copy and paste this command sequence directly into **AWS CloudShell**, their local terminal with AWS CLI configured, or on their EC2 instance:

```bash
# ── STEP 1: Clone the repository ──
git clone https://github.com/likhithm123/AWS-PROJECT.git vit-electronics && cd vit-electronics

# ── STEP 2: Run the automated all-in-one setup ──
chmod +x infrastructure/scripts/deploy-aws-complete.sh
./infrastructure/scripts/deploy-aws-complete.sh
```

### What This Automated Script Does:
1. Validates that the AWS CLI is authenticated to your friend's AWS account.
2. Initializes and applies Terraform in `infrastructure/terraform/`, provisioning **all 23 AWS services** (VPC, Subnets, Security Groups, RDS PostgreSQL, S3, CloudFront, SQS, SNS, EC2, CloudWatch, SSM, Step Functions, WAF, KMS, Budgets).
3. Captures the generated AWS RDS endpoint, S3 bucket name, and CloudFront domain.
4. Auto-generates the production `.env` file pointing directly to the **AWS RDS database**.
5. Builds and launches the Docker containers (`redis`, `migrate`, `backend`, `frontend`).
6. Deploys the Prisma database migrations onto the **AWS RDS instance**.
7. Seeds the database with **VIT ELECTRONICS** store branding, categories, and default administrator credentials.
8. Displays the live web links and login credentials.

---

## 3. Step-by-Step Manual Deployment Guide

If your friend prefers to execute each step individually:

### Step 3.1: Configure AWS CLI
Ensure AWS CLI v2 and Terraform (>= 1.5.0) are installed:
```bash
aws configure
# AWS Access Key ID: <Friend-AWS-Access-Key-ID>
# AWS Secret Access Key: <Friend-AWS-Secret-Access-Key>
# Default region name: us-east-1
# Default output format: json
```

### Step 3.2: Provision Cloud Infrastructure with Terraform
```bash
cd infrastructure/terraform

# Copy variable template
cp terraform.tfvars.example terraform.tfvars

# Initialize Terraform providers
terraform init

# Plan and apply
terraform apply -auto-approve
```

Terraform provisions all resources and outputs the values:
```bash
# Example outputs:
ec2_public_ip          = "54.210.xx.xx"
rds_postgres_endpoint  = "vitelectronics-postgres.xxxx.us-east-1.rds.amazonaws.com:5432"
s3_bucket_name         = "vitelectronics-media-xxxx"
cloudfront_cdn_url     = "https://d123456789.cloudfront.net"
sqs_order_queue_url    = "https://sqs.us-east-1.amazonaws.com/xxxx/vitelectronics-order-queue"
sns_topic_arn          = "arn:aws:sns:us-east-1:xxxx:vitelectronics-order-alerts"
```

### Step 3.3: Configure the Production Environment File (`.env`)
At the project root, create or edit `.env`:
```env
# ── AWS RDS PostgreSQL & Redis ─────────────────────────────────
DATABASE_URL="postgresql://postgres:VitElectronics2026!@<RDS_POSTGRES_ENDPOINT>/vitelectronics?schema=public"
REDIS_URL="redis://redis:6379"

# ── Authentication ───────────────────────────────────────────
JWT_SECRET="7f8b9c2a1e3d4f5g6h7i8j9k0l1m2n3o4p5q6r7s8t9u0v1w2x3y4z5a6b7c8d9e"
JWT_REFRESH_SECRET="a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2"
NEXTAUTH_SECRET="9f8e7d6c5b4a3928172635445566778899aabbccddeeff001122334455667788"
NEXTAUTH_URL="http://<EC2_PUBLIC_IP>:3000"

# ── AWS Services (S3, CloudFront, SQS, SNS) ───────────────────
AWS_REGION="us-east-1"
AWS_S3_BUCKET="<S3_BUCKET_NAME_FROM_TERRAFORM>"
AWS_CLOUDFRONT_DOMAIN="<CLOUDFRONT_CDN_URL_FROM_TERRAFORM>"
AWS_SQS_ORDER_QUEUE_URL="<SQS_QUEUE_URL_FROM_TERRAFORM>"
AWS_SNS_TOPIC_ARN="<SNS_TOPIC_ARN_FROM_TERRAFORM>"
# Leave access keys blank if running on EC2 (uses IAM instance profile automatically)
AWS_ACCESS_KEY_ID=""
AWS_SECRET_ACCESS_KEY=""

# ── App URLs & Endpoints ─────────────────────────────────────
PORT=3001
NODE_ENV=production
FRONTEND_URL="http://<EC2_PUBLIC_IP>:3000"
NEXT_PUBLIC_API_URL="http://<EC2_PUBLIC_IP>:3001"
INTERNAL_API_URL="http://backend:3001"
NEXT_PUBLIC_CDN_URL="<CLOUDFRONT_CDN_URL_FROM_TERRAFORM>"
NEXT_PUBLIC_SITE_URL="http://<EC2_PUBLIC_IP>:3000"

# ── Default Admin Account ────────────────────────────────────
ADMIN_EMAIL="admin@vitelectronics.com"
ADMIN_PASSWORD="Admin@123"

# ── Transactional Email (Optional SMTP) ───────────────────────
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER=""
SMTP_PASS=""
SMTP_FROM="VIT ELECTRONICS <admin@vitelectronics.com>"
```

### Step 3.4: Deploy Application with Docker Compose
```bash
# Build and launch production stack (Redis, DB migration, Backend, Frontend)
docker compose --env-file .env -f infrastructure/docker-compose.prod.yml up -d --build

# Verify container health
docker compose -f infrastructure/docker-compose.prod.yml ps
```

### Step 3.5: Seed Admin & Initial Store Catalog
```bash
docker compose --env-file .env -f infrastructure/docker-compose.prod.yml exec -T backend node prisma/seed.js
```

---

## 4. Default Admin Credentials

Share these credentials with your friend:

| Detail | Value |
|---|---|
| **Storefront URL** | `http://<EC2_PUBLIC_IP>:3000` |
| **Admin Portal URL** | `http://<EC2_PUBLIC_IP>:3000/admin` or `/login` |
| **Backend Health Endpoint** | `http://<EC2_PUBLIC_IP>:3001/health` |
| **Default Admin Email** | `admin@vitelectronics.com` |
| **Default Admin Password** | `Admin@123` *(or `VitAdmin@2026!`)* |
| **Admin Role** | `ADMIN` (Full catalog, orders, media, theme, and config access) |

---

## 5. Branded Invoice & PDF Generation

- **Company Name on Invoices**: `VIT ELECTRONICS`
- **Customer Receipts**: Automatically generated as branded PDFs with `VIT ELECTRONICS` header, itemized products, tax calculation, and order tracking number.
- **S3 & CDN Archival**: Invoices are uploaded directly to the private **Amazon S3** bucket under the `invoices/` prefix, served via signed **Amazon CloudFront** URLs, and archived to Amazon Glacier after 90 days.
- **Email Delivery**: Attached as PDF directly to customer order confirmation emails via SMTP.

---

## 6. Teardown / Destroy Infrastructure (If Ever Needed)

To completely clean up all 23 AWS resources and stop all billing:
```bash
cd infrastructure/terraform
terraform destroy -auto-approve
```
