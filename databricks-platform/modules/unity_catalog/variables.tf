variable "domain" {
  description = "业务域，catalog 名前缀。"
  type        = string
}

variable "environment" {
  description = "dev、test 或 prod，catalog 名后缀。"
  type        = string
}

variable "storage_root" {
  description = "托管存储根路径。空字符串表示不设置，沿用 metastore 根路径。"
  type        = string
  default     = ""
}

variable "force_destroy" {
  description = "是否允许 destroy 非空 catalog 和 schema。"
  type        = bool
  default     = false
}

variable "schema_names" {
  description = "要创建的 schema 名。三个环境传入同一份列表。"
  type        = list(string)
}

variable "engineer_group" {
  description = "可建表、改表的账号级组。"
  type        = string
}

variable "analyst_group" {
  description = "只读账号级组。"
  type        = string
}

variable "job_runner_application_id" {
  description = "Job 运行身份的 Application ID，需要读写业务表。"
  type        = string
}
