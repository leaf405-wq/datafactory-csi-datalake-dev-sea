output "job_id" {
  description = "Workspace 内的 job id。"
  value       = databricks_job.this.id
}

output "job_url" {
  description = "Job 页面 URL。"
  value       = databricks_job.this.url
}
