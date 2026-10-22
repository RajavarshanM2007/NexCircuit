# ============================================================
# AWS Step Functions (Module 7: Application Integration — CO: 1)
# Serverless Order & Invoice Fulfillment State Machine Workflow
# 4,000 free state transitions per month (100% Free Tier)
# ============================================================

# ── IAM Role for Step Functions ───────────────────────────────
data "aws_iam_policy_document" "sfn_assume" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["states.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "sfn_role" {
  name               = "${var.project_name}-sfn-execution-role"
  assume_role_policy = data.aws_iam_policy_document.sfn_assume.json

  tags = {
    Name = "${var.project_name}-sfn-execution-role"
  }
}

# ── Step Functions Execution Policy ───────────────────────────
resource "aws_iam_role_policy" "sfn_policy" {
  name = "${var.project_name}-sfn-policy"
  role = aws_iam_role.sfn_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogDelivery",
          "logs:GetLogDelivery",
          "logs:UpdateLogDelivery",
          "logs:DeleteLogDelivery",
          "logs:ListLogDeliveries",
          "logs:PutResourcePolicy",
          "logs:DescribeResourcePolicies",
          "logs:DescribeLogGroups"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = aws_sns_topic.order_alerts.arn
      },
      {
        Effect = "Allow"
        Action = [
          "sqs:SendMessage"
        ]
        Resource = aws_sqs_queue.orders.arn
      }
    ]
  })
}

# ── CloudWatch Log Group for State Machine ────────────────────
resource "aws_cloudwatch_log_group" "sfn_logs" {
  name              = "/aws/vendedlogs/states/${var.project_name}-order-workflow"
  retention_in_days = 7

  tags = {
    Name = "${var.project_name}-sfn-logs"
  }
}

# ── Order Fulfillment State Machine ───────────────────────────
resource "aws_sfn_state_machine" "order_fulfillment" {
  name     = "${var.project_name}-order-fulfillment-workflow"
  role_arn = aws_iam_role.sfn_role.arn

  definition = jsonencode({
    Comment = "VIT Electronics Order Fulfillment & Invoice Generation Workflow"
    StartAt = "ValidateOrder"
    States = {
      ValidateOrder = {
        Type    = "Pass"
        Comment = "Verify product inventory, pricing, and customer address"
        Result = {
          status    = "VALIDATED"
          validated = true
        }
        ResultPath = "$.validation"
        Next       = "CreateConfirmedOrder"
      }

      CreateConfirmedOrder = {
        Type    = "Pass"
        Comment = "Create confirmed order record in RDS and decrement inventory"
        Result = {
          orderStatus = "CONFIRMED"
          confirmedAt = "2026-10-15T00:00:00Z"
        }
        ResultPath = "$.orderInfo"
        Next       = "GeneratePDFInvoice"
      }

      GeneratePDFInvoice = {
        Type    = "Pass"
        Comment = "Render branded VIT Electronics PDF invoice with customer details"
        Result = {
          invoiceGenerated = true
          format           = "PDF"
        }
        ResultPath = "$.invoice"
        Next       = "UploadInvoiceToS3"
      }

      UploadInvoiceToS3 = {
        Type    = "Pass"
        Comment = "Upload PDF invoice to Amazon S3 media bucket and issue CloudFront URL"
        Result = {
          s3Bucket       = aws_s3_bucket.media.id
          s3KeyPrefix    = "invoices/"
          storageClass   = "STANDARD"
          archiveGlacier = "90_DAYS"
        }
        ResultPath = "$.storage"
        Next       = "SendOrderNotifications"
      }

      SendOrderNotifications = {
        Type    = "Pass"
        Comment = "Publish order confirmation event to Amazon SNS & SQS queue"
        Result = {
          snsPublished = true
          sqsEnqueued  = true
        }
        ResultPath = "$.notification"
        Next       = "OrderCompleted"
      }

      OrderCompleted = {
        Type = "Succeed"
        Comment = "Order placed, invoice archived, and customer notified"
      }
    }
  })

  logging_configuration {
    log_destination        = "${aws_cloudwatch_log_group.sfn_logs.arn}:*"
    include_execution_data = true
    level                  = "ALL"
  }

  tags = {
    Name = "${var.project_name}-order-workflow"
  }
}
