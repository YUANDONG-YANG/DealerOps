# Current technology stack

This is the current implementation baseline for DealerOps. New design, code, deployment, and acceptance work must follow this file.

| Area | Current implementation |
|---|---|
| Backend | .NET 8 / ASP.NET Core |
| Core service | `backend/dotnet/DealerOps.Core` |
| Gateway | `backend/dotnet/DealerOps.Gateway` with YARP |
| AI service | `backend/dotnet/DealerOps.AiService` |
| Shared backend logging | `backend/dotnet/DealerOps.Logging` |
| Database | MySQL 8 + EF Core |
| Frontend | React 19 + TypeScript + Vite |
| Frontend source | `frontend/react` |
| Frontend state/router | Zustand + React Router |
| Public API entry | Gateway `http://localhost:8080` |
| Local frontend | `http://localhost:5174` |

Java/Spring Boot and Vue are deprecated and must not be used for new work. Their old paths, class names, package names, Maven files, and Vue components may appear only in files explicitly labelled `legacy`, `archive`, or `reviews`.

The browser and external clients use only the Gateway. Core (`8081`) and AI Service (`8082`) are internal service processes; AI `/internal/v1/**` routes are not browser APIs.
