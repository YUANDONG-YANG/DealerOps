# One resource group holding the graded cloud demo:
#   3 x Linux App Service (Java 21 SE JAR)  - dealer-gateway public, dealer-core and ai-service locked to the plan
#   1 x Static Web App                      - the built Vue SPA
#   1 x MySQL Flexible Server               - schema owned by Flyway in dealer-core
#   1 x Key Vault                           - the five secret values, referenced by app settings
#   1 x Log Analytics + Application Insights
# No container registry and no container images: App Service runs the JARs directly.

data "azurerm_client_config" "current" {}

locals {
  resource_group_name = var.resource_group_name != "" ? var.resource_group_name : "${var.prefix}-rg"

  core_app_name    = "${var.prefix}-core${var.name_suffix}"
  ai_app_name      = "${var.prefix}-ai${var.name_suffix}"
  gateway_app_name = "${var.prefix}-gateway${var.name_suffix}"

  # App Service serves every app on 443 in front of the JVM, so all three bind the same
  # container port. The 8081 / 8082 split only matters locally.
  app_port = 8080

  core_internal_url   = "https://${local.core_app_name}.azurewebsites.net"
  ai_internal_url     = "https://${local.ai_app_name}.azurewebsites.net"
  gateway_public_url  = "https://${local.gateway_app_name}.azurewebsites.net"
  web_public_origin   = "https://${azurerm_static_web_app.web.default_host_name}"
  mysql_database_name = "dealer_core"
  seed_platform_admin = var.admin_username != "" && var.admin_password != ""
  configure_model_key = var.aimanager_api_key != ""

  common_app_settings = {
    WEBSITES_PORT                         = tostring(local.app_port)
    APPLICATIONINSIGHTS_CONNECTION_STRING = azurerm_application_insights.appi.connection_string
    # Release time on every Java app; deploy-apps.sh overwrites it on each deploy.
    PUBLISHED_AT = var.published_at
  }
}

resource "azurerm_resource_group" "rg" {
  name     = local.resource_group_name
  location = var.location
  tags     = var.tags
}

resource "azurerm_log_analytics_workspace" "logs" {
  name                = "${var.prefix}-logs"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  sku                 = "PerGB2018"
  retention_in_days   = 30
  tags                = var.tags
}

resource "azurerm_application_insights" "appi" {
  name                = "${var.prefix}-appi"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  workspace_id        = azurerm_log_analytics_workspace.logs.id
  application_type    = "web"
  tags                = var.tags
}

# The three apps read Key Vault through this identity, so the access policy below can be
# written before the apps exist.
resource "azurerm_user_assigned_identity" "apps" {
  name                = "${var.prefix}-uai"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  tags                = var.tags
}

resource "azurerm_key_vault" "kv" {
  name                       = "${var.prefix}-kv"
  resource_group_name        = azurerm_resource_group.rg.name
  location                   = azurerm_resource_group.rg.location
  tenant_id                  = data.azurerm_client_config.current.tenant_id
  sku_name                   = "standard"
  soft_delete_retention_days = 7
  purge_protection_enabled   = false
  tags                       = var.tags

  # The apps only read. The operator running terraform apply writes the values.
  access_policy {
    tenant_id          = data.azurerm_client_config.current.tenant_id
    object_id          = azurerm_user_assigned_identity.apps.principal_id
    secret_permissions = ["Get", "List"]
  }

  access_policy {
    tenant_id          = data.azurerm_client_config.current.tenant_id
    object_id          = data.azurerm_client_config.current.object_id
    secret_permissions = ["Get", "List", "Set", "Delete", "Purge", "Recover"]
  }
}

resource "azurerm_key_vault_secret" "internal_token" {
  name         = "INTERNAL-TOKEN"
  value        = var.internal_token
  key_vault_id = azurerm_key_vault.kv.id
}

resource "azurerm_key_vault_secret" "mysql_password" {
  name         = "MYSQL-PASSWORD"
  value        = var.mysql_admin_password
  key_vault_id = azurerm_key_vault.kv.id
}

resource "azurerm_key_vault_secret" "jwt_signing_secret" {
  name         = "JWT-SIGNING-SECRET"
  value        = var.jwt_signing_secret
  key_vault_id = azurerm_key_vault.kv.id
}

# Key Vault rejects an empty secret value, so these two exist only when they are configured.
resource "azurerm_key_vault_secret" "aimanager_api_key" {
  count        = local.configure_model_key ? 1 : 0
  name         = "AIMANAGER-API-KEY"
  value        = var.aimanager_api_key
  key_vault_id = azurerm_key_vault.kv.id
}

