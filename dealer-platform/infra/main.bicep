// Fill parameters in Sprint 2. This file only names required resources so none are forgotten.
targetScope = 'resourceGroup'

param location string
param prefix string = 'dealerops'

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: '${prefix}acr'
  location: location
  sku: { name: 'Basic' }
  properties: { adminUserEnabled: false }
}

// Add in the same file later:
// - Key Vault
// - MySQL Flexible Server
// - Container Apps Environment
// - dealer-web / dealer-gateway / dealer-core / ai-service
// - Application Insights
// Do not write subscriptionId or secrets in this file.
