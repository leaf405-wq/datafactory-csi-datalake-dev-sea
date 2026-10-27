output "catalog_name" {
  description = "<domain>_<environment>"
  value       = databricks_catalog.this.name
}

output "schema_names" {
  description = "schema 全名，形如 sales_dev.silver。"
  value       = sort([for schema in databricks_schema.this : schema.id])
}
