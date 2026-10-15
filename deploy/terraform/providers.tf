# DealerOps cloud deployment, Terraform + Azure App Service (no containers).
# Architecture: design/07-Azure-Microservices-Architecture.md
# Operator procedure: deploy/README.md
#
# State is local (terraform.tfstate next to these files) and is git-ignored.
# One operator applies at a time; there is no shared remote backend.

terraform {
  required_version = ">= 1.9.0"

  required_providers {
    azurerm = {
      source  = "hashicorp/azurerm"
      version = "~> 4.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

provider "azurerm" {
  features {
    # Azure adds an untracked "Application Insights Smart Detection" action group to the
    # resource group, which otherwise blocks terraform destroy.
    resource_group {
      prevent_deletion_if_contains_resources = false
    }

    key_vault {
      # Student subscription: a destroyed vault must be reusable by name on the next apply.
      purge_soft_delete_on_destroy    = true
      recover_soft_deleted_key_vaults = true
    }
  }
}
