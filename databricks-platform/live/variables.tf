variable "environment" {
  description = "部署环境。决定 catalog 后缀、state key，以及 schedule 是否暂停。"
  type        = string

  validation {
    condition     = contains(["dev", "test", "prod"], var.environment)
    error_message = "environment 只能是 dev、test 或 prod。"
  }
}

variable "workspace_resource_id" {
  description = "本环境 Databricks workspace 的 Azure 资源 ID。三个环境各不相同。"
  type        = string
}

variable "domain" {
  description = "业务域。Catalog 名为 <domain>_<environment>，例如 sales_dev。"
  type        = string
  default     = "sales"
}

variable "storage_root" {
  description = "Catalog 托管表的根路径（abfss://）。留空则使用 metastore 的默认根路径，只适合第一次打通；正式环境必须按环境分开。"
  type        = string
  default     = ""
}

variable "force_destroy" {
  description = "为 true 时，destroy 会连带删除 catalog / schema 里的表。prod 必须保持 false。"
  type        = bool
  default     = false
}

variable "engineer_group" {
  description = "账号级用户组，拥有建表和改表权限。建议按环境拆组。"
  type        = string
}

variable "analyst_group" {
  description = "账号级用户组，只读。"
  type        = string
}

variable "job_runner_application_id" {
  description = "跑 job 的服务主体 Application (client) ID。同时是集群 SINGLE_USER 身份。"
  type        = string
}

variable "warehouse_id" {
  description = "用来执行建表 SQL 的 SQL Warehouse ID。留空时 provider 会临时拉起一个名为 terraform-sql-table 的集群。"
  type        = string
  default     = ""
}

variable "git_url" {
  description = "Job 源代码仓库的 HTTPS 地址。Azure Repos 或 GitHub 都可以。"
  type        = string
}

variable "git_provider" {
  description = "gitHub 或 azureDevOpsServices。"
  type        = string
  default     = "gitHub"

  validation {
    condition     = contains(["gitHub", "azureDevOpsServices"], var.git_provider)
    error_message = "git_provider 只能是 gitHub 或 azureDevOpsServices。"
  }
}

variable "git_branch" {
  description = "本环境 job 拉取的分支。常见约定：dev=develop，test=release，prod=main。"
  type        = string
}

variable "schedule_cron" {
  description = "Quartz cron。三个环境保持同一条，是否真正跑由 schedule_status 控制。"
  type        = string
  default     = "0 0 6 * * ?"
}

variable "schedule_timezone" {
  description = "Java 时区 ID。cron 按这个时区计算。"
  type        = string
  default     = "Asia/Shanghai"
}

variable "schedule_status" {
  description = "PAUSED 或 UNPAUSED。dev/test 用 PAUSED，prod 用 UNPAUSED。"
  type        = string

  validation {
    condition     = contains(["PAUSED", "UNPAUSED"], var.schedule_status)
    error_message = "schedule_status 只能是 PAUSED 或 UNPAUSED。"
  }
}

variable "spark_version" {
  description = "Job 集群的 Databricks Runtime。三个环境用同一个 LTS，升级时一起改。"
  type        = string
}

variable "node_type_id" {
  description = "Azure VM 规格，例如 Standard_D4ds_v5。"
  type        = string
}

variable "num_workers" {
  description = "Job 集群 worker 数。dev/test 可以比 prod 小。"
  type        = number
}

variable "azure_availability" {
  description = "ON_DEMAND_AZURE、SPOT_AZURE 或 SPOT_WITH_FALLBACK_AZURE。"
  type        = string
  default     = "ON_DEMAND_AZURE"
}

variable "alert_emails" {
  description = "Job 失败时通知的邮箱。空列表表示不发邮件。"
  type        = list(string)
  default     = []
}