resource "azurerm_key_vault_secret" "admin_password" {
  count        = local.seed_platform_admin ? 1 : 0
  name         = "ADMIN-PASSWORD"
  value        = var.admin_password
  key_vault_id = azurerm_key_vault.kv.id
}

resource "azurerm_mysql_flexible_server" "mysql" {
  name                   = "${var.prefix}-mysql"
  resource_group_name    = azurerm_resource_group.rg.name
  location               = var.mysql_location
  administrator_login    = var.mysql_admin_username
  administrator_password = var.mysql_admin_password
  sku_name               = var.mysql_sku_name
  version                = var.mysql_version
  backup_retention_days  = 7
  tags                   = var.tags

  storage {
    size_gb = var.mysql_storage_gb
  }

  lifecycle {
    # Azure picks the availability zone; a later plan must not move the server.
    ignore_changes = [zone]
  }
}

resource "azurerm_mysql_flexible_database" "core" {
  name                = local.mysql_database_name
  resource_group_name = azurerm_resource_group.rg.name
  server_name         = azurerm_mysql_flexible_server.mysql.name
  charset             = "utf8mb4"
  collation           = "utf8mb4_0900_ai_ci"
}

# App Service outbound traffic arrives as an Azure service. The 0.0.0.0 pair is the
# "Allow public access from Azure services" rule, not an open internet rule.
resource "azurerm_mysql_flexible_server_firewall_rule" "azure_services" {
  name                = "allow-azure-services"
  resource_group_name = azurerm_resource_group.rg.name
  server_name         = azurerm_mysql_flexible_server.mysql.name
  start_ip_address    = "0.0.0.0"
  end_ip_address      = "0.0.0.0"
}

resource "azurerm_mysql_flexible_server_firewall_rule" "operators" {
  for_each            = { for index, ip in var.operator_ip_addresses : "operator-${index + 1}" => ip }
  name                = each.key
  resource_group_name = azurerm_resource_group.rg.name
  server_name         = azurerm_mysql_flexible_server.mysql.name
  start_ip_address    = each.value
  end_ip_address      = each.value
}

resource "azurerm_static_web_app" "web" {
  name                = "${var.prefix}-web${var.name_suffix}"
  resource_group_name = azurerm_resource_group.rg.name
  location            = var.static_web_app_location
  sku_tier            = "Free"
  sku_size            = "Free"
  tags                = var.tags
}

resource "azurerm_service_plan" "plan" {
  name                = "${var.prefix}-plan"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  os_type             = "Linux"
  sku_name            = var.service_plan_sku
  tags                = var.tags
}

# dealer-gateway: the only API origin the browser is allowed to call.
resource "azurerm_linux_web_app" "gateway" {
  name                            = local.gateway_app_name
  resource_group_name             = azurerm_resource_group.rg.name
  location                        = azurerm_service_plan.plan.location
  service_plan_id                 = azurerm_service_plan.plan.id
  https_only                      = true
  key_vault_reference_identity_id = azurerm_user_assigned_identity.apps.id
  tags                            = var.tags

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.apps.id]
  }

  site_config {
    always_on                         = true
    health_check_path                 = "/actuator/health"
    health_check_eviction_time_in_min = 10
    ftps_state                        = "Disabled"

    application_stack {
      java_server         = "JAVA"
      java_server_version = "21"
      java_version        = "21"
    }
  }

  app_settings = merge(local.common_app_settings, {
    GATEWAY_PORT        = tostring(local.app_port)
    CORE_URL            = local.core_internal_url
    AI_URL              = local.ai_internal_url
    CORS_ALLOWED_ORIGIN = local.web_public_origin
    JWT_MODE            = "dev"
    INTERNAL_TOKEN      = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.internal_token.versionless_id})"
    DEV_JWT_SECRET      = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.jwt_signing_secret.versionless_id})"
  })

  lifecycle {
    # The deploy step stamps the real publish timestamp after the JAR upload.
    ignore_changes = [app_settings["PUBLISHED_AT"]]
  }
}

