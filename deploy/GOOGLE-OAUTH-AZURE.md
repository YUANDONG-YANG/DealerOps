# DealerOps Google OAuth 与 Azure 部署记录

最后更新：2026-10-15

本文记录 DealerOps 当前项目为“使用 Google 登录”配置的真实 Google OAuth Client，以及它与 Azure App Service 部署架构之间的关系。本文只记录可以公开放在前端的 Client ID，不记录 Client Secret。

## 1. 当前项目架构

DealerOps 的云部署采用 Terraform + Azure App Service，不使用容器：

```text
浏览器
  │
  ├─ 本地 Vue：  http://localhost:5173
  ├─ 本地 React：http://localhost:5174
  └─ Azure：     https://dealer-ops-dev.azurewebsites.net
                    │
                    └─ React SPA（Vite 构建，Node 20 + pm2 托管）
                         │
                         └─ dealerops-gateway（唯一公开 API 入口）
                              ├─ dealerops-core
                              └─ dealerops-ai
```

Google 登录发生在 React 浏览器端：

1. React 加载 Google Identity Services（`https://accounts.google.com/gsi/client`）。
2. Google 在浏览器中生成 ID token。
3. 前端把 ID token 发送到后端的 Google 登录接口。
4. 后端验证 token，并建立 DealerOps 自己的登录会话。

因此，本项目使用的是 Google Identity Services 的浏览器模式，需要配置 **Authorized JavaScript origins**。当前代码不使用 Google OAuth 的服务端重定向流程，所以不需要配置 Authorized redirect URI。

相关代码：

- `frontend/react/src/auth/google.ts`
- `frontend/react/src/pages/LoginPage.tsx`
- `frontend/react/src/auth/login.ts`

## 2. Google Cloud OAuth 配置

Google Cloud 项目：

- 项目名称：`My First Project`
- 项目 ID：`plasma-crossbar-443700-j7`
- OAuth 应用名称：`DealerOps`
- OAuth Client 名称：`DealerOps Web`
- 应用类型：`Web application`
- OAuth 状态：`Enabled`

真实 Client ID：

```text
660111025309-k8qneu1ifuhgtptb3onimtq988bb1pku.apps.googleusercontent.com
```

Client ID 属于公开前端配置，可以出现在 Vite 构建产物中。它本身不是密码。

当前已配置的 Authorized JavaScript origins：

```text
http://localhost:5173
http://localhost:5174
https://dealer-ops-dev.azurewebsites.net
```

注意：origin 只包含协议、域名和端口，不要在末尾添加路径。例如：

```text
正确： https://dealer-ops-dev.azurewebsites.net
错误： https://dealer-ops-dev.azurewebsites.net/login
错误： https://dealer-ops-dev.azurewebsites.net/
```

Google Cloud 管理入口：

```text
https://console.cloud.google.com/auth/clients?project=plasma-crossbar-443700-j7
```

## 3. 本地开发配置

本地 Client ID 已写入：

```text
frontend/react/.env.local
```

内容为：

```dotenv
VITE_GOOGLE_CLIENT_ID=660111025309-k8qneu1ifuhgtptb3onimtq988bb1pku.apps.googleusercontent.com
```

`.env.local` 已被仓库的 `.gitignore` 忽略，不应提交到 Git。若在另一台开发机器上运行 React 前端，需要自行创建该文件，或在启动/构建前设置同名环境变量。

## 4. Azure 构建和发布配置

### Terraform 与 Google OAuth 的边界

Terraform 当前负责 Azure 基础设施，不直接创建 Google OAuth Client。这样设计是因为：

- Azure 资源属于 Azure subscription，由 `azurerm` provider 管理；
- OAuth Client 属于 Google Cloud project，由 Google Cloud Console 管理；
- Google OAuth Client ID 是公开前端配置，不是 Azure Key Vault secret；
- 运行 `terraform apply` 不会重复创建 OAuth Client，也不会轮换 Client Secret；
- Terraform 创建或确认 Azure Web App 域名后，发布脚本再把同一个 Client ID 编译进 React SPA。

推荐的完整顺序：

```bash
cd /Users/robin/IdeaProjects/DealerOps

# 1. 创建或更新 Azure 资源，并发布全部服务
./deploy/deploy.sh --apply

# 2. 查看 Terraform 实际分配的前端地址
terraform output -raw web_public_url

# 3. 如果只需要重新发布 React SPA（Terraform 已经 apply），执行：
./deploy/deploy.sh web
```

默认 `web_app_name = "dealer-ops-dev"` 时，Terraform 输出的前端地址应为：

```text
https://dealer-ops-dev.azurewebsites.net
```

如果通过 `name_suffix` 或 `web_app_name` 改了 Azure 前端域名，必须同时把新的 origin 添加到 Google OAuth Client；Terraform 不会自动修改 Google Cloud 中的 OAuth 配置。

Azure 发布脚本是：

```text
deploy/terraform/deploy-apps.sh
```

脚本在发布 `web` 目标时执行 React 构建，并注入：

```bash
VITE_GATEWAY_URL="${gateway_url}" \
VITE_GOOGLE_CLIENT_ID="${VITE_GOOGLE_CLIENT_ID:-660111025309-k8qneu1ifuhgtptb3onimtq988bb1pku.apps.googleusercontent.com}" \
VITE_PUBLISHED_AT="${published_at}" \
  npm run build
```

这意味着：

