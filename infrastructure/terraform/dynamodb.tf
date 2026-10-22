# ============================================================
# Amazon DynamoDB (Module 4 — Database Services, 100% Free Tier)
# 25 GB storage + 25 RCU / 25 WCU free
# ============================================================

resource "aws_dynamodb_table" "app_sessions" {
  name         = "${var.project_name}-cart-sessions"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "session_id"
  range_key    = "created_at"

  attribute {
    name = "session_id"
    type = "S"
  }

  attribute {
    name = "created_at"
    type = "N"
  }

  ttl {
    attribute_name = "ttl"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = false
  }

  tags = {
    Name = "${var.project_name}-cart-sessions"
  }
}
