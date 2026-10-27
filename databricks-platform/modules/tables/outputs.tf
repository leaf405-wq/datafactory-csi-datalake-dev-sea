output "table_ids" {
  description = "catalog.schema.table"
  value       = { for name, table in databricks_sql_table.this : name => table.id }
}
