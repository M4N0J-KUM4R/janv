output "public_ip" {
  description = "Elastic Public IP of the application server"
  value       = aws_eip.app_eip.public_ip
}

output "app_url" {
  description = "Public URL of the Janv application"
  value       = "http://${aws_eip.app_eip.public_ip}"
}

output "rds_endpoint" {
  description = "Endpoint address of the PostgreSQL RDS instance"
  value       = aws_db_instance.postgres.address
}

output "rds_port" {
  description = "Port of the PostgreSQL RDS instance"
  value       = aws_db_instance.postgres.port
}

output "database_url" {
  description = "Full connection string for the PostgreSQL database"
  value       = "postgres://${var.db_username}:${var.db_password}@${aws_db_instance.postgres.address}:${aws_db_instance.postgres.port}/${var.db_name}"
  sensitive   = true
}

output "ssh_command" {
  description = "Command to SSH into the application server"
  value       = "ssh -i ${path.module}/janv-ec2-key.pem ubuntu@${aws_eip.app_eip.public_ip}"
}
