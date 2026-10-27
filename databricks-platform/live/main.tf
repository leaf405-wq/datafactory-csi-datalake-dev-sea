module "unity_catalog" {
  source = "../modules/unity_catalog"

  domain                    = var.domain
  environment               = var.environment
  storage_root              = var.storage_root
  force_destroy             = var.force_destroy
  schema_names              = local.schema_names
  engineer_group            = var.engineer_group
  analyst_group             = var.analyst_group
  job_runner_application_id = var.job_runner_application_id
}

module "tables" {
  source = "../modules/tables"

  catalog_name = module.unity_catalog.catalog_name
  warehouse_id = var.warehouse_id
  tables       = local.tables

  # schema 名是普通字符串，Terraform 看不到隐藏依赖，必须显式等待 schema 建完。
  depends_on = [module.unity_catalog]
}

module "load_orders_job" {
  source = "../modules/job"

  job_name                  = "load_orders"
  environment               = var.environment
  catalog_name              = module.unity_catalog.catalog_name
  notebook_path             = "databricks-platform/src/notebooks/load_orders"
  git_url                   = var.git_url
  git_provider              = var.git_provider
  git_branch                = var.git_branch
  schedule_cron             = var.schedule_cron
  schedule_timezone         = var.schedule_timezone
  schedule_status           = var.schedule_status
  job_runner_application_id = var.job_runner_application_id
  spark_version             = var.spark_version
  node_type_id              = var.node_type_id
  num_workers               = var.num_workers
  azure_availability        = var.azure_availability
  alert_emails              = var.alert_emails

  depends_on = [module.tables]
}
