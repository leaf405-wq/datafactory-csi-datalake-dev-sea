variable "catalog_name" {
  description = "父 catalog 名，由 unity_catalog 模块输出。"
  type        = string
}

variable "warehouse_id" {
  description = "执行建表语句的 SQL Warehouse。空字符串则由 provider 临时建集群。"
  type        = string
  default     = ""
}

variable "tables" {
  description = "逻辑表定义。key 是表名，三个环境共用。"
  type = map(object({
    schema_name = string
    comment     = string
    columns = list(object({
      name     = string
      type     = string
      comment  = optional(string)
      nullable = optional(bool, true)
    }))
  }))
}
