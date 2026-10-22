# ============================================================
# AWS Systems Manager (SSM) Parameter Store (Module 5 & 6)
# 100% Free Tier (Standard parameters are completely free)
# ============================================================

resource "random_password" "jwt_secret" {
  length  = 32
  special = false
}

resource "random_password" "jwt_refresh_secret" {
  length  = 32
  special = false
}

resource "aws_ssm_parameter" "database_url" {
  name        = "/${var.project_name}/${var.environment}/database_url"
  description = "PostgreSQL Database Connection URL for Prisma"
  type        = "SecureString"
  value       = "postgresql://${var.db_username}:${var.db_password}@${local.rds_endpoint}/${var.db_name}?schema=public"
  overwrite   = true

  tags = {
    Name = "${var.project_name}-database-url-param"
  }
}

resource "aws_ssm_parameter" "jwt_secret" {
  name        = "/${var.project_name}/${var.environment}/jwt_secret"
  description = "JWT Access Token Secret"
  type        = "SecureString"
  value       = random_password.jwt_secret.result
  overwrite   = true
}

resource "aws_ssm_parameter" "jwt_refresh_secret" {
  name        = "/${var.project_name}/${var.environment}/jwt_refresh_secret"
  description = "JWT Refresh Token Secret"
  type        = "SecureString"
  value       = random_password.jwt_refresh_secret.result
  overwrite   = true
}

resource "aws_ssm_parameter" "s3_bucket" {
  name        = "/${var.project_name}/${var.environment}/s3_bucket"
  description = "Media S3 Bucket Name"
  type        = "String"
  value       = aws_s3_bucket.media.id
  overwrite   = true
}

resource "aws_ssm_parameter" "cloudfront_domain" {
  name        = "/${var.project_name}/${var.environment}/cloudfront_domain"
  description = "CloudFront Distribution CDN Domain"
  type        = "String"
  value       = aws_cloudfront_distribution.media_cdn.domain_name
  overwrite   = true
}

resource "aws_ssm_parameter" "sqs_queue_url" {
  name        = "/${var.project_name}/${var.environment}/sqs_queue_url"
  description = "SQS Orders Queue URL"
  type        = "String"
  value       = aws_sqs_queue.orders.url
  overwrite   = true
}

resource "aws_ssm_parameter" "sns_topic_arn" {
  name        = "/${var.project_name}/${var.environment}/sns_topic_arn"
  description = "SNS Orders Alerts Topic ARN"
  type        = "String"
  value       = aws_sns_topic.order_alerts.arn
  overwrite   = true
}