- 默认会使用当前 DealerOps Client ID；
- 发布操作者也可以通过外部环境变量覆盖 `VITE_GOOGLE_CLIENT_ID`；
- Client ID 会在构建时写入 React 静态资源；
- 不需要把 Client Secret 放进 Azure App Service、Key Vault、前端文件或 Git 仓库；
- `VITE_GATEWAY_URL` 仍然由 Terraform 输出决定，Google Client ID 与后端网关地址是两个独立配置。

标准发布流程：

```bash
cd /Users/robin/IdeaProjects/DealerOps/deploy/terraform

# 如果基础设施尚未创建
terraform init
terraform apply -auto-approve

# 发布全部服务和 React 前端
./deploy-apps.sh

# 只重新发布前端
./deploy/deploy.sh web
```

发布完成后，前端地址来自：

```bash
terraform output -raw web_public_url
```

按当前默认配置，它应为：

```text
https://dealer-ops-dev.azurewebsites.net
```

## 5. OAuth 测试模式和用户管理

当前 OAuth 同意屏幕是 External / 测试模式。Google 登录账号必须加入 OAuth consent screen 的 Test users 列表，否则非测试账号可能看到“Google hasn’t verified this app”或无法继续授权。

管理路径：

```text
Google Auth Platform → Audience → Test users
```

进入正式生产使用前，应确认：

1. 应用名称和支持邮箱正确。
2. OAuth consent screen 中的测试用户已覆盖实际测试账号。
3. 如果面向大量外部用户，评估是否需要发布应用并完成 Google 验证。
4. 只申请项目实际需要的 Google scope；当前 Google 登录只应使用身份识别所需的最小 scope。

## 6. 自定义域名

如果以后给 Azure Web App 绑定自定义域名，例如：

```text
https://dealerops.example.com
```

必须在 Google Cloud 同一个 OAuth Client 的 Authorized JavaScript origins 中新增该 origin：

```text
https://dealerops.example.com
```

同时确认：

- Azure Web App 的 HTTPS 证书和绑定已生效；
- 浏览器实际访问的 origin 与 Google Cloud 中配置的 origin 完全一致；
- 后端 CORS 的 `CORS_ALLOWED_ORIGIN` 也改为正式前端域名；
- 如果保留 Azure 默认域名和本地开发，旧 origin 可以继续保留。

不要把带路径的 URL 写入 Authorized JavaScript origins。

## 7. 常见问题排查

### 7.1 `origin_mismatch`

原因通常是当前浏览器地址不在 Authorized JavaScript origins 中。检查：

```text
浏览器地址栏的协议 + 域名 + 端口
```

与 Google Cloud 配置逐字符比较。常见差异包括：

- `http` 与 `https` 不同；
- `localhost` 与 `127.0.0.1` 不同；
- 端口不同；
- 使用了自定义域名但尚未添加；
- origin 错误地带上了 `/login` 或其他路径。

### 7.2 Google 登录按钮不显示

确认 React 构建时存在：

```text
VITE_GOOGLE_CLIENT_ID
```

可检查本地文件：

```bash
grep '^VITE_GOOGLE_CLIENT_ID=' frontend/react/.env.local
```

Azure 发布时，确认使用的是修改后的 `deploy/terraform/deploy-apps.sh`，并重新执行：

```bash
./deploy-apps.sh web
```

Vite 环境变量是在构建时注入的；只修改 Azure App Service 的运行时环境变量，不会改变已经生成的静态 JS 文件。

### 7.3 登录后后端拒绝 token

这通常不是 Google origin 问题。检查：

- 后端使用的 Google Client ID 与前端一致；
- Gateway URL 指向当前 Azure gateway；
- 后端 Google token 校验接口已经部署；
- 用户在 DealerOps 中已经被管理员激活或绑定对应车行；
- 浏览器 Network 中请求是否发送到了 Gateway，而不是 core 或 ai-service。

### 7.4 Azure 页面仍是旧前端

重新构建并上传 React SPA：

```bash
cd /Users/robin/IdeaProjects/DealerOps/deploy/terraform
./deploy-apps.sh web
```

然后清除浏览器缓存或使用无痕窗口验证。Azure App Service 中 React 是静态构建产物，修改源码或 `.env.local` 后必须重新执行 `npm run build` 并上传 `dist`。

## 8. 安全记录

- Client ID 可以公开，它必须随前端应用发送给 Google。
- Client Secret 不应提交到 Git、写入 React、写入 `.env.local` 后上传、写入聊天记录或放进浏览器可访问的配置。
- 本项目的 Google Identity Services 浏览器登录只需要 Client ID；不要为了前端登录把 Client Secret 加到 `VITE_*` 变量。
- 如果未来采用服务端 OAuth authorization-code 流程，Client Secret 应放入 Azure Key Vault，并由后端通过托管身份读取。
- 如果怀疑 Client Secret 泄露，应在 Google Cloud 为该 OAuth Client 轮换 Secret，并同步更新所有后端安全存储；不要删除整个 Client ID，除非确认需要让所有已部署前端立即失效。

## 9. 变更摘要

本次配置完成的内容：

1. 创建 Google OAuth consent / branding 配置，应用名为 `DealerOps`。
2. 创建 Web application 类型的真实 OAuth Client，名称为 `DealerOps Web`。
3. 配置本地 origin：`http://localhost:5173`。
4. 配置 Azure origin：`https://dealer-ops-dev.azurewebsites.net`。
5. 将 Client ID 写入本地 `frontend/react/.env.local`。
6. 修改 `deploy/terraform/deploy-apps.sh`，确保 Azure React 构建注入 `VITE_GOOGLE_CLIENT_ID`。
7. 使用 `bash -n` 验证发布脚本语法通过。

