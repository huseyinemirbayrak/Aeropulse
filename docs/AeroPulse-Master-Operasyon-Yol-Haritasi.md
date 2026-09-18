# ✈️ AeroPulse Master Operations & Architecture Roadmap (Turnaround, OCC, Multi-Tenant, Event Bus)

This document is the **phased (step-by-step) master guide** prepared to address the shortcomings of the **AeroPulse** aviation and operations management system, adapt it to real-world airport operations (OCC, Turnaround/Redcap, Ramp, GSE Fleet, Line Maintenance, Gate Agent), and equip it with asynchronous messaging (In-Memory Event Bus / SignalR) and a Multi-Tenant architecture.

---

## 📌 Overview and Role Matrix

| Role / Persona | Operational Scope | Core Responsibilities and Authorities | Relevant Screen / Platform |
| :--- | :--- | :--- | :--- |
| **OCC Officer (Operations Control)** | Airport-wide bird's-eye management | Tracking inbound/outbound flights, upcoming flights, runway/gate occupancy, manual "override" of resource planning during delays. | Web (OCC Live Radar & Apron) |
| **Dispatcher (Redcap / Turnaround)** | Flight-based turnaround management | Managing ground services (fuel, baggage, catering, cleaning) for assigned flights, load/balance (loadsheet) approval, departure clearance (Release). | Web & Tablet (Turnaround Hub) |
| **Ramp Agent / Vehicle Operator** | Field physical operations | Viewing assigned work orders (baggage, pushback, stairs), updating status as *"Accepted" ➔ "Started" ➔ "Completed"*. | Responsive Web (Field / Tablet / Desktop) |
| **Equipment and Fleet Manager (GSE)** | Apron ground support vehicle efficiency | Monitoring real-time status (Idle / Busy / In Maintenance) and apron locations of buses, fuel tankers, tractors; pulling broken vehicles for service. | Web (GSE Fleet Manager) |
| **Technical Maintenance (Line Maintenance)** | Aircraft airworthiness | TechLog review, fault records, quick line maintenance, technical flight approval (Technical Release). | Web (MRO Tech Panel) |
| **Passenger Services (Gate Agent)** | Terminal Boarding | Aircraft passenger manifest, boarding count, missing passenger notification, baggage count reconciliation (BRS). | Web & Tablet (Gate Agent Boarding) |

---

## 🗺️ Phase 1: Hotfixes, Bug Resolution & Core Database Models

> **Target:** Repairing broken flows (authorization, error catching, buttons) in the current system and expanding the database schema for operational assets.

### 1.1. Urgent Bug Fixes
1. **Admin / Tech Panel "Submit Report" 403 Error:**
   - Add the `FieldTechnician` role to the `[Authorize(Roles = "Admin,OperationsManager,MROEngineer,Viewer")]` attribute on `AircraftController.cs`.
   - Add `error: (err) => ...` feedback to the `subscribe` block in `fault-form.ts`; make form validation dynamic.
2. **Dashboard Buttons and Routing:**
   - Wire up the `routerLink` and `(click)` event bindings for the inactive buttons (`refresh`, `manage operations`, `view jet bridges`, action modals) in the Admin and Ops Dashboards.

### 1.2. New Database Models (Domain Layer)
* **`Runway`:** `Id`, `RunwayCode` (e.g.: 35L, 17R), `Status` (Available, LandingInProgress, TakeoffInProgress, ClosedForMaintenance), `LengthMeters`.
* **`Gate` / `Stand`:** `Id`, `GateNumber`, `TerminalCode`, `HasJetBridge`, `Status` (Available, Occupied, Reserved, Maintenance).
* **`TurnaroundTask`:** `Id`, `OperationId`, `TaskType` (BaggageUnload, BaggageLoad, Refueling, Cleaning, Catering, PassengerBoarding, Pushback), `Status` (Pending, Accepted, InProgress, Completed, Delayed), `AssignedUserId`, `AssignedGSEId`, `StartTime`, `EndTime`, `TargetDurationMinutes`.
* **`GroundSupportEquipment` (GSE - Apron Vehicles):** `Id`, `Code` (e.g.: TANKER-01, BUS-03, TUG-05), `Type` (PassengerBus, FuelTanker, BaggageTug, PassengerStairs, PushbackTruck, GPU), `Status` (Idle, Busy, OutOfService), `FuelLevelPercentage`, `ApronZone`, `CurrentLatitude`, `CurrentLongitude`.
* **`PassengerManifest`:** `Id`, `OperationId`, `TotalBooked`, `BoardedCount`, `GateNo`, `BoardingStatus` (NotStarted, Boarding, FinalCall, Closed), `LuggageMatchComplete`.

---

## 🗺️ Phase 2: Operations Control Center (OCC) & Live Apron Dashboard

> **Target:** Transform the empty Ops Dashboard into a modern operations center where the OCC officer can manage the airport from a bird's-eye view.

### 2.1. Backend Enhancements
* **`IOccService` & `OccController`:**
  - `GET /api/occ/overview`: Inbound flights, outbound flights, active operations, delay statistics.
  - `GET /api/occ/runways`: Real-time availability status of all runways.
  - `GET /api/occ/gates`: Occupancy status of all gates and parking spots.
  - `POST /api/occ/override`: Manual override and logging of flight's gate, parking spot, or time.

### 2.2. Frontend Interface (`/ops/dashboard`)
* **Airport Bird's-eye Metrics:**
  - Live Runway Status Cards (Runway 35L: IDLE 🟢 | Runway 35R: LANDING TK1984 🟡).
  - Terminal Gate Matrix (Gate A1-A12 occupancy heat map).
  - Approaching Aircraft Timeline (Inbound Flight Radar List).
