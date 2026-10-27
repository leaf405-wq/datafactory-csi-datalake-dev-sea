ENV ?= dev

.PHONY: fmt validate init plan apply

fmt:
	terraform fmt -recursive .

validate:
	terraform -chdir=live init -backend=false -input=false
	terraform -chdir=live validate

init:
	terraform -chdir=live init -input=false -backend-config=envs/$(ENV).backend.hcl

plan:
	terraform -chdir=live plan -input=false -var-file=envs/$(ENV).tfvars

apply:
	terraform -chdir=live apply -input=false -var-file=envs/$(ENV).tfvars
