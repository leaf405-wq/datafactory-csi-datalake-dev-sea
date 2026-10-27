# Databricks notebook source
# 三个环境跑同一份笔记本。catalog 由 Terraform 的 base_parameters 注入，不要在代码里写 sales_dev。

# COMMAND ----------
dbutils.widgets.text("catalog", "")
dbutils.widgets.text("environment", "")
dbutils.widgets.text("step", "bronze_to_silver")

catalog = dbutils.widgets.get("catalog")
environment = dbutils.widgets.get("environment")
step = dbutils.widgets.get("step")

if not catalog:
    raise ValueError("缺少 catalog 参数。应由 Databricks job 的 base_parameters 传入。")

target = f"{catalog}.silver.orders"
print(f"environment={environment} step={step} target={target}")

# COMMAND ----------
if step == "bronze_to_silver":
    spark.sql(
        f"""
        CREATE TABLE IF NOT EXISTS {target} (
          order_id STRING NOT NULL,
          order_date DATE,
          amount DECIMAL(18,2),
          updated_at TIMESTAMP
        )
        COMMENT '订单明细'
        """
    )
elif step == "silver_to_gold":
    spark.sql(f"SELECT count(*) AS row_count FROM {target}").show()
else:
    raise ValueError(f"未知 step: {step}")
