# AeroPulse REST API Reference

## Authentication & Headers
All protected API endpoints require an `Authorization` header containing a valid Bearer token. Multi-tenant operations support an optional `X-Tenant-ID` or `X-Tenant-Code` header.

```http
Authorization: Bearer <jwt-token>
X-Tenant-ID: THY
```

---

## Core Endpoints

### 1. Authentication & Directory (`/api/auth`, `/api/users`)
- `POST /api/auth/login`: Authenticates user credentials and returns JWT bearer token with claims.
- `POST /api/auth/register`: Provisions a new system user with assigned role (Restricted to Admin).
- `GET /api/auth/me`: Returns the authenticated user profile and tenant scope.
- `GET /api/users`: Retrieves all directory users (Admin).
- `PUT /api/users/{id}`: Updates user details and role.
- `DELETE /api/users/{id}`: Deactivates user access.

### 2. Multi-Tenant Carriers (`/api/tenants`)
- `GET /api/tenants`: Retrieves registered commercial airlines, ground handlers, and aerodrome authorities.
- `GET /api/tenants/current`: Retrieves active tenant context from session/header.

### 3. Flight Operations & OCC (`/api/operations`, `/api/occ`)
- `GET /api/operations`: Retrieves paginated flight operations, filtered by tenant and status.
- `GET /api/operations/{id}`: Retrieves turnaround milestone progress and assigned stands.
- `POST /api/operations`: Schedules a new flight operation.
- `PUT /api/operations/{id}`: Updates operation schedule and operational status.
- `POST /api/operations/{id}/close`: Closes operation with SLA compliance audit.
- `GET /api/operations/delayed`: Retrieves active flights with delay alerts.

### 4. Aerodrome Infrastructure (`/api/occ`)
- `GET /api/occ/overview`: Aggregated airport operations control center telemetry (runways, gates, flights, GSE).
- `GET /api/occ/runways`: Real-time runway availability, surface condition, and active aircraft.
- `PUT /api/occ/runways/{id}/status`: Updates runway operational status (`Available`, `Landing`, `Takeoff`, `Maintenance`).
- `GET /api/occ/gates`: Stand and passenger boarding bridge allocation matrix.
- `POST /api/occ/gates/override`: Reassigns flight gate with operational audit trail.
- `GET /api/occ/gse`: Ground Support Equipment fleet status, battery/fuel levels, and assignments.
- `PUT /api/occ/gse/{id}/status`: Updates GSE status (`Idle`, `Active`, `OutOfService`).
- `PUT /api/occ/gse/{id}/refuel`: Records GSE refueling and restores fuel level to 100%.
- `GET /api/occ/turnaround/{operationId}`: Turnaround task checklist, baggage metrics, and departure authorization.
- `PUT /api/occ/turnaround/task/{taskId}`: Updates task milestone progress percentage and notes.
- `POST /api/occ/manifest/{manifestId}/approve-loadsheet`: Redcap weight & balance departure clearance.
- `PUT /api/occ/manifest/{manifestId}/boarding`: Updates passenger boarded count and baggage reconciliation.
- `GET /api/occ/ramp-tasks`: Ramp technician work order dispatch queue.
- `PUT /api/occ/ramp-tasks/{taskId}/workflow`: Advances ramp task workflow state (`Accept`, `Start`, `Complete`).

### 5. Passenger Boarding Bridges (`/api/jet-bridges`)
- `GET /api/jet-bridges`: Retrieves passenger boarding bridges by terminal.
- `GET /api/jet-bridges/{id}`: Retrieves specific jet bridge telemetries.
- `GET /api/jet-bridges/available`: Retrieves currently available bridges from cache/DB.
- `GET /api/jet-bridges/assignments`: Retrieves active flight assignments.
- `POST /api/jet-bridges/assignments`: Assigns jet bridge to aircraft with conflict detection.
- `PUT /api/jet-bridges/assignments/{id}/status`: Progresses bridge connection workflow.
- `GET /api/jet-bridges/check-availability`: Proactive conflict detection across time windows.

### 6. MRO Fleet & Maintenance (`/api/aircraft`, `/api/parts`, `/api/maintenance`)
- `GET /api/aircraft`: Fleet airframes, flight cycles, and active airworthiness status.
- `GET /api/parts`: Spare parts inventory and cyclic threshold monitoring for life-limited parts.
- `GET /api/parts/critical-alerts`: Retrieves components exceeding or nearing cyclic safety limits.
- `GET /api/maintenance`: Historical and scheduled certified maintenance logs.
- `GET /api/maintenance/my-tasks`: Assigned engineering work orders for authenticated engineer.
- `POST /api/maintenance`: Files a certified maintenance release (EASA Form 1 / FAA 8130-3).
- `PUT /api/maintenance/{id}`: Updates maintenance execution details.

### 7. Defect & Fault Management (`/api/fault-reports`)
- `GET /api/fault-reports`: Airframe and equipment discrepancy reports with SLA metrics.
- `GET /api/fault-reports/my-faults`: Defects reported by authenticated user.
- `GET /api/fault-reports/overdue`: Open defects exceeding resolution SLA threshold.
- `POST /api/fault-reports`: Logs new airside defect from flight deck or ramp inspection.
- `PUT /api/fault-reports/{id}`: Updates defect state or marks resolved with engineering notes.

### 8. Crisis & Autonomous Weather Surveillance (`/api/crisis`)
- `GET /api/crisis/weather`: Returns meteorological METAR/telemetry for airport hub (LTFM).
- `GET /api/crisis/status`: Active meteorological crisis status and secured bridge counts.
- `POST /api/crisis/wind/trigger`: Manual or simulation trigger for gale windstorm (>80 km/h) with automated bridge stowage protocols.
- `POST /api/crisis/wind/resolve`: Clears active crisis state and restores normal aerodrome envelope.

### 9. Real-Time Telemetry Streaming (`/hubs/aeropulse`)
SignalR WebSocket hub broadcasting real-time operational events:
- `ReceiveTurnaroundUpdate`: Turnaround task milestone transitions and progress percentages.
- `ReceiveFlightTurnaroundUpdate`: Targeted flight group turnaround updates.
- `ReceiveGateOverride`: Gate reassignments and stand changes.
- `ReceiveGseUpdate`: Ground equipment state and fuel level transitions.
- `ReceiveBoardingUpdate`: Real-time passenger boarded count and loadsheet approval.
- `ReceiveFlightAlert`: Priority operational alerts (`Danger`, `Warning`, `Info`).
- `ReceiveWeatherAlert`: Meteorological crisis triggers, wind velocity surges, and all-clear notifications.
