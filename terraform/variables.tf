variable "aws_region" {
  description = "AWS Region for deployment"
  type        = string
  default     = "ap-south-1"
}

variable "project_name" {
  description = "Name prefix for all resources"
  type        = string
  default     = "janv"
}

variable "environment" {
  description = "Deployment environment"
  type        = string
  default     = "production"
}

variable "instance_type" {
  description = "EC2 instance type for application server"
  type        = string
  default     = "t3.medium"
}

variable "db_instance_class" {
  description = "RDS instance class for PostgreSQL"
  type        = string
  default     = "db.t4g.micro"
}

variable "db_name" {
  description = "PostgreSQL default database name"
  type        = string
  default     = "janv_db"
}

variable "db_username" {
  description = "PostgreSQL master username"
  type        = string
  default     = "janv_admin"
}

variable "db_password" {
  description = "PostgreSQL master password"
  type        = string
  sensitive   = true
  default     = "JanvMasterSecurePass2026!"
}

variable "jwt_secret" {
  description = "JWT secret key for API authentication"
  type        = string
  sensitive   = true
  default     = "janv-super-secure-production-jwt-token-key-2026-xyz"
}

variable "super_admin_email" {
  description = "Super admin email address"
  type        = string
  default     = "admin@janv.dev"
}

variable "super_admin_password" {
  description = "Super admin initial password"
  type        = string
  sensitive   = true
  default     = "AdminPass2026!"
}
