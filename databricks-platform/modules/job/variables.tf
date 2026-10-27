variable "job_name" {
  description = "Job 名。Workspace 范围内唯一即可，三个 workspace 可以用同一个名字。"
  type        = string
}

variable "environment" {
  description = "写入 job 参数，笔记本用它区分环境，而不是靠分支名猜测。"
  type        = string
}

variable "catalog_name" {
  description = "传给笔记本的 catalog。dev 是 sales_dev，prod 是 sales_prod。"
  type        = string
}

variable "notebook_path" {
  description = "相对 git 仓库根目录的笔记本路径，不带 .py 后缀。"
  type        = string
}

variable "git_url" {
  description = "仓库 HTTPS 地址。"
  type        = string
}

variable "git_provider" {
  description = "gitHub 或 azureDevOpsServices。"
  type        = string
}

variable "git_branch" {
  description = "本环境要跑的分支。"
  type        = string
}

variable "schedule_cron" {
  description = "Quartz cron，例如每天 06:00 是 0 0 6 * * ?。"
  type        = string
}

variable "schedule_timezone" {
  description = "Java 时区 ID。"
  type        = string
}

variable "schedule_status" {
  description = "PAUSED 或 UNPAUSED。"
  type        = string
}

variable "job_runner_application_id" {
  description = "run_as 以及 SINGLE_USER 集群使用的服务主体 Application ID。"
  type        = string
}

variable "spark_version" {
  description = "Databricks Runtime 版本字符串。"
  type        = string
}

variable "node_type_id" {
  description = "Azure 节点规格。"
  type        = string
}

variable "num_workers" {
  description = "Worker 数量。"
  type        = number
}

variable "azure_availability" {
  description = "节点购买方式。"
  type        = string
}

variable "alert_emails" {
  description = "失败通知邮箱。"
  type        = list(string)
  default     = []
}
