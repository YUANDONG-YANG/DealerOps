# Values the deploy steps in deploy/README.md need. Secret values are marked sensitive.

output "resource_group_name" {
  description = "Resource group holding the whole stack."
  value       = azurerm_resource_group.rg.name
}

output "gateway_app_name" {
  description = "App Service name for the dealer-gateway deploy."
  value       = azurerm_linux_web_app.gateway.name
}

output "core_app_name" {
  description = "App Service name for the dealer-core deploy."
  value       = azurerm_linux_web_app.core.name
}

output "ai_app_name" {
  description = "App Service name for the ai-service deploy."
  value       = azurerm_linux_web_app.ai.name
}

output "gateway_public_url" {
  description = "The only API origin the browser may call. Build the SPA with this as VITE_GATEWAY_URL."
  value       = "https://${azurerm_linux_web_app.gateway.default_hostname}"
}

output "web_app_name" {
  description = "App Service name for the React SPA deploy."
  value       = azurerm_linux_web_app.web.name
}

output "web_public_url" {
  description = "Public SPA origin. Uses the optional custom domain when configured; otherwise the Azure-managed hostname."
  value       = var.web_custom_domain != "" ? "https://${var.web_custom_domain}" : "https://${azurerm_linux_web_app.web.default_hostname}"
}

output "web_custom_domain_target" {
  description = "CNAME target for web_custom_domain. Use this in the domain DNS zone before applying a custom hostname."
  value       = var.web_custom_domain != "" ? azurerm_linux_web_app.web.default_hostname : null
}

output "web_custom_domain_verification_id" {
  description = "Azure TXT ownership-verification value for web_custom_domain; publish as an asuid.<hostname> TXT record when required by the DNS provider."
  value       = var.web_custom_domain != "" ? azurerm_linux_web_app.web.custom_domain_verification_id : null
  # azurerm 4.x marks the attribute sensitive; read it with `terraform output -raw` when needed.
  sensitive = true
}

output "swagger_url" {
  description = "Swagger UI, proxied by the gateway. Core is not reachable from a browser."
  value       = "https://${azurerm_linux_web_app.gateway.default_hostname}/swagger/index.html"
}

output "mysql_fqdn" {
  description = "MySQL Flexible Server host. dealer-core already has the connection string as an app setting."
  value       = azurerm_mysql_flexible_server.mysql.fqdn
}

output "key_vault_name" {
  description = "Key Vault holding INTERNAL-TOKEN, MYSQL-PASSWORD, JWT-SIGNING-SECRET, and when configured AIMANAGER-API-KEY and ADMIN-PASSWORD."
  value       = azurerm_key_vault.kv.name
}

output "application_insights_name" {
  description = "Application Insights resource the three apps report to."
  value       = azurerm_application_insights.appi.name
}

output "admin_username" {
  description = "Platform admin login username. Use with admin_password to sign in."
  value       = var.admin_username
}

output "admin_password" {
  description = "Platform admin login password (auto-generated when not provided). Retrieve with: terraform output -raw admin_password"
  value       = local.admin_password
  sensitive   = true
}

output "mysql_admin_password" {
  description = "MySQL administrator password (auto-generated when not provided). Retrieve with: terraform output -raw mysql_admin_password"
  value       = local.mysql_admin_password
  sensitive   = true
}
