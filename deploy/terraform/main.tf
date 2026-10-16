# One resource group holding the graded cloud demo:
#   3 x Linux App Service (.NET 8)          - dealer-gateway public, dealer-core and ai-service reachable by the gateway
#   1 x Linux App Service (Node 20)         - the built React SPA on a fixed hostname
#   1 x MySQL Flexible Server               - schema owned by EF Core EnsureCreated in dealer-core
#   1 x Key Vault                           - the five secret values, referenced by app settings
#   1 x Log Analytics + Application Insights
# No container registry and no container images: App Service runs the .NET apps directly.

# Auto-generated secrets: used when the corresponding variable is left empty,
# so beginners can deploy with just `terraform init && terraform apply`.
resource "random_password" "mysql" {
  length  = 24
  special = false
}

resource "random_password" "internal_token" {
  length  = 40
  special = false
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = false
}

resource "random_password" "admin_password" {
  length  = 16
  special = false
}

data "azurerm_client_config" "current" {}

locals {
  mysql_admin_password = var.mysql_admin_password != "" ? var.mysql_admin_password : random_password.mysql.result
  internal_token       = var.internal_token != "" ? var.internal_token : random_password.internal_token.result
  jwt_signing_secret   = var.jwt_signing_secret != "" ? var.jwt_signing_secret : random_password.jwt_secret.result
  admin_password       = var.admin_password != "" ? var.admin_password : random_password.admin_password.result
  resource_group_name  = var.resource_group_name != "" ? var.resource_group_name : "${var.prefix}-rg"

  core_app_name    = "${var.prefix}-core${var.name_suffix}"
  ai_app_name      = "${var.prefix}-ai${var.name_suffix}"
  gateway_app_name = "${var.prefix}-gateway${var.name_suffix}"
  web_app_name     = "${var.web_app_name}${var.name_suffix}"

  # Vault DNS names and MySQL server names are global, like the azurewebsites.net hostnames,
  # so another subscription deploying this stack needs name_suffix here too.
  key_vault_name    = "${var.prefix}-kv${var.name_suffix}"
  mysql_server_name = "${var.prefix}-mysql${var.name_suffix}"

  # App Service terminates HTTPS on 443 and forwards to this port. Core and AI pin a local
  # Kestrel port in appsettings.json, so the cloud overrides that endpoint explicitly.
  app_port    = 8080
  kestrel_url = "http://0.0.0.0:${local.app_port}"

  core_internal_url  = "https://${local.core_app_name}.azurewebsites.net"
  ai_internal_url    = "https://${local.ai_app_name}.azurewebsites.net"
  gateway_public_url = "https://${local.gateway_app_name}.azurewebsites.net"
  web_public_origin  = "https://${local.web_app_name}.azurewebsites.net"
  # The gateway allows exactly one browser origin. Default is this stack's own SPA; a team
  # that builds its own frontend elsewhere points it at that origin instead.
  cors_allowed_origin = var.cors_allowed_origin != "" ? var.cors_allowed_origin : local.web_public_origin
  mysql_database_name = "dealer_core"
  seed_platform_admin = var.admin_username != ""
  configure_model_key = var.aimanager_api_key != ""

  common_app_settings = {
    WEBSITES_PORT                         = tostring(local.app_port)
    APPLICATIONINSIGHTS_CONNECTION_STRING = azurerm_application_insights.appi.connection_string
    # Release time on every app; deploy-apps.sh overwrites it on each deploy.
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
  name                       = local.key_vault_name
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
  value        = local.internal_token
  key_vault_id = azurerm_key_vault.kv.id
}

resource "azurerm_key_vault_secret" "mysql_password" {
  name         = "MYSQL-PASSWORD"
  value        = local.mysql_admin_password
  key_vault_id = azurerm_key_vault.kv.id
}

resource "azurerm_key_vault_secret" "jwt_signing_secret" {
  name         = "JWT-SIGNING-SECRET"
  value        = local.jwt_signing_secret
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
  value        = local.admin_password
  key_vault_id = azurerm_key_vault.kv.id
}

resource "azurerm_mysql_flexible_server" "mysql" {
  name                   = local.mysql_server_name
  resource_group_name    = azurerm_resource_group.rg.name
  location               = var.mysql_location
  administrator_login    = var.mysql_admin_username
  administrator_password = local.mysql_admin_password
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

resource "azurerm_service_plan" "plan" {
  name                = "${var.prefix}-plan"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
  os_type             = "Linux"
  sku_name            = var.service_plan_sku
  tags                = var.tags
}

# React SPA on a fixed azurewebsites.net hostname. pm2 serves dist/ with SPA fallback.
resource "azurerm_linux_web_app" "web" {
  name                = local.web_app_name
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_service_plan.plan.location
  service_plan_id     = azurerm_service_plan.plan.id
  https_only          = true
  tags                = var.tags

  site_config {
    always_on        = true
    ftps_state       = "Disabled"
    app_command_line = "pm2 serve /home/site/wwwroot --no-daemon --spa --port ${local.app_port}"

    application_stack {
      node_version = "20-lts"
    }
  }

  app_settings = {
    WEBSITES_PORT                  = tostring(local.app_port)
    SCM_DO_BUILD_DURING_DEPLOYMENT = "false"
  }
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
    app_command_line                  = "dotnet DealerOps.Gateway.dll"

    application_stack {
      dotnet_version = "10.0"
    }
  }

  app_settings = merge(local.common_app_settings, {
    GATEWAY_PORT                = tostring(local.app_port)
    CORE_URL                    = local.core_internal_url
    AI_URL                      = local.ai_internal_url
    CORS_ALLOWED_ORIGIN         = local.cors_allowed_origin
    "dealerops__internalToken"  = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.internal_token.versionless_id})"
    "dealerops__jwt__devSecret" = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.jwt_signing_secret.versionless_id})"
  })

  lifecycle {
    # The deploy step stamps the real publish timestamp after the zip upload.
    ignore_changes = [app_settings["PUBLISHED_AT"]]
  }
}

