// Sprint 2 Azure template (design/AI-CODING-LOCAL-AND-CLOUD.md §6, 07, BRIEF §8–9).
// Not deployed from this repo. Do not write subscriptionId or plaintext secret values here.
// Deploy only after an Azure subscription exists. Pass @secure() values at deploy time.
targetScope = 'resourceGroup'

@description('Azure region for all resources in this resource group.')
param location string

@description('Pinned name prefix. Example dealerops → dealeropsacr / dealerops-kv.')
@minLength(5)
@maxLength(16)
param prefix string = 'dealerops'

@description('Container image tag. Pipelines use $GITHUB_SHA; do not treat latest as a release.')
param imageTag string = 'latest'

// @description must be a compile-time constant. Do not interpolate ${...} here (BCP032/BCP053).
// The empty-string default is resolved later as https://{prefix}-gateway.{environment default domain}.
@description('Public Gateway URL the SPA calls (VITE_GATEWAY_URL / GATEWAY_PUBLIC_URL). When empty, deploy uses https://{prefix}-gateway plus the Container Apps environment default domain. Do not put a personal hostname in git.')
param gatewayPublicUrl string = ''

@description('Gateway CORS origin (CORS_ALLOWED_ORIGIN). Empty = Azure web HTTPS origin. Local Vite is http://localhost:5173.')
param corsAllowedOrigin string = ''

@description('Azure MySQL Flexible Server version. Local ITs stay on Testcontainers mysql:8.4.')
param mysqlVersion string = '8.0.21'

@description('Optional Entra object id that may set Key Vault secrets after deploy. Leave empty to skip.')
param deployerObjectId string = ''

@secure()
@description('MySQL admin password. Deploy-time only. Key Vault secret name MYSQL-PASSWORD.')
param mysqlAdminPassword string

@secure()
@description('Shared X-Dealer-Internal value. Deploy-time only. Key Vault secret name INTERNAL-TOKEN.')
param internalToken string

@secure()
@description('ai-service model key only. Deploy-time only. Key Vault secret name AIMANAGER-API-KEY.')
param aimanagerApiKey string

@secure()
@description('HS256 JWT signing secret shared by gateway and core (>=32 UTF-8 bytes). Deploy-time only. Key Vault secret name JWT-SIGNING-SECRET.')
param jwtSigningSecret string

@description('Username for the one seeded platform admin account (design/15-Data-Auth-and-Gateway.md S8). Empty skips seeding.')
param adminUsername string = ''

@secure()
@description('Password for the seeded platform admin account. Deploy-time only. Key Vault secret name ADMIN-PASSWORD.')
param adminPassword string = ''

var acrName = '${prefix}acr'
var tenantId = subscription().tenantId

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: acrName
  location: location
  sku: { name: 'Basic' }
  properties: { adminUserEnabled: false }
}

resource uai 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${prefix}-uai'
  location: location
}

resource logs 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: '${prefix}-logs'
  location: location
  properties: {
    sku: { name: 'PerGB2018' }
    retentionInDays: 30
  }
}

resource appi 'Microsoft.Insights/components@2020-02-02' = {
  name: '${prefix}-appi'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: logs.id
  }
}

resource vnet 'Microsoft.Network/virtualNetworks@2023-11-01' = {
  name: '${prefix}-vnet'
  location: location
  properties: {
    addressSpace: { addressPrefixes: ['10.0.0.0/16'] }
    subnets: [
      {
        name: 'cae'
        properties: {
          addressPrefix: '10.0.0.0/23'
        }
      }
      {
        name: 'mysql'
        properties: {
          addressPrefix: '10.0.2.0/24'
          delegations: [
            {
              name: 'mysql'
              properties: {
                serviceName: 'Microsoft.DBforMySQL/flexibleServers'
              }
            }
          ]
        }
      }
    ]
  }
}

resource mysqlZone 'Microsoft.Network/privateDnsZones@2020-06-01' = {
  name: 'privatelink.mysql.database.azure.com'
}

resource mysqlZoneLink 'Microsoft.Network/privateDnsZones/virtualNetworkLinks@2020-06-01' = {
  parent: mysqlZone
  name: '${prefix}-mysql-link'
  location: 'global'
  properties: {
    registrationEnabled: false
    virtualNetwork: { id: vnet.id }
  }
}

resource kv 'Microsoft.KeyVault/vaults@2023-07-01' = {
  name: '${prefix}-kv'
  location: location
  properties: {
    sku: { family: 'A', name: 'standard' }
    tenantId: tenantId
    enableSoftDelete: true
    enablePurgeProtection: false
    enableRbacAuthorization: false
    accessPolicies: concat(
      [
        {
          tenantId: tenantId
          objectId: uai.properties.principalId
          permissions: { secrets: ['get', 'list'] }
        }
      ],
      empty(deployerObjectId)
        ? []
        : [
            {
              tenantId: tenantId
              objectId: deployerObjectId
              permissions: { secrets: ['get', 'list', 'set', 'delete'] }
            }
          ]
    )
  }
}

