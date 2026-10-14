# AeroPulse System Architecture & Technical Specifications

## Executive Overview
AeroPulse is an enterprise-grade Aviation Operations and Maintenance, Repair & Overhaul (MRO) Platform. Designed to satisfy high-throughput airport airside operational requirements, it delivers synchronized ground handling telemetry, turnaround dispatching, multi-tenant airline fleet isolation, and predictive maintenance tracking.

---

## Architectural Layers

```
+------------------------------------------------------------------------+
|                     Presentation & Telemetry Tier                      |
|          Angular 19+ (Standalone Components, Material Design)          |
|                   WebSocket Streaming (SignalR Core)                   |
+------------------------------------+-----------------------------------+
                                     |
                                     v
+------------------------------------------------------------------------+
|                           API Gateway / Core                           |
|                       ASP.NET Core Web API (.NET 10)                   |
|       JWT Authentication - Multi-Tenant Resolution - CORS Policy       |
+------------------------------------+-----------------------------------+
                                     |
                                     v
+------------------------------------------------------------------------+
|                         Application Service Tier                       |
|           Clean Architecture - CQRS / Domain Event Dispatcher          |
|   OCC Dispatch - MRO Workflows - Turnaround SLA - Incident Management  |
+------------------------------------+-----------------------------------+
                                     |
                                     v
+------------------------------------------------------------------------+
|                         Infrastructure & Data                          |
|             Entity Framework Core - SQLite / SQL Server                |
|      In-Memory Pub/Sub Message Bus - In-Memory Invalidation Cache      |
+------------------------------------------------------------------------+
```

---

## Key Enterprise Modules

### 1. Operations Control Center (OCC)
- **Live Runway & Stand Telemetry**: Real-time status monitoring for runways (LTFM Istanbul Airport: 16R/34L, 16L/34R, 17R/35L, 17L/35R, 18/36) and gates/stands.
- **Turnaround Monitoring**: Turnaround milestone dispatching (Deboarding, Cleaning, Fueling, Catering, Baggage Loading, Boarding).
- **Automated SLA Tracking**: Proactive alerting for aircraft turnaround delays and ramp bottleneck resolution.

### 2. Multi-Tenant Fleet Isolation
- **Carrier Segregation**: Logical isolation of fleet records, ground equipment, and maintenance schedules across supported operators:
  - Turkish Airlines (TK / THY)
  - Pegasus Airlines (PC / PGS)
  - SunExpress (XQ / SXS)
  - AJet (VF / AJT)
  - Lufthansa (LH / DLH)
  - İGA Istanbul Airport Authority (Consolidated Hub View)
- **Scoped Tenant Resolution**: Handled via `X-Tenant-Code` headers, validated across EF Core Global Query Filters.

### 3. Maintenance, Repair & Overhaul (MRO)
- **Life-Limited Parts Tracking**: Cyclic and flight-hour threshold monitoring for critical airframe and avionics components.
- **EASA/FAA Maintenance Records**: Certification verification, automated release-to-service records, and technician audit trails.
- **Fault Reporting Workflow**: Defect logging from flight deck and ramp inspection directly into the engineering backlog.

### 4. Crisis & Autonomous Weather Intervention
- **OpenWeather Integration**: Continuous METAR/TAF meteorological telemetry ingestion.
- **Windshear & Severe Weather Trigger**: Automated lockdown of passenger boarding bridges (PBB / Jet Bridges) and ramp GSE halts upon wind gust thresholds (>45 knots).

### 5. Ground Support Equipment (GSE) Fleet
- **Asset Allocation**: Dispatching of pushback tugs, belt loaders, GPU, and ASU units across ramp stands.
- **Condition Monitoring**: Telemetry on battery charge, fuel status, and scheduled maintenance windows.

---

## Security & Compliance
- **Authentication**: Stateless JSON Web Token (JWT) with HMAC-SHA256 signing.
- **Role-Based Access Control (RBAC)**: Strict access matrices spanning `Admin`, `OperationsManager`, `MROEngineer`, and `FieldTechnician`.
- **Audit Logging**: Structured operational audit records for airside safety compliance.
