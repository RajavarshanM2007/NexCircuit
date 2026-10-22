# ============================================================
# Amazon SQS & Amazon SNS (Module 7: Application Integration)
# 100% Free Tier (1,000,000 SQS requests + 1,000,000 SNS publishes free)
# ============================================================

# ── Amazon SQS Dead Letter Queue (DLQ) ────────────────────────
resource "aws_sqs_queue" "orders_dlq" {
  name                      = "${var.project_name}-orders-dlq"
  message_retention_seconds = 1209600 # 14 days

  tags = {
    Name = "${var.project_name}-orders-dead-letter-queue"
  }
}

# ── Amazon SQS Main Order Processing Queue ────────────────────
resource "aws_sqs_queue" "orders" {
  name                      = "${var.project_name}-order-queue"
  delay_seconds             = 0
  max_message_size          = 262144 # 256 KB
  message_retention_seconds = 345600 # 4 days
  receive_wait_time_seconds = 10     # Long polling enabled for efficiency

  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.orders_dlq.arn
    maxReceiveCount     = 3
  })

  tags = {
    Name = "${var.project_name}-order-queue"
  }
}

# ── Amazon SNS Topic (Order Alerts & System Notifications) ────
resource "aws_sns_topic" "order_alerts" {
  name = "${var.project_name}-order-alerts"

  tags = {
    Name = "${var.project_name}-order-alerts-topic"
  }
}

# ── Amazon SNS Email Subscription ─────────────────────────────
resource "aws_sns_topic_subscription" "email_subscription" {
  topic_arn = aws_sns_topic.order_alerts.arn
  protocol  = "email"
  endpoint  = var.budget_alert_email
}
