# ============================================================
# Terraform Outputs
# ============================================================

output "ec2_public_ip" {
  description = "Static Elastic IP of the VIT Electronics EC2 App Server"
  value       = aws_eip.app_ip.public_ip
}

output "storefront_url" {
  description = "Next.js Storefront URL"
  value       = "http://${aws_eip.app_ip.public_ip}:3000"
}

output "admin_portal_url" {
  description = "VIT Electronics Admin Portal URL"
  value       = "http://${aws_eip.app_ip.public_ip}:3000/admin"
}

output "backend_api_url" {
  description = "NestJS Backend API URL"
  value       = "http://${aws_eip.app_ip.public_ip}:3001"
}

output "cloudfront_cdn_url" {
  description = "Amazon CloudFront Media CDN Domain"
  value       = "https://${aws_cloudfront_distribution.media_cdn.domain_name}"
}

output "s3_bucket_name" {
  description = "Amazon S3 Media Bucket Name"
  value       = aws_s3_bucket.media.id
}

output "rds_postgres_endpoint" {
  description = "Amazon RDS PostgreSQL Database Endpoint"
  value       = local.rds_endpoint
}

output "sqs_order_queue_url" {
  description = "Amazon SQS Order Queue URL"
  value       = aws_sqs_queue.orders.url
}

output "sqs_dlq_url" {
  description = "Amazon SQS Dead Letter Queue URL"
  value       = aws_sqs_queue.orders_dlq.url
}

output "sns_topic_arn" {
  description = "Amazon SNS Order Notifications Topic ARN"
  value       = aws_sns_topic.order_alerts.arn
}

output "cloudwatch_log_group" {
  description = "Amazon CloudWatch Log Group for application logs"
  value       = aws_cloudwatch_log_group.app_logs.name
}

output "ssm_database_url_parameter" {
  description = "SSM Parameter Store Key for Database Connection String"
  value       = aws_ssm_parameter.database_url.name
}

output "opensearch_endpoint" {
  description = "Amazon OpenSearch / Elasticsearch VPC Endpoint (if enabled)"
  value       = var.enable_opensearch ? "https://${aws_opensearch_domain.search[0].endpoint}" : "disabled (using PostgreSQL search fallback to preserve AWS credits)"
}

output "alb_dns_name" {
  description = "Application Load Balancer Public DNS Name"
  value       = aws_lb.app.dns_name
}

output "cloudtrail_name" {
  description = "AWS CloudTrail Multi-Region Audit Trail Name"
  value       = aws_cloudtrail.main.name
}

output "dynamodb_table_name" {
  description = "Amazon DynamoDB Cart & Sessions Table Name"
  value       = aws_dynamodb_table.app_sessions.name
}

output "kms_key_arn" {
  description = "AWS KMS Customer Managed Key ARN"
  value       = aws_kms_key.app_cmk.arn
}

output "waf_web_acl_arn" {
  description = "AWS WAF Web ACL protecting ALB"
  value       = aws_wafv2_web_acl.alb_waf.arn
}

output "cloudwatch_dashboard_name" {
  description = "CloudWatch Dashboard Name"
  value       = aws_cloudwatch_dashboard.main.dashboard_name
}

output "step_functions_state_machine_arn" {
  description = "AWS Step Functions Order Fulfillment Workflow ARN"
  value       = aws_sfn_state_machine.order_fulfillment.arn
}

output "vpc_flow_log_id" {
  description = "Amazon VPC Flow Log ID"
  value       = aws_flow_log.main.id
}


