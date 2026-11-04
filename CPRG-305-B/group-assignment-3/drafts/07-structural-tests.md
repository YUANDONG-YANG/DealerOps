# Structural tests — current .NET solution

Evidence date: 2026-11-02.

Scope is the current .NET solution only. Java test projects were left out of this count.

## Solution

| Item | Value |
| --- | --- |
| Solution | `backend/dotnet/DealerOps.Core.sln` |
| SDK | .NET 10.0.401 (`dotnet --version` printed `10.0.401`) |
| Projects listed by `dotnet sln backend/dotnet/DealerOps.Core.sln list` | `DealerOps.AiService`, `DealerOps.Core`, `DealerOps.Gateway` |

| Project | Repo-relative path | Role |
| --- | --- | --- |
| DealerOps.AiService | `backend/dotnet/DealerOps.AiService/DealerOps.AiService.csproj` | Web app (`Microsoft.NET.Sdk.Web`, `net10.0`) |
| DealerOps.Core | `backend/dotnet/DealerOps.Core/DealerOps.Core.csproj` | Web app (`Microsoft.NET.Sdk.Web`, `net10.0`) |
| DealerOps.Gateway | `backend/dotnet/DealerOps.Gateway/DealerOps.Gateway.csproj` | Web app (`Microsoft.NET.Sdk.Web`, `net10.0`) |

`backend/dotnet/DealerOps.Logging/DealerOps.Logging.csproj` is a class library (`Microsoft.NET.Sdk`, `net10.0`) referenced by the three solution projects. It is outside the solution file. Restore of the solution also restores this library. It has no test SDK reference.

## Test inventory

Source search covered `backend/dotnet`: 221 `.cs` files outside `bin` and `obj`, four `.csproj` files, and one `.sln`. No path under that tree contains `test`. No project sets `IsTestProject` or references `Microsoft.NET.Test.Sdk`, xUnit, NUnit, or MSTest. No `.cs` file contains `[Fact]`, `[Theory]`, `[Test]`, `[TestMethod]`, or `[TestCase]`.

Test classes found: none. Test methods found: none.

| Project | Test classes | Test methods |
| --- | --- | --- |
| DealerOps.Core | 0 | 0 |
| DealerOps.Gateway | 0 | 0 |
| DealerOps.AiService | 0 | 0 |
| DealerOps.Logging (referenced, not in the solution) | 0 | 0 |
| Total | 0 | 0 |

There is no class or method name to list.

## Suite run

Command, from the repository root:

```text
DOTNET_CLI_USE_MSBUILD_SERVER=0 dotnet test backend/dotnet/DealerOps.Core.sln --nologo -nodeReuse:false -v n
```

Exit code: `0`.

The solution `VSTest` target validated configuration `Debug|Any CPU` and finished. No test host started. The log has no passed, failed, or skipped summary line.

Summary lines from that run:

```text
Build succeeded.

    1 Warning(s)
    0 Error(s)

Time Elapsed 00:00:02.53
```

The warning is restore warning `NU1902` on `backend/dotnet/DealerOps.Core/DealerOps.Core.csproj`: package `MySqlConnector` 2.4.0 has a known moderate severity vulnerability. It is a package audit warning. The build reported `0 Error(s)`.

## Evidence table

| Suite ID | Project | Class | Method count or method names | Command | Observed result | Status |
| --- | --- | --- | --- | --- | --- | --- |
| STR-01 | `backend/dotnet/DealerOps.Core.sln` | none | 0 | `DOTNET_CLI_USE_MSBUILD_SERVER=0 dotnet test backend/dotnet/DealerOps.Core.sln --nologo -nodeReuse:false -v n` | Exit 0. `Build succeeded.` `1 Warning(s)` `0 Error(s)` `Time Elapsed 00:00:02.53`. No passed/failed/skipped line. | NO TESTS |

`NO TESTS` means the SDK was present, the command finished, and the build succeeded with an empty test inventory. Counts above are from the source search and this run. They are not filled in.
