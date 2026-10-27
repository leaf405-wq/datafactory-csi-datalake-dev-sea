# Workspace 级 provider。
# Catalog、schema、table、job 都从「这个环境自己的 workspace」创建。
# 认证不写在代码里：Azure DevOps 的 AzureCLI@2 + addSpnToEnvironment 会注入
# ARM_CLIENT_ID / ARM_CLIENT_SECRET / ARM_TENANT_ID / ARM_SUBSCRIPTION_ID，
# Databricks provider 用这组变量向该 workspace 换 token。
provider "databricks" {
  azure_workspace_resource_id = var.workspace_resource_id
}
