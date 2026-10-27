resource "databricks_catalog" "this" {
  name           = "${var.domain}_${var.environment}"
  comment        = "Terraform 管理的 ${var.domain} catalog（${var.environment}）。"
  isolation_mode = "ISOLATED"
  storage_root   = var.storage_root != "" ? var.storage_root : null
  force_destroy  = var.force_destroy

  properties = {
    environment = var.environment
    managed_by  = "terraform"
    domain      = var.domain
  }
}

resource "databricks_schema" "this" {
  for_each = toset(var.schema_names)

  catalog_name  = databricks_catalog.this.name
  name          = each.value
  comment       = "${each.value} schema（${var.environment}）。表结构与其他环境相同。"
  force_destroy = var.force_destroy
}

# databricks_grants 是覆盖式的：这个 catalog 上的授权以这里为准，
# 在界面上另加的 grant 下次 apply 会被清掉。每个 securable 只保留这一份资源。
resource "databricks_grants" "catalog" {
  catalog = databricks_catalog.this.name

  grant {
    principal = var.engineer_group
    privileges = [
      "USE_CATALOG",
      "USE_SCHEMA",
      "CREATE_SCHEMA",
      "CREATE_TABLE",
      "MODIFY",
      "SELECT",
    ]
  }

  grant {
    principal = var.job_runner_application_id
    privileges = [
      "USE_CATALOG",
      "USE_SCHEMA",
      "CREATE_TABLE",
      "MODIFY",
      "SELECT",
    ]
  }

  grant {
    principal = var.analyst_group
    privileges = [
      "USE_CATALOG",
      "USE_SCHEMA",
      "SELECT",
    ]
  }
}

# isolation_mode = ISOLATED 时，从哪个 workspace 创建，catalog 就自动绑到哪个 workspace。
# 不要在这里再绑 dev/test/prod 以外的 workspace，否则生产数据会从别的环境看见。
# 如果确实要给另一个 workspace 只读，再单独加 databricks_workspace_binding，
# binding_type = "BINDING_TYPE_READ_ONLY"。