* **Manual Override Panel:**
  - Modal to redirect a delayed flight's gate to an empty jet bridge/open parking spot with one click.

---

## 🗺️ Phase 3: Turnaround Process Management (Redcap & Passenger Services)

> **Target:** Make the 45-60 minute turnaround of each flight trackable step-by-step and approvable per flight.

### 3.1. Dispatcher (Redcap) Screen (`/ops/turnaround/:operationId`)
* **Flight Turnaround Countdown:**
  - Countdown to the targeted departure time.
  - Live Status of 6 Core Tasks:
    1. 🧳 **Baggage Unload/Load:** % completion bar (e.g. 142/150 baggages loaded).
    2. ⛽ **Refueling:** Target fuel vs. Received fuel (e.g. 8,500 kg / 8,500 kg).
    3. 🧹 **Cabin Cleaning & Catering:** Completed confirmation.
    4. 🚶‍♂️ **Passenger Boarding:** 172/180 passengers on board.
    5. ⚖️ **Loadsheet:** Approved badge by Captain and Redcap.
    6. 🚀 **Flight Clearance:** Red/Green "Authorized" toggle.

### 3.2. Passenger Services (Gate Agent) Screen (`/ops/gate-agent/:operationId`)
* **Passenger Manifest and Boarding Tracking Panel:**
  - Passenger counter incrementing via barcode/ticket scanning simulation.
  - List of No-show/Missing passengers and announce/call button.
  - BRS (Baggage Reconciliation System): Matching status of boarding passenger with baggage in hold (Rule: Baggage of a no-show passenger must be offloaded).

---

## 🗺️ Phase 4: Apron Vehicle Fleet (GSE) & Ramp Agent Integration

> **Target:** Monitor the status of ground vehicles in the field (buses, fuel tankers, etc.) and dispatch mobile work orders to field personnel.

### 4.1. Equipment and Fleet Manager Panel (`/ops/gse-fleet`)
* **Vehicle Status Table and Apron Locations:**
  - **Passenger Buses:** Bus-01 (Idle / Gate B4), Bus-02 (Busy - Transporting TK1821 passengers), Bus-03 (Faulty - In Service).
  - **Fuel Tankers:** Tanker-01 (Refueling / Aircraft: TC-JHK), Tanker-02 (Idle / Depot Area).
  - **Status Change:** Moving a broken vehicle to "Out of Service" status (preventing new tasks from being assigned to it).

### 4.2. Ramp Agent Screen (Web & Field Panel)
* **Work Order Flow:**
  - Task Received ➔ **"Accept"** ➔ Start Time begins.
  - Task Started ➔ **"Process"** ➔ Location/Counter is logged.
  - Task Ended ➔ **"Completed"** ➔ Corresponding task on Turnaround screen turns green automatically.

---

## 🗺️ Phase 5: Asynchronous Event Queues (In-Memory Event Bus) & Live Screen Reflection (SignalR)

> **Target:** Flight status changes, task steps, and vehicle movements reflect on all screens in seconds without page refresh.

### 5.1. Event Bus Messaging Architecture
* **Message Types:**
  - `turnaround.task.updated`: Published when a task is completed.
  - `flight.gate.override`: Published when OCC changes a gate.
  - `gse.status.changed`: Published when a vehicle breaks down or goes on duty.
  - `boarding.progress`: Published whenever the passenger boarding count increases.
* **Worker Services (Consumer):**
  - Processes incoming messages from the queue, writes to the database, and forwards to relevant clients via SignalR Hub.

### 5.2. SignalR Live Hub (`AeroPulseHub`)
* All web clients connect via WebSocket:
  - `ReceiveTurnaroundUpdate(taskDto)`
  - `ReceiveGseUpdate(gseDto)`
  - `ReceiveFlightAlert(alertMessage)`

---

## 🗺️ Phase 6: Multi-Tenant Architecture Design

> **Target:** Isolate data of different airline companies (THY, Pegasus) and subcontractor ground services (TGS, Çelebi, Havaş).

### 6.1. Architectural Design & Isolation Strategy
* **Discriminator Column Approach (`TenantId`):**
  - `public Guid TenantId { get; set; }` and `ITenantEntity` interface added to all core entities.
* **EF Core Global Query Filter:**
  - `modelBuilder.Entity<T>().HasQueryFilter(e => e.TenantId == _currentTenantId || _isSuperAdmin);`
  - When an airline company user logs in, they can never query the flights or data of other airlines.
* **Tenant Middleware:**
  - The `tenant_id` claim is read from the incoming HTTP request's JWT Token and injected into the scoped `TenantService`.
* **Super-Admin / OCC (Airport Authority) View:**
  - The airport operations control officer has the authority to view flights of all tenants on a single screen (Cross-Tenant) for apron security.

---

## 📋 Implementation and Progress Checklist

- [x] **Phase 1:** `AircraftController` permissions and `fault-form` bug fix.
- [x] **Phase 1:** `Runway`, `Gate`, `TurnaroundTask`, `GSE`, `PassengerManifest` models and Seed data.
- [x] **Phase 2:** OCC Live Dashboard screen (Runways, Gates, Inbound Flights, Manual Override).
- [x] **Phase 3:** Redcap Turnaround Gantt/Timeline and Loadsheet approval flow.
- [x] **Phase 3:** Gate Agent Passenger Manifest and Boarding BRS tracking.
- [x] **Phase 4:** GSE Apron Vehicle Fleet Management (Bus & Tanker statuses, fault status).
- [x] **Phase 4:** Ramp Agent work order (Accept -> Start -> Complete) flow.
- [x] **Phase 6:** Multi-Tenant architecture (TenantId, EF Core Global Filter, JWT Claim / X-Tenant-ID Header & Frontend Switcher).