// Secret NAMES only. Values come from @secure() deploy parameters, never from git.
resource kvInternalToken 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: kv
  name: 'INTERNAL-TOKEN'
  properties: { value: internalToken }
}

resource kvMysqlPassword 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: kv
  name: 'MYSQL-PASSWORD'
  properties: { value: mysqlAdminPassword }
}

resource kvAiKey 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: kv
  name: 'AIMANAGER-API-KEY'
  properties: { value: aimanagerApiKey }
}

resource kvJwtSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: kv
  name: 'JWT-SIGNING-SECRET'
  properties: { value: jwtSigningSecret }
}

resource kvAdminPassword 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: kv
  name: 'ADMIN-PASSWORD'
  properties: { value: adminPassword }
}

resource mysql 'Microsoft.DBforMySQL/flexibleServers@2023-12-30' = {
  name: '${prefix}-mysql'
  location: location
  sku: {
    name: 'Standard_B1ms'
    tier: 'Burstable'
  }
  properties: {
    version: mysqlVersion
    administratorLogin: 'dealer'
    administratorLoginPassword: mysqlAdminPassword
    storage: { storageSizeGB: 20 }
    backup: { backupRetentionDays: 7, geoRedundantBackup: 'Disabled' }
    network: {
      delegatedSubnetResourceId: '${vnet.id}/subnets/mysql'
      privateDnsZoneResourceId: mysqlZone.id
    }
  }
  dependsOn: [mysqlZoneLink]
}

resource mysqlDb 'Microsoft.DBforMySQL/flexibleServers/databases@2023-12-30' = {
  parent: mysql
  name: 'dealer_core'
  properties: {
    charset: 'utf8mb4'
    collation: 'utf8mb4_0900_ai_ci'
  }
}

resource cae 'Microsoft.App/managedEnvironments@2024-03-01' = {
  name: '${prefix}-cae'
  location: location
  properties: {
    appLogsConfiguration: {
      destination: 'log-analytics'
      logAnalyticsConfiguration: {
        customerId: logs.properties.customerId
        sharedKey: logs.listKeys().primarySharedKey
      }
    }
    vnetConfiguration: {
      infrastructureSubnetId: '${vnet.id}/subnets/cae'
      internal: false
    }
  }
}

resource acrPull 'Microsoft.Authorization/roleAssignments@2022-04-01' = {
  name: guid(acr.id, uai.id, 'AcrPull')
  scope: acr
  properties: {
    roleDefinitionId: subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7f951dda-4cdc-47e7-ad62-12f3cac9ca11')
    principalId: uai.properties.principalId
    principalType: 'ServicePrincipal'
  }
}

var registry = {
  server: acr.properties.loginServer
  identity: uai.id
}

var kvSecretInternal = {
  name: 'internal-token'
  keyVaultUrl: '${kv.properties.vaultUri}secrets/INTERNAL-TOKEN'
  identity: uai.id
}

var kvSecretMysql = {
  name: 'mysql-password'
  keyVaultUrl: '${kv.properties.vaultUri}secrets/MYSQL-PASSWORD'
  identity: uai.id
}

var kvSecretAi = {
  name: 'aimanager-api-key'
  keyVaultUrl: '${kv.properties.vaultUri}secrets/AIMANAGER-API-KEY'
  identity: uai.id
}

var kvSecretJwt = {
  name: 'jwt-signing-secret'
  keyVaultUrl: '${kv.properties.vaultUri}secrets/JWT-SIGNING-SECRET'
  identity: uai.id
}

var kvSecretAdminPassword = {
  name: 'admin-password'
  keyVaultUrl: '${kv.properties.vaultUri}secrets/ADMIN-PASSWORD'
  identity: uai.id
}

// Public HTTPS URLs from CAE name pattern (LOCAL-AND-CLOUD §6). Override with params; no personal hostname.
var resolvedGatewayUrl = empty(gatewayPublicUrl) ? 'https://${prefix}-gateway.${cae.properties.defaultDomain}' : gatewayPublicUrl
var resolvedWebOrigin = empty(corsAllowedOrigin) ? 'https://${prefix}-web.${cae.properties.defaultDomain}' : corsAllowedOrigin

