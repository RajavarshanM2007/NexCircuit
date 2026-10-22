# ============================================================
# Amazon EC2 & EBS (Module 2: Compute & Storage)
# 100% Free Tier (750 hrs/month t3.micro/t2.micro + 30 GB EBS gp3)
# ============================================================

# ── Latest Ubuntu 24.04 LTS AMI ───────────────────────────────
data "aws_ami" "ubuntu" {
  most_recent = true
  owners      = ["099720109477"] # Canonical

  filter {
    name   = "name"
    values = ["ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

locals {
  ec2_user_data = <<-EOF
              #!/bin/bash
              set -e

              # 1. System updates & essential packages
              export DEBIAN_FRONTEND=noninteractive
              apt-get update -y
              apt-get upgrade -y
              apt-get install -y ca-certificates curl gnupg lsb-release git unzip postgresql-client-common postgresql-client

              # 2. Add 2GB Swap space (Optimizes t3.micro 1GB RAM for Next.js builds)
              if [ ! -f /swapfile ]; then
                fallocate -l 2G /swapfile
                chmod 600 /swapfile
                mkswap /swapfile
                swapon /swapfile
                echo '/swapfile none swap sw 0 0' >> /etc/fstab
              fi

              # 3. Install Docker & Docker Compose
              install -m 0755 -d /etc/apt/keyrings
              curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
              chmod a+r /etc/apt/keyrings/docker.gpg
              echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
              apt-get update -y
              apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

              usermod -aG docker ubuntu
              systemctl enable docker
              systemctl start docker

              # 4. Install AWS CLI v2
              curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
              unzip -q awscliv2.zip
              ./aws/install
              rm -rf aws awscliv2.zip

              # 5. Prepare workspace directory and clone repo
              mkdir -p /home/ubuntu/app
              chown -R ubuntu:ubuntu /home/ubuntu/app
              su - ubuntu -c "git clone https://github.com/RajavarshanM2007/NexCircuit.git /home/ubuntu/app || true"
              su - ubuntu -c "cd /home/ubuntu/app && docker compose -f infrastructure/docker-compose.local.yml up -d || true"

              # 6. Log readiness
              echo "VIT Electronics EC2 Instance initialization completed successfully at $(date)" > /var/log/vitelectronics-init.log
              EOF
}

# ── EC2 App Server Instance ───────────────────────────────────
resource "aws_instance" "app_server" {
  ami                  = data.aws_ami.ubuntu.id
  instance_type        = var.ec2_instance_type # t3.micro (Free Tier)
  subnet_id            = aws_subnet.public_1.id
  vpc_security_group_ids = [aws_security_group.ec2.id]
  iam_instance_profile = aws_iam_instance_profile.ec2_profile.name
  key_name             = var.ec2_key_name != "" ? var.ec2_key_name : null

  # 30 GB gp3 EBS root volume (Max Free Tier allowance)
  root_block_device {
    volume_size           = 30
    volume_type           = "gp3"
    delete_on_termination = true
    encrypted             = true

    tags = {
      Name = "${var.project_name}-ec2-root-ebs"
    }
  }

  user_data = local.ec2_user_data

  tags = {
    Name = "${var.project_name}-app-server"
  }
}

# ── Elastic IP (Static Public IP for EC2) ─────────────────────
resource "aws_eip" "app_ip" {
  instance = aws_instance.app_server.id
  domain   = "vpc"

  tags = {
    Name = "${var.project_name}-elastic-ip"
  }
}
