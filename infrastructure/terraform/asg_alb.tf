# ============================================================
# AWS Elastic Load Balancing (ALB) & Auto Scaling Group (ASG)
# Module 2 (Compute & Auto Scaling) + Module 7 (Architecture)
# ============================================================

# ── Application Load Balancer Security Group ──────────────────
resource "aws_security_group" "alb" {
  name        = "${var.project_name}-alb-sg"
  description = "Allows public HTTP/HTTPS traffic to Application Load Balancer"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP from anywhere"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "HTTPS from anywhere"
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    description = "Outbound to EC2 targets"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-alb-sg"
  }
}

# ── Application Load Balancer (Multi-AZ) ──────────────────────
resource "aws_lb" "app" {
  name               = "${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = [aws_subnet.public_1.id, aws_subnet.public_2.id]

  enable_deletion_protection = false

  tags = {
    Name        = "${var.project_name}-alb"
    Environment = var.environment
  }
}

# ── Target Group (Port 3000 Storefront / App) ─────────────────
resource "aws_lb_target_group" "app" {
  name        = "${var.project_name}-tg"
  port        = 3000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "instance"

  health_check {
    enabled             = true
    path                = "/api/health"
    port                = "3000"
    protocol            = "HTTP"
    matcher             = "200-399"
    interval            = 30
    timeout             = 5
    healthy_threshold   = 2
    unhealthy_threshold = 3
  }

  tags = {
    Name = "${var.project_name}-tg"
  }
}

# ── ALB Listener (HTTP Port 80) ───────────────────────────────
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.app.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}

# ── Attach Single EC2 App Server to ALB Target Group ──────────
resource "aws_lb_target_group_attachment" "single_ec2" {
  target_group_arn = aws_lb_target_group.app.arn
  target_id        = aws_instance.app_server.id
  port             = 3000
}

# ── EC2 Launch Template (For Auto Scaling Group) ──────────────
resource "aws_launch_template" "app" {
  name_prefix   = "${var.project_name}-launch-template-"
  image_id      = data.aws_ami.ubuntu.id
  instance_type = var.ec2_instance_type
  key_name      = var.ec2_key_name != "" ? var.ec2_key_name : null

  iam_instance_profile {
    name = aws_iam_instance_profile.ec2_profile.name
  }

  network_interfaces {
    associate_public_ip_address = true
    security_groups             = [aws_security_group.ec2.id]
  }

  user_data = base64encode(local.ec2_user_data)

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "${var.project_name}-asg-instance"
    }
  }

  lifecycle {
    create_before_destroy = true
  }
}

# ── Auto Scaling Group (Multi-AZ Resiliency & Elasticity) ──────
resource "aws_autoscaling_group" "app" {
  name_prefix         = "${var.project_name}-asg-"
  min_size            = 1
  max_size            = 3
  desired_capacity    = 1
  vpc_zone_identifier = [aws_subnet.public_1.id, aws_subnet.public_2.id]

  target_group_arns = [aws_lb_target_group.app.arn]

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }

  health_check_type         = "ELB"
  health_check_grace_period = 300

  tag {
    key                 = "Name"
    value               = "${var.project_name}-asg-node"
    propagate_at_launch = true
  }

  lifecycle {
    create_before_destroy = true
    ignore_changes        = [desired_capacity]
  }
}

# ── Auto Scaling Policy: Target Tracking (CPU > 70%) ──────────
resource "aws_autoscaling_policy" "cpu_scaling" {
  name                   = "${var.project_name}-target-cpu-70"
  autoscaling_group_name = aws_autoscaling_group.app.name
  policy_type            = "TargetTrackingScaling"

  target_tracking_configuration {
    predefined_metric_specification {
      predefined_metric_type = "ASGAverageCPUUtilization"
    }
    target_value = 70.0
  }
}