resource coreApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: '${prefix}-core'
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${uai.id}': {}
    }
  }
  properties: {
    managedEnvironmentId: cae.id
    configuration: {
      activeRevisionsMode: 'Single'
      registries: [registry]
      secrets: [kvSecretInternal, kvSecretMysql, kvSecretJwt, kvSecretAdminPassword]
      ingress: {
        external: false
        targetPort: 8081
        transport: 'http'
        allowInsecure: false
      }
    }
    template: {
      containers: [
        {
          name: 'dealer-core'
          image: '${acr.properties.loginServer}/dealer-core:${imageTag}'
          env: [
            { name: 'CORE_PORT', value: '8081' }
            { name: 'MYSQL_URL', value: 'jdbc:mysql://${mysql.properties.fullyQualifiedDomainName}:3306/dealer_core?useSSL=true' }
            { name: 'MYSQL_USER', value: 'dealer' }
            { name: 'MYSQL_PASSWORD', secretRef: 'mysql-password' }
            { name: 'INTERNAL_TOKEN', secretRef: 'internal-token' }
            { name: 'GATEWAY_BASE_URL', value: 'https://${prefix}-gateway.${cae.properties.defaultDomain}' }
            { name: 'JWT_MODE', value: 'dev' }
            { name: 'DEV_JWT_SECRET', secretRef: 'jwt-signing-secret' }
            { name: 'ADMIN_USERNAME', value: adminUsername }
            { name: 'ADMIN_PASSWORD', secretRef: 'admin-password' }
            { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appi.properties.ConnectionString }
          ]
        }
      ]
    }
  }
  dependsOn: [acrPull, mysqlDb, kvInternalToken, kvMysqlPassword, kvJwtSecret, kvAdminPassword]
}

resource aiApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: '${prefix}-ai'
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${uai.id}': {}
    }
  }
  properties: {
    managedEnvironmentId: cae.id
    configuration: {
      activeRevisionsMode: 'Single'
      registries: [registry]
      secrets: [kvSecretInternal, kvSecretAi]
      ingress: {
        external: false
        targetPort: 8082
        transport: 'http'
        allowInsecure: false
      }
    }
    template: {
      containers: [
        {
          name: 'ai-service'
          image: '${acr.properties.loginServer}/ai-service:${imageTag}'
          env: [
            { name: 'AI_PORT', value: '8082' }
            { name: 'INTERNAL_TOKEN', secretRef: 'internal-token' }
            { name: 'AIMANAGER_API_KEY', secretRef: 'aimanager-api-key' }
            { name: 'AIMANAGER_GATEWAY_PROVIDER', value: 'openai' }
            { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appi.properties.ConnectionString }
          ]
        }
      ]
    }
  }
  dependsOn: [acrPull, kvInternalToken, kvAiKey]
}

resource gatewayApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: '${prefix}-gateway'
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${uai.id}': {}
    }
  }
  properties: {
    managedEnvironmentId: cae.id
    configuration: {
      activeRevisionsMode: 'Single'
      registries: [registry]
      secrets: [kvSecretInternal, kvSecretJwt]
      ingress: {
        external: true
        targetPort: 8080
        transport: 'http'
        allowInsecure: false
      }
    }
    template: {
      containers: [
        {
          name: 'dealer-gateway'
          image: '${acr.properties.loginServer}/dealer-gateway:${imageTag}'
          env: [
            { name: 'GATEWAY_PORT', value: '8080' }
            { name: 'CORE_URL', value: 'https://${prefix}-core.${cae.properties.defaultDomain}' }
            { name: 'AI_URL', value: 'https://${prefix}-ai.${cae.properties.defaultDomain}' }
            { name: 'INTERNAL_TOKEN', secretRef: 'internal-token' }
            { name: 'CORS_ALLOWED_ORIGIN', value: resolvedWebOrigin }
            { name: 'JWT_MODE', value: 'dev' }
            { name: 'DEV_JWT_SECRET', secretRef: 'jwt-signing-secret' }
            { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appi.properties.ConnectionString }
          ]
        }
      ]
    }
  }
  dependsOn: [acrPull, kvInternalToken, kvJwtSecret]
}

resource webApp 'Microsoft.App/containerApps@2024-03-01' = {
  name: '${prefix}-web'
  location: location
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${uai.id}': {}
    }
  }
  properties: {
    managedEnvironmentId: cae.id
    configuration: {
      activeRevisionsMode: 'Single'
      registries: [registry]
      ingress: {
        external: true
        targetPort: 5173
        transport: 'http'
        allowInsecure: false
      }
    }
    template: {
      containers: [
        {
          name: 'dealer-web'
          image: '${acr.properties.loginServer}/dealer-web:${imageTag}'
          env: [
            { name: 'VITE_GATEWAY_URL', value: resolvedGatewayUrl }
            { name: 'GATEWAY_PUBLIC_URL', value: resolvedGatewayUrl }
            { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: appi.properties.ConnectionString }
          ]
        }
      ]
    }
  }
  dependsOn: [acrPull]
}

output acrLoginServer string = acr.properties.loginServer
output keyVaultName string = kv.name
output keyVaultSecretNames array = ['INTERNAL-TOKEN', 'MYSQL-PASSWORD', 'AIMANAGER-API-KEY', 'JWT-SIGNING-SECRET', 'ADMIN-PASSWORD']
output gatewayFqdn string = '${prefix}-gateway.${cae.properties.defaultDomain}'
output webFqdn string = '${prefix}-web.${cae.properties.defaultDomain}'
output gatewayPublicUrl string = resolvedGatewayUrl
output webPublicOrigin string = resolvedWebOrigin
output mysqlFqdn string = mysql.properties.fullyQualifiedDomainName
output deployedNote string = 'Template only. Images and secret values are not in this repository.'
