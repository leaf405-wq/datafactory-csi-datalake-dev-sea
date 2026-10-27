resource "databricks_job" "this" {
  name        = var.job_name
  description = "由 Terraform 部署。环境 ${var.environment}，catalog ${var.catalog_name}。"

  # 一个 schedule 管整条 job。任务之间用 depends_on 串起来，不要给每个任务各写一个 schedule。
  schedule {
    quartz_cron_expression = var.schedule_cron
    timezone_id            = var.schedule_timezone
    pause_status           = var.schedule_status
  }

  git_source {
    url      = var.git_url
    provider = var.git_provider
    branch   = var.git_branch
  }

  run_as {
    service_principal_name = var.job_runner_application_id
  }

  max_concurrent_runs = 1

  job_cluster {
    job_cluster_key = "shared"

    new_cluster {
      spark_version      = var.spark_version
      node_type_id       = var.node_type_id
      num_workers        = var.num_workers
      data_security_mode = "SINGLE_USER"
      single_user_name   = var.job_runner_application_id

      azure_attributes {
        availability = var.azure_availability
      }

      custom_tags = {
        environment = var.environment
        managed_by  = "terraform"
        job         = var.job_name
      }
    }
  }

  task {
    task_key        = "bronze_to_silver"
    job_cluster_key = "shared"

    notebook_task {
      notebook_path = var.notebook_path
      source        = "GIT"

      base_parameters = {
        catalog     = var.catalog_name
        environment = var.environment
        step        = "bronze_to_silver"
      }
    }
  }

  task {
    task_key        = "silver_to_gold"
    job_cluster_key = "shared"

    depends_on {
      task_key = "bronze_to_silver"
    }

    notebook_task {
      notebook_path = var.notebook_path
      source        = "GIT"

      base_parameters = {
        catalog     = var.catalog_name
        environment = var.environment
        step        = "silver_to_gold"
      }
    }
  }

  dynamic "email_notifications" {
    for_each = length(var.alert_emails) == 0 ? [] : [1]

    content {
      on_failure = var.alert_emails
    }
  }
}
