// Sprint 2 再填参数。这里只列出必须有的资源名，避免漏项。
targetScope = 'resourceGroup'

param location string
param prefix string = 'dealerops'

resource acr 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: '${prefix}acr'
  location: location
  sku: { name: 'Basic' }
  properties: { adminUserEnabled: false }
}

// 随后在同一文件补：
// - Key Vault
// - MySQL Flexible Server
// - Container Apps Environment
// - dealer-web / dealer-gateway / dealer-core / ai-service
// - Application Insights
// 不要在本文件写 subscriptionId 或密钥。