# dealer-core: business APIs, Flyway, JWT issuing. Reachable only from this plan.
resource "azurerm_linux_web_app" "core" {
  name                            = local.core_app_name
  resource_group_name             = azurerm_resource_group.rg.name
  location                        = azurerm_service_plan.plan.location
  service_plan_id                 = azurerm_service_plan.plan.id
  https_only                      = true
  key_vault_reference_identity_id = azurerm_user_assigned_identity.apps.id
  tags                            = var.tags

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.apps.id]
  }

  site_config {
    always_on                         = true
    health_check_path                 = "/actuator/health"
    health_check_eviction_time_in_min = 10
    ftps_state                        = "Disabled"
    ip_restriction_default_action     = "Deny"

    application_stack {
      java_server         = "JAVA"
      java_server_version = "21"
      java_version        = "21"
    }

    # Everything is denied except callers inside Azure, which is what lets dealer-gateway
    # (same App Service plan) through while a browser on the public internet is refused by
    # the platform. The App Service replacement for the "internal ingress" rule in
    # design/15 section 10. A rule built from the plan's own outbound addresses is not used
    # on purpose: those addresses are only known after apply, so they cannot appear in a plan.
    ip_restriction {
      name        = "allow-azure-callers"
      action      = "Allow"
      priority    = 100
      service_tag = "AzureCloud"
    }
  }

  app_settings = merge(
    local.common_app_settings,
    {
      CORE_PORT          = tostring(local.app_port)
      MYSQL_URL          = "jdbc:mysql://${azurerm_mysql_flexible_server.mysql.fqdn}:3306/${local.mysql_database_name}?sslMode=REQUIRED&serverTimezone=UTC"
      MYSQL_USER         = var.mysql_admin_username
      GATEWAY_BASE_URL   = local.gateway_public_url
      GATEWAY_PUBLIC_URL = local.gateway_public_url
      AI_BASE_URL        = local.ai_internal_url
      JWT_MODE           = "dev"
      MYSQL_PASSWORD     = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.mysql_password.versionless_id})"
      INTERNAL_TOKEN     = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.internal_token.versionless_id})"
      DEV_JWT_SECRET     = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.jwt_signing_secret.versionless_id})"
    },
    local.seed_platform_admin ? {
      ADMIN_USERNAME = var.admin_username
      ADMIN_PASSWORD = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.admin_password[0].versionless_id})"
    } : {}
  )

  depends_on = [azurerm_mysql_flexible_database.core, azurerm_mysql_flexible_server_firewall_rule.azure_services]

  lifecycle {
    # The deploy step stamps the real publish timestamp after the JAR upload.
    ignore_changes = [app_settings["PUBLISHED_AT"]]
  }
}

# ai-service: internal only, no database. Reachable only from this plan.
resource "azurerm_linux_web_app" "ai" {
  name                            = local.ai_app_name
  resource_group_name             = azurerm_resource_group.rg.name
  location                        = azurerm_service_plan.plan.location
  service_plan_id                 = azurerm_service_plan.plan.id
  https_only                      = true
  key_vault_reference_identity_id = azurerm_user_assigned_identity.apps.id
  tags                            = var.tags

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.apps.id]
  }

  site_config {
    always_on                         = true
    health_check_path                 = "/actuator/health"
    health_check_eviction_time_in_min = 10
    ftps_state                        = "Disabled"
    ip_restriction_default_action     = "Deny"

    application_stack {
      java_server         = "JAVA"
      java_server_version = "21"
      java_version        = "21"
    }

    # Everything is denied except callers inside Azure, which is what lets dealer-gateway
    # (same App Service plan) through while a browser on the public internet is refused by
    # the platform. The App Service replacement for the "internal ingress" rule in
    # design/15 section 10. A rule built from the plan's own outbound addresses is not used
    # on purpose: those addresses are only known after apply, so they cannot appear in a plan.
    ip_restriction {
      name        = "allow-azure-callers"
      action      = "Allow"
      priority    = 100
      service_tag = "AzureCloud"
    }
  }

  app_settings = merge(
    local.common_app_settings,
    {
      AI_PORT                    = tostring(local.app_port)
      AIMANAGER_GATEWAY_PROVIDER = var.aimanager_gateway_provider
      AIMANAGER_GATEWAY_MODEL    = var.aimanager_gateway_model
      INTERNAL_TOKEN             = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.internal_token.versionless_id})"
    },
    local.configure_model_key ? {
      AIMANAGER_API_KEY = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.aimanager_api_key[0].versionless_id})"
    } : {}
  )

  lifecycle {
    # The deploy step stamps the real publish timestamp after the JAR upload.
    ignore_changes = [app_settings["PUBLISHED_AT"]]
  }
}
