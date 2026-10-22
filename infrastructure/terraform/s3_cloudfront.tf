# ============================================================
# Amazon S3 & Amazon CloudFront (Storage & Content Delivery)
# Module 2 (S3 & Lifecycle) + Module 3 (CloudFront CDN)
# ============================================================

# ── S3 Bucket (Media & Assets) ────────────────────────────────
resource "aws_s3_bucket" "media" {
  bucket        = "${var.project_name}-media-${random_id.suffix.hex}"
  force_destroy = true

  tags = {
    Name = "${var.project_name}-media-bucket"
  }
}

# Block all direct public access (Served securely via CloudFront OAC)
resource "aws_s3_bucket_public_access_block" "media" {
  bucket = aws_s3_bucket.media.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# ── S3 Lifecycle Policies (Storage Classes & Cost Optimization) 
resource "aws_s3_bucket_lifecycle_configuration" "media_lifecycle" {
  bucket = aws_s3_bucket.media.id

  # Rule 1: Clean up temporary uploads after 30 days
  rule {
    id     = "expire-temp-uploads"
    status = "Enabled"

    filter {
      prefix = "temp/"
    }

    expiration {
      days = 30
    }
  }

  # Rule 2: Transition archived invoices to Glacier after 90 days
  rule {
    id     = "archive-old-invoices-to-glacier"
    status = "Enabled"

    filter {
      prefix = "invoices/"
    }

    transition {
      days          = 90
      storage_class = "GLACIER"
    }
  }
}

# ── S3 CORS Configuration (Web App Browser Uploads) ───────────
resource "aws_s3_bucket_cors_configuration" "media" {
  bucket = aws_s3_bucket.media.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "DELETE", "HEAD"]
    allowed_origins = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# ── CloudFront Origin Access Control (OAC) ────────────────────
resource "aws_cloudfront_origin_access_control" "oac" {
  name                              = "${var.project_name}-s3-oac"
  description                       = "OAC policy for VIT Electronics S3 media bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# ── Amazon CloudFront Distribution (1 TB / Month Free Tier) ───
resource "aws_cloudfront_distribution" "media_cdn" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "CloudFront CDN for ${var.project_name} media assets"
  price_class         = "PriceClass_100" # Free tier optimal: North America & Europe edges

  origin {
    domain_name              = aws_s3_bucket.media.bucket_regional_domain_name
    origin_id                = "S3-${aws_s3_bucket.media.id}"
    origin_access_control_id = aws_cloudfront_origin_access_control.oac.id
  }

  default_cache_behavior {
    allowed_methods  = ["GET", "HEAD", "OPTIONS"]
    cached_methods   = ["GET", "HEAD"]
    target_origin_id = "S3-${aws_s3_bucket.media.id}"

    forwarded_values {
      query_string = false
      headers      = ["Origin", "Access-Control-Request-Headers", "Access-Control-Request-Method"]

      cookies {
        forward = "none"
      }
    }

    viewer_protocol_policy = "redirect-to-https"
    min_ttl                = 0
    default_ttl            = 86400    # 1 day
    max_ttl                = 31536000 # 1 year
    compress               = true
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name = "${var.project_name}-cloudfront-cdn"
  }
}

# ── S3 Bucket Policy allowing CloudFront OAC Read Access ──────
resource "aws_s3_bucket_policy" "allow_cloudfront" {
  bucket = aws_s3_bucket.media.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowCloudFrontServicePrincipalReadOnly"
        Effect    = "Allow"
        Principal = {
          Service = "cloudfront.amazonaws.com"
        }
        Action   = "s3:GetObject"
        Resource = "${aws_s3_bucket.media.arn}/*"
        Condition = {
          StringEquals = {
            "AWS:SourceArn" = aws_cloudfront_distribution.media_cdn.arn
          }
        }
      }
    ]
  })
}
