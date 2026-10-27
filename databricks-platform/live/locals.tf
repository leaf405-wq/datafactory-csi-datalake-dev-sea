locals {
  # Schema 名和表结构写在这里，三个环境共用这一份。
  # 环境差异只出现在 envs/*.tfvars，不要把表结构复制进 tfvars。
  schema_names = ["bronze", "silver", "gold"]

  tables = {
    orders = {
      schema_name = "silver"
      comment     = "订单明细。结构在所有环境保持一致，数据落在各自 catalog 下。"
      columns = [
        {
          name     = "order_id"
          type     = "STRING"
          comment  = "订单号"
          nullable = false
        },
        {
          name    = "order_date"
          type    = "DATE"
          comment = "订单日期"
        },
        {
          name    = "amount"
          type    = "DECIMAL(18,2)"
          comment = "金额"
        },
        {
          name    = "updated_at"
          type    = "TIMESTAMP"
          comment = "源系统更新时间"
        }
      ]
    }
  }
}
