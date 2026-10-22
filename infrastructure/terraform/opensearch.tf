# ============================================================
# Amazon OpenSearch / Elasticsearch Service
# 100% Free Tier Eligible (750 hrs/month t3.small.search + 10 GB EBS gp3)
# ============================================================

# ── Security Group for OpenSearch / Elasticsearch ─────────────
resource "aws_security_group" "opensearch" {
  count       = var.enable_opensearch ? 1 : 0
  name        = "${var.project_name}-opensearch-sg"
  description = "Allows HTTPS inbound to OpenSearch cluster from EC2 app server"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "HTTPS from EC2 App Server"
    from_port       = 443
    to_port         = 443
    protocol        = "tcp"
    security_groups = [aws_security_group.ec2.id]
  }

  egress {
    description = "Allow all outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-opensearch-sg"
  }
}

# ── Amazon OpenSearch Domain (Free Tier Sizing) ───────────────
resource "aws_opensearch_domain" "search" {
  count          = var.enable_opensearch ? 1 : 0
  domain_name    = "${var.project_name}-search-${random_id.suffix.hex}"
  engine_version = "OpenSearch_2.11" # Compatible with Elasticsearch 7.x & OpenSearch

  cluster_config {
    instance_type          = "t3.small.search" # Eligible for 750 hrs/month Free Tier
    instance_count         = 1
    zone_awareness_enabled = false
  }

  ebs_options {
    ebs_enabled = true
    volume_type = "gp3"
    volume_size = 10 # Free tier allowance is 10 GB
  }

  vpc_options {
    subnet_ids         = [aws_subnet.db_1.id]
    security_group_ids = [aws_security_group.opensearch[0].id]
  }

  node_to_node_encryption {
    enabled = true
  }

  encrypt_at_rest {
    enabled = true
  }

  domain_endpoint_options {
    enforce_https       = true
    tls_security_policy = "Policy-Min-TLS-1-2-2019-07"
  }

  access_policies = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action    = "es:*"
        Principal = "*"
        Effect    = "Allow"
        Resource  = "arn:aws:es:${var.aws_region}:${data.aws_caller_identity.current.account_id}:domain/${var.project_name}-search-${random_id.suffix.hex}/*"
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-opensearch-domain"
  }
}

data "aws_caller_identity" "current" {}
