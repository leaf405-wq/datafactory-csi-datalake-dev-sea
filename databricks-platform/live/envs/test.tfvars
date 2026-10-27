environment     = "test"
domain          = "sales"
force_destroy   = false
schedule_status = "PAUSED"

workspace_resource_id = "/subscriptions/00000000-0000-0000-0000-000000000000/resourceGroups/rg-dbw-test/providers/Microsoft.Databricks/workspaces/dbw-test"

storage_root = ""

engineer_group            = "sales-engineers-test"
analyst_group             = "sales-analysts-test"
job_runner_application_id = "00000000-0000-0000-0000-000000000000"
warehouse_id              = ""

git_url      = "https://github.com/your-org/agent_go_v1"
git_provider = "gitHub"
git_branch   = "release"

schedule_cron     = "0 0 6 * * ?"
schedule_timezone = "Asia/Shanghai"

spark_version      = "15.4.x-scala2.12"
node_type_id       = "Standard_D4ds_v5"
num_workers        = 1
azure_availability = "ON_DEMAND_AZURE"
alert_emails       = []
