# ============================================================
# AWS Security & Compliance (Module 6)
# AWS KMS (Key Management Service) & AWS WAF (Web Application Firewall)
# ============================================================

# ── AWS KMS Customer Managed Key (CMK) ────────────────────────
resource "aws_kms_key" "app_cmk" {
  description             = "KMS Key for ${var.project_name} S3, RDS, and EBS encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = {
    Name = "${var.project_name}-cmk"
  }
}

resource "aws_kms_alias" "app_cmk_alias" {
  name          = "alias/${var.project_name}-key"
  target_key_id = aws_kms_key.app_cmk.key_id
}

# ── AWS WAFv2 Web ACL (Protection against OWASP Top 10 & DDoS) 
resource "aws_wafv2_web_acl" "alb_waf" {
  name        = "${var.project_name}-alb-waf"
  description = "Web Application Firewall protecting ALB against SQL injection, XSS, and bots"
  scope       = "REGIONAL"

  default_action {
    allow {}
  }

  # Rule 1: Common Attack Rule Set (OWASP Top 10)
  rule {
    name     = "AWSManagedRulesCommonRuleSet"
    priority = 10

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesCommonRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "CommonRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  # Rule 2: SQL Injection Prevention
  rule {
    name     = "AWSManagedRulesSQLiRuleSet"
    priority = 20

    override_action {
      none {}
    }

    statement {
      managed_rule_group_statement {
        name        = "AWSManagedRulesSQLiRuleSet"
        vendor_name = "AWS"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "SQLiRuleSetMetric"
      sampled_requests_enabled   = true
    }
  }

  # Rule 3: Rate Limiting (Mitigate Layer 7 DoS)
  rule {
    name     = "RateLimitPerIp"
    priority = 30

    action {
      block {}
    }

    statement {
      rate_based_statement {
        limit              = 500
        aggregate_key_type = "IP"
      }
    }

    visibility_config {
      cloudwatch_metrics_enabled = true
      metric_name                = "RateLimitMetric"
      sampled_requests_enabled   = true
    }
  }

  visibility_config {
    cloudwatch_metrics_enabled = true
    metric_name                = "${var.project_name}-waf-metric"
    sampled_requests_enabled   = true
  }

  tags = {
    Name = "${var.project_name}-alb-waf"
  }
}

# ── Associate WAF with ALB ────────────────────────────────────
resource "aws_wafv2_web_acl_association" "alb_assoc" {
  resource_arn = aws_lb.app.arn
  web_acl_arn  = aws_wafv2_web_acl.alb_waf.arn
}
