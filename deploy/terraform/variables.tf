# All secrets auto-generate safe defaults so beginners can deploy with just:
#   terraform init && terraform apply
# Override any value with -var, TF_VAR_*, or a terraform.tfvars file (git-ignored).

variable "location" {
  description = "Azure region for the resource group, App Service plan, MySQL, and Key Vault."
  type        = string
  default     = "canadacentral"
}

variable "web_app_name" {
  description = "App Service name for the React SPA. The browser URL is https://<web_app_name><name_suffix>.azurewebsites.net."
  type        = string
  default     = "dealer-ops-dev"
}

variable "web_custom_domain" {
  description = "Optional custom hostname for the React SPA (for example www.example.com). Leave empty to use the Azure-managed azurewebsites.net hostname. The domain owner must point a CNAME to the app's default hostname before apply."
  type        = string
  default     = ""

  validation {
    condition     = var.web_custom_domain == "" || can(regex("^[A-Za-z0-9]([A-Za-z0-9.-]*[A-Za-z0-9])?$", var.web_custom_domain))
    error_message = "web_custom_domain must be a hostname without a scheme or path, such as www.example.com."
  }
}

variable "mysql_location" {
  description = "MySQL Flexible Server region. Azure for Students cannot provision MySQL in Canada Central (ProvisionNotSupportedForRegion); check another region with az mysql flexible-server list-skus --location <region>."
  type        = string
  default     = "canadaeast"
}

variable "prefix" {
  description = "Pinned name prefix from design/AI-CODING-LOCAL-AND-CLOUD.md section 6. Example dealerops -> dealerops-core."
  type        = string
  default     = "dealerops"

  validation {
    condition     = can(regex("^[a-z][a-z0-9]{4,15}$", var.prefix))
    error_message = "prefix must be 5-16 lowercase letters or digits and start with a letter."
  }
}

variable "name_suffix" {
  description = "Appended to every globally unique name (the four apps, Key Vault, MySQL) when one is already taken in another subscription. Empty keeps the pinned names."
  type        = string
  default     = ""
}

variable "cors_allowed_origin" {
  description = "The one browser origin dealer-gateway accepts. Empty uses this stack's own web app origin; set it to another origin (for example http://localhost:5173) when the frontend is built and hosted outside this stack."
  type        = string
  default     = ""
}

variable "resource_group_name" {
  description = "Resource group this stack creates. Empty uses <prefix>-rg."
  type        = string
  default     = ""
}

variable "service_plan_sku" {
  description = "Linux App Service plan SKU. B1 (1.75 GB) is the cheapest that allows Always On; B2 (3.5 GB) is safer for four apps on one plan."
  type        = string
  default     = "B2"
}

variable "mysql_sku_name" {
  description = "Azure Database for MySQL Flexible Server SKU."
  type        = string
  default     = "B_Standard_B1ms"
}

variable "mysql_version" {
  description = "MySQL engine version. Local Flyway history and the Testcontainers ITs stay on MySQL 8."
  type        = string
  default     = "8.0.21"
}

variable "mysql_storage_gb" {
  description = "MySQL Flexible Server data disk size in GB."
  type        = number
  default     = 20
}

variable "mysql_admin_username" {
  description = "MySQL administrator login. dealer-core connects with this user."
  type        = string
  default     = "dealer"
}

variable "mysql_admin_password" {
  description = "MySQL administrator password. Auto-generated if empty. Stored in Key Vault as MYSQL-PASSWORD."
  type        = string
  sensitive   = true
  default     = ""
}

variable "operator_ip_addresses" {
  description = "Public IPv4 addresses allowed through the MySQL firewall, for Flyway or a SQL client run by a team member. Azure services reach the server through a separate rule."
  type        = list(string)
  default     = []
}

variable "internal_token" {
  description = "Shared X-Dealer-Internal value for gateway, dealer-core outbound, and ai-service. Auto-generated if empty."
  type        = string
  sensitive   = true
  default     = ""
}

variable "jwt_signing_secret" {
  description = "HS256 secret dealer-core signs with and dealer-gateway validates. Auto-generated if empty."
  type        = string
  sensitive   = true
  default     = ""
}

variable "aimanager_api_key" {
  description = "Model key for ai-service only. Empty leaves the key unset; ai-service still starts, but every model call fails with AI_KEY_MISSING (there is no stub provider)."
  type        = string
  sensitive   = true
  default     = ""
}

variable "aimanager_gateway_provider" {
  description = "ai-manager provider name. The default matches ai-service/src/main/resources/application.yaml and must match the vendor of aimanager_api_key."
  type        = string
  default     = "groq"
}

variable "aimanager_gateway_model" {
  description = "ai-manager model name. The default matches ai-service/src/main/resources/application.yaml; empty uses the provider's current model alias."
  type        = string
  default     = "qwen/qwen3.8-27b"
}

variable "admin_username" {
  description = "Username of the one seeded platform admin. Defaults to admin."
  type        = string
  default     = "admin"
}

variable "admin_password" {
  description = "Password for the seeded platform admin. Auto-generated if empty."
  type        = string
  sensitive   = true
  default     = ""
}

variable "admin_email" {
  description = "Optional email the seeded platform admin can also sign in with (the username always works)."
  type        = string
  default     = "admin@example.com"
}

variable "admin_phone" {
  description = "Optional phone, with country code, the seeded platform admin can also sign in with (the username always works)."
  type        = string
  default     = ""
}

variable "published_at" {
  description = "Release-time stamp on the gateway, core and ai-service before the first zip deploy. The deploy step overwrites it with a UTC timestamp, and Terraform then leaves it alone."
  type        = string
  default     = "cloud"
}

variable "tags" {
  description = "Tags applied to every resource."
  type        = map(string)
  default = {
    project = "DealerOps"
    iac     = "terraform"
  }
}
