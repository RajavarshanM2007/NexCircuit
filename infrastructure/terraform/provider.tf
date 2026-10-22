terraform {
  required_version = ">= 1.5.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.5"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project     = "VITElectronics"
      Environment = var.environment
      ManagedBy   = "Terraform"
      CostCenter  = "FreeTier"
    }
  }
}

resource "random_id" "suffix" {
  byte_length = 4
}