# dealer-core: business APIs, EF Core schema, JWT issuing. Reachable only from this plan.
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
    app_command_line                  = "dotnet DealerOps.Core.dll"

    application_stack {
      dotnet_version = "10.0"
    }

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
      Kestrel__Endpoints__Http__Url = local.kestrel_url
      ConnectionStrings__Default    = "Server=${azurerm_mysql_flexible_server.mysql.fqdn};Port=3306;Database=${local.mysql_database_name};User=${var.mysql_admin_username};Password=${local.mysql_admin_password};SslMode=Required"
      AiService__BaseUrl            = local.ai_internal_url
      AiService__InternalToken      = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.internal_token.versionless_id})"
      Jwt__DevSecret                = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.jwt_signing_secret.versionless_id})"
    },
    local.seed_platform_admin ? {
      ADMIN_USERNAME = var.admin_username
      ADMIN_PASSWORD = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.admin_password[0].versionless_id})"
      ADMIN_EMAIL    = var.admin_email
      ADMIN_PHONE    = var.admin_phone
    } : {}
  )

  depends_on = [azurerm_mysql_flexible_database.core, azurerm_mysql_flexible_server_firewall_rule.azure_services]

  lifecycle {
    # The deploy step stamps the real publish timestamp after the zip upload.
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
    app_command_line                  = "dotnet DealerOps.AiService.dll"

    application_stack {
      dotnet_version = "10.0"
    }

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
      Kestrel__Endpoints__Http__Url = local.kestrel_url
      AiManager__Provider           = var.aimanager_gateway_provider
      AiManager__Model              = var.aimanager_gateway_model
      AiService__InternalToken      = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.internal_token.versionless_id})"
    },
    local.configure_model_key ? {
      AiManager__ApiKey = "@Microsoft.KeyVault(SecretUri=${azurerm_key_vault_secret.aimanager_api_key[0].versionless_id})"
    } : {}
  )

  lifecycle {
    # The deploy step stamps the real publish timestamp after the zip upload.
    ignore_changes = [app_settings["PUBLISHED_AT"]]
  }
}
