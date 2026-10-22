# ============================================================
# Amazon CloudWatch (Module 5: Monitoring & Alarms)
# 100% Free Tier (10 Alarms + 5 GB Log ingestion free)
# ============================================================

# ── CloudWatch Log Group ──────────────────────────────────────
resource "aws_cloudwatch_log_group" "app_logs" {
  name              = "/aws/ec2/${var.project_name}"
  retention_in_days = 7 # Automatically purges old logs to stay well within 5 GB Free Tier

  tags = {
    Name = "${var.project_name}-app-logs"
  }
}

# ── CloudWatch Alarm: EC2 High CPU Utilization (>80%) ─────────
resource "aws_cloudwatch_metric_alarm" "high_cpu" {
  alarm_name          = "${var.project_name}-high-cpu-alarm"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/EC2"
  period              = 300 # 5 minutes
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Triggered when EC2 CPU utilization exceeds 80% for 10 minutes"
  alarm_actions       = [aws_sns_topic.order_alerts.arn]

  dimensions = {
    InstanceId = aws_instance.app_server.id
  }

  tags = {
    Name = "${var.project_name}-high-cpu-alarm"
  }
}

# ── CloudWatch Alarm: RDS High CPU Utilization (>80%) ─────────
resource "aws_cloudwatch_metric_alarm" "rds_high_cpu" {
  alarm_name          = "${var.project_name}-rds-high-cpu-alarm"
  comparison_operator = "GreaterThanOrEqualToThreshold"
  evaluation_periods  = 2
  metric_name         = "CPUUtilization"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 80
  alarm_description   = "Triggered when RDS PostgreSQL CPU exceeds 80% for 10 minutes"
  alarm_actions       = [aws_sns_topic.order_alerts.arn]

  dimensions = {
    DBInstanceIdentifier = local.rds_identifier
  }

  tags = {
    Name = "${var.project_name}-rds-high-cpu-alarm"
  }
}

# ── CloudWatch Alarm: RDS Low Storage (<2 GB remaining) ───────
resource "aws_cloudwatch_metric_alarm" "rds_low_storage" {
  alarm_name          = "${var.project_name}-rds-low-storage-alarm"
  comparison_operator = "LessThanOrEqualToThreshold"
  evaluation_periods  = 1
  metric_name         = "FreeStorageSpace"
  namespace           = "AWS/RDS"
  period              = 300
  statistic           = "Average"
  threshold           = 2147483648 # 2 GB in bytes
  alarm_description   = "Triggered when RDS Free Storage Space drops below 2 GB"
  alarm_actions       = [aws_sns_topic.order_alerts.arn]

  dimensions = {
    DBInstanceIdentifier = local.rds_identifier
  }

  tags = {
    Name = "${var.project_name}-rds-low-storage-alarm"
  }
}

# ── Unified CloudWatch Monitoring Dashboard ───────────────────
resource "aws_cloudwatch_dashboard" "main" {
  dashboard_name = "${var.project_name}-operations-dashboard"

  dashboard_body = jsonencode({
    widgets = [
      {
        type   = "metric"
        x      = 0
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/EC2", "CPUUtilization", "InstanceId", aws_instance.app_server.id]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "EC2 Compute Server CPU Utilization (%)"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 0
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/RDS", "CPUUtilization", "DBInstanceIdentifier", local.rds_identifier],
            [".", "DatabaseConnections", ".", "."]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "RDS PostgreSQL CPU & Active Connections"
        }
      },
      {
        type   = "metric"
        x      = 0
        y      = 6
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/SQS", "ApproximateNumberOfMessagesVisible", "QueueName", aws_sqs_queue.orders.name]
          ]
          period = 300
          stat   = "Sum"
          region = var.aws_region
          title  = "SQS Orders Queue Depth"
        }
      },
      {
        type   = "metric"
        x      = 12
        y      = 6
        width  = 12
        height = 6
        properties = {
          metrics = [
            ["AWS/ApplicationELB", "TargetResponseTime", "LoadBalancer", aws_lb.app.arn_suffix]
          ]
          period = 300
          stat   = "Average"
          region = var.aws_region
          title  = "ALB Target Latency / Response Time"
        }
      }
    ]
  })
}
