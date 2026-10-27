terraform {
  required_version = ">= 1.6.0"

  required_providers {
    databricks = {
      source  = "databricks/databricks"
      version = "~> 1.90"
    }
  }

  # 远程状态按环境拆 key，具体账号写在 envs/<env>.backend.hcl。
  # 流水线执行 terraform init -backend-config=envs/${ENV}.backend.hcl
  backend "azurerm" {
    use_azuread_auth = true
  }
}
