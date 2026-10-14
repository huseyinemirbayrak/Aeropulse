# AeroPulse | Enterprise Aviation & MRO Platform

[![.NET 10](https://img.shields.io/badge/.NET-10.0-512BD4?logo=dotnet)](https://dotnet.microsoft.com/)
[![Angular 19](https://img.shields.io/badge/Angular-19.0-DD0031?logo=angular)](https://angular.dev/)
[![SignalR](https://img.shields.io/badge/SignalR-Real--Time-007ACC?logo=azure)](https://dotnet.microsoft.com/apps/aspnet/signalr)
[![License](https://img.shields.io/badge/License-Proprietary-blue.svg)](#)

AeroPulse is an enterprise-grade airport operations control, multi-tenant fleet isolation, and Maintenance, Repair & Overhaul (MRO) management system engineered for mission-critical airside environments.

---

## Key Capabilities

- **Operations Control Center (OCC)**: Real-time aerodrome telemetry including runway occupancies, gate/stand matrices, and turnaround milestones for LTFM (Istanbul Airport).
- **Multi-Tenant Fleet Isolation**: Carrier segregation across Turkish Airlines, Pegasus Airlines, SunExpress, AJet, Lufthansa, and İGA Airport Authority.
- **MRO Avionics & Airframe Engineering**: Certified maintenance logging, life-limited parts tracking, and airworthiness status monitoring.
- **Autonomous Crisis Intervention**: Weather telemetry processing with automated jet bridge stowage protocols for gale-force wind conditions.
- **Ramp & Field Operations**: Real-time ground dispatch, turnaround checklists, and technician fault reporting.

---

## Architecture Stack

| Domain | Technology |
|---|---|
| **Backend API** | ASP.NET Core Web API (.NET 10), Clean Architecture |
| **Data Access** | Entity Framework Core, In-Memory Event Bus & Cache |
| **Real-Time Streaming** | ASP.NET Core SignalR Core WebSockets |
| **Frontend Client** | Angular 19+ (Standalone Components, Angular Material, RxJS) |
| **Authentication** | JWT Bearer Authentication with Role-Based Access Control |

---

## Quick Start

### Prerequisites
- [.NET 10 SDK](https://dotnet.microsoft.com/download)
- [Node.js 20+](https://nodejs.org/) & npm

### Starting the Platform
Launch both backend API and Angular web interface via the root runner:

```bash
npm start
```

Or run individual services:

```bash
# Backend (.NET Web API on http://localhost:5253)
npm run backend

# Frontend (Angular on http://localhost:4200)
npm run frontend
```

API documentation and interactive endpoint exploration are available at:
`http://localhost:5253/swagger`

---

## Enterprise Roles & Access
The platform enforces role-based separation of concerns:
- **System Administrator**: User management, carrier onboarding, audit logs.
- **Operations Manager (OCC)**: Flight dispatch, runway monitoring, turnaround oversight.
- **MRO Engineer**: Airworthiness inspection, component inventory, maintenance certification.
- **Field Technician**: Ramp task execution, GSE allocation, defect logging.

---

## Documentation
- [System Architecture & Design Specifications](docs/ARCHITECTURE.md)
- [REST API Reference](docs/API_REFERENCE.md)
