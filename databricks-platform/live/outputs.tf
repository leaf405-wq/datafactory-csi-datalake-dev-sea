output "catalog_name" {
  description = "本环境 catalog。Job 和笔记本都读这个名字，而不是写死 sales。"
  value       = module.unity_catalog.catalog_name
}

output "schema_names" {
  description = "已创建的 schema。"
  value       = module.unity_catalog.schema_names
}

output "table_ids" {
  description = "三层命名：catalog.schema.table。"
  value       = module.tables.table_ids
}

output "job_id" {
  description = "load_orders 的 workspace 内 job id。同名 job 在另一个 workspace 里会是另一个 id。"
  value       = module.load_orders_job.job_id
}

output "job_url" {
  description = "Job 页面链接。"
  value       = module.load_orders_job.job_url
}
