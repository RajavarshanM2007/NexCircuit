# ============================================================
# AWS Identity and Access Management (IAM) — Module 1
# ============================================================

# ── EC2 Assume Role Policy ────────────────────────────────────
data "aws_iam_policy_document" "ec2_assume_role" {
  statement {
    actions = ["sts:AssumeRole"]
    principals {
      type        = "Service"
      identifiers = ["ec2.amazonaws.com"]
    }
  }
}

# ── EC2 App Server Role ───────────────────────────────────────
resource "aws_iam_role" "ec2_role" {
  name               = "${var.project_name}-ec2-app-role"
  assume_role_policy = data.aws_iam_policy_document.ec2_assume_role.json

  tags = {
    Name = "${var.project_name}-ec2-app-role"
  }
}

# ── Least-Privilege App Policy (S3, SSM, SQS, SNS, CloudWatch) 
resource "aws_iam_policy" "app_permissions" {
  name        = "${var.project_name}-app-policy"
  description = "Grants least-privilege access for S3, SSM, SQS, SNS, and CloudWatch"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      # S3 Media Access
      {
        Sid    = "S3MediaAccess"
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:DeleteObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.media.arn,
          "${aws_s3_bucket.media.arn}/*"
        ]
      },
      # SSM Parameter Store
      {
        Sid    = "SSMConfigAccess"
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath"
        ]
        Resource = "arn:aws:ssm:${var.aws_region}:*:parameter/${var.project_name}/*"
      },
      # SQS Queue Access
      {
        Sid    = "SQSOrderQueueAccess"
        Effect = "Allow"
        Action = [
          "sqs:SendMessage",
          "sqs:ReceiveMessage",
          "sqs:DeleteMessage",
          "sqs:GetQueueAttributes"
        ]
        Resource = aws_sqs_queue.orders.arn
      },
      # SNS Topic Publish
      {
        Sid    = "SNSTopicPublish"
        Effect = "Allow"
        Action = [
          "sns:Publish"
        ]
        Resource = aws_sns_topic.order_alerts.arn
      },
      # CloudWatch Logs & Metrics
      {
        Sid    = "CloudWatchTelemetry"
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "cloudwatch:PutMetricData"
        ]
        Resource = "*"
      }
    ]
  })
}

# Attach App Policy to EC2 Role
resource "aws_iam_role_policy_attachment" "app_attach" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = aws_iam_policy.app_permissions.arn
}

# Attach AWS Systems Manager Managed Policy (Enables Secure Web Console Access without SSH Keys)
resource "aws_iam_role_policy_attachment" "ssm_core_attach" {
  role       = aws_iam_role.ec2_role.name
  policy_arn = "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
}

# ── EC2 Instance Profile ──────────────────────────────────────
resource "aws_iam_instance_profile" "ec2_profile" {
  name = "${var.project_name}-ec2-instance-profile"
  role = aws_iam_role.ec2_role.name
}
