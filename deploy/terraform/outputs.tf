# Values the deploy steps in deploy/README.md need. Nothing here prints a secret value
# except static_web_app_deployment_token, which is marked sensitive.

output "resource_group_name" {
  description = "Resource group holding the whole stack."
  value       = azurerm_resource_group.rg.name
}

output "gateway_app_name" {
  description = "App Service name for the dealer-gateway JAR deploy."
  value       = azurerm_linux_web_app.gateway.name
}

output "core_app_name" {
  description = "App Service name for the dealer-core JAR deploy."
  value       = azurerm_linux_web_app.core.name
}

output "ai_app_name" {
  description = "App Service name for the ai-service JAR deploy."
  value       = azurerm_linux_web_app.ai.name
}

output "gateway_public_url" {
  description = "The only API origin the browser may call. Build the SPA with this as VITE_GATEWAY_URL."
  value       = "https://${azurerm_linux_web_app.gateway.default_hostname}"
}

output "web_public_url" {
  description = "Public SPA origin. Already set as the gateway CORS_ALLOWED_ORIGIN."
  value       = "https://${azurerm_static_web_app.web.default_host_name}"
}

output "swagger_url" {
  description = "Swagger UI, proxied by the gateway. Core is not reachable from a browser."
  value       = "https://${azurerm_linux_web_app.gateway.default_hostname}/swagger-ui/index.html"
}

output "static_web_app_deployment_token" {
  description = "Deployment token for the swa deploy step."
  value       = azurerm_static_web_app.web.api_key
  sensitive   = true
}

output "mysql_fqdn" {
  description = "MySQL Flexible Server host. dealer-core already has the JDBC URL as an app setting."
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
