resource "databricks_sql_table" "this" {
  for_each = var.tables

  name         = each.key
  catalog_name = var.catalog_name
  schema_name  = each.value.schema_name
  table_type   = "MANAGED"
  warehouse_id = var.warehouse_id != "" ? var.warehouse_id : null
  comment      = each.value.comment

  dynamic "column" {
    for_each = each.value.columns

    content {
      name     = column.value.name
      type     = column.value.type
      comment  = column.value.comment
      nullable = column.value.nullable
    }
  }
}
