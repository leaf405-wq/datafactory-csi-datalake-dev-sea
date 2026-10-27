environment     = "dev"
domain          = "sales"
force_destroy   = true
schedule_status = "PAUSED"

# 换成 dev workspace 的资源 ID：
# /subscriptions/<sub>/resourceGroups/<rg>/providers/Microsoft.Databricks/workspaces/<name>
workspace_resource_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-dbw-dev/providers/Microsoft.Databricks/workspaces/dbw-dev"

# 正式使用前改成该环境自己的托管路径，并先建好覆盖此路径的 external location。
# storage_root = "abfss://unity@stdbwsalesdev.dfs.core.windows.net/sales"
storage_root = ""

engineer_group            = "sales-engineers-dev"
analyst_group             = "sales-analysts-dev"
job_runner_application_id = "00000000-0000-0000-0000-000000000000"
warehouse_id              = ""

git_url      = "https://github.com/your-org/agent_go_v1"
git_provider = "gitHub"
git_branch   = "develop"

schedule_cron     = "0 0 6 * * ?"
schedule_timezone = "Asia/Shanghai"

spark_version      = "15.4.x-scala2.12"
node_type_id       = "Standard_D4ds_v5"
num_workers        = 1
azure_availability = "SPOT_WITH_FALLBACK_AZURE"
alert_emails       = []
