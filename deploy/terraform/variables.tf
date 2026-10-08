# Deploy-time input. Secrets are passed with -var-file or TF_VAR_* and never committed.
# Copy terraform.tfvars.example to terraform.tfvars (git-ignored) for the non-secret values.

variable "location" {
  description = "Azure region for the resource group, App Service plan, MySQL, and Key Vault."
  type        = string
  default     = "canadacentral"
}

variable "static_web_app_location" {
  description = "Static Web Apps region. The service runs in a short region list; Canada Central is not one of them."
  type        = string
  default     = "eastus2"
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
  description = "Appended to every app name when a global azurewebsites.net hostname is already taken. Empty keeps the pinned names."
  type        = string
  default     = ""
}

variable "resource_group_name" {
  description = "Resource group this stack creates. Empty uses <prefix>-rg."
  type        = string
  default     = ""
}

variable "service_plan_sku" {
  description = "Linux App Service plan SKU. B1 (1.75 GB) is the cheapest that allows Always On; B2 (3.5 GB) is safer for three JVMs on one plan."
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
  description = "MySQL administrator password. Stored in Key Vault as MYSQL-PASSWORD; read by dealer-core only."
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.mysql_admin_password) >= 12
    error_message = "mysql_admin_password must be at least 12 characters."
  }
}

variable "operator_ip_addresses" {
  description = "Public IPv4 addresses allowed through the MySQL firewall, for Flyway or a SQL client run by a team member. Azure services reach the server through a separate rule."
  type        = list(string)
  default     = []
}

variable "internal_token" {
  description = "Shared X-Dealer-Internal value for gateway, dealer-core outbound, and ai-service. Key Vault secret INTERNAL-TOKEN."
  type        = string
  sensitive   = true

  validation {
    condition     = var.internal_token != "dealer-internal"
    error_message = "internal_token must not be the local classroom default dealer-internal."
  }
}

variable "jwt_signing_secret" {
  description = "HS256 secret dealer-core signs with and dealer-gateway validates. Key Vault secret JWT-SIGNING-SECRET."
  type        = string
  sensitive   = true

  validation {
    condition     = length(var.jwt_signing_secret) >= 32
    error_message = "jwt_signing_secret must be at least 32 bytes."
  }
}

variable "aimanager_api_key" {
  description = "Model key for ai-service only. Empty leaves the key unset, which keeps ai-service on its stub answer path."
  type        = string
  sensitive   = true
  default     = ""
}

variable "aimanager_gateway_provider" {
  description = "ai-manager provider name."
  type        = string
  default     = "openai"
}

variable "aimanager_gateway_model" {
  description = "ai-manager model name. Empty uses the library default."
  type        = string
  default     = ""
}

variable "admin_username" {
  description = "Username of the one seeded platform admin (design/15-Data-Auth-and-Gateway.md section 8). Empty skips seeding."
  type        = string
  default     = ""
}

variable "admin_password" {
  description = "Password for the seeded platform admin. Key Vault secret ADMIN-PASSWORD. Required when admin_username is set."
  type        = string
  sensitive   = true
  default     = ""

  validation {
    condition     = var.admin_password == "" || length(var.admin_password) >= 12
    error_message = "admin_password must be empty or at least 12 characters."
  }
}

variable "published_at" {
  description = "Release-time stamp on the gateway, core and ai-service before the first JAR deploy. The deploy step overwrites it with a UTC timestamp, and Terraform then leaves it alone."
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
