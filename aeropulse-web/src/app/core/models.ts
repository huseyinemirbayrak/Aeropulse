export enum UserRole {
  Admin = 'Admin',
  OperationsManager = 'OperationsManager',
  MROEngineer = 'MROEngineer',
  FieldTechnician = 'FieldTechnician',
  Viewer = 'Viewer'
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  roleName: string;
  isActive: boolean;
  createdAt: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
  role: UserRole;
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface PagedResult<T> {
  items: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface Aircraft {
  id: string;
  tailNumber: string;
  model: string;
  manufactureYear: number;
  statusCode: string;
  statusName: string;
  totalFlightHours: number;
  operator: string;
  partsCount: number;
  activeFaultsCount: number;
  createdAt: string;
}

export interface Part {
  id: string;
  partName: string;
  partNumber: string;
  aircraftId: string;
  aircraftTailNumber: string;
  lifeSpanHours: number;
  usedHours: number;
  criticalThresholdHours: number;
  remainingLifeHours: number;
  usagePercentage: number;
  isCritical: boolean;
  location: string;
  manufacturer: string;
  isActive: boolean;
  createdAt: string;
}

export interface MaintenanceRecord {
  id: string;
  aircraftId: string;
  aircraftTailNumber: string;
  partId: string | null;
  partName: string | null;
  workPerformed: string;
  engineerId: string;
  engineerName: string;
  date: string;
  certificateNo: string;
  maintenanceType: string;
  maintenanceTypeName: string;
  nextScheduledDate: string | null;
  notes: string;
  createdAt: string;
}

export interface AdminDashboard {
  totalAircraft: number;
  activeAircraft: number;
  inMaintenanceAircraft: number;
  totalUsers: number;
  openFaults: number;
  criticalFaults: number;
  slaBreaches: number;
  criticalParts: number;
  totalMaintenanceRecords: number;
  recentFaults: RecentFault[];
  aircraftStatusSummary: AircraftStatusSummary[];
}

export interface MRODashboard {
  myOpenTasks: number;
  completedThisMonth: number;
  criticalPartsCount: number;
  pendingMaintenanceCount: number;
  upcomingMaintenance: MaintenanceRecord[];
  criticalParts: Part[];
}

export interface RecentFault {
  id: string;
  aircraftTailNumber: string;
  description: string;
  priority: string;
  status: string;
  openDate: string;
}

export interface AircraftStatusSummary {
  status: string;
  statusName: string;
  count: number;
}

export interface UpdateUser {
  fullName: string;
  email: string;
  role?: UserRole;
  isActive?: boolean;
}

// ===== MODULE 3: Operations =====
export enum OperationStatus {
  Scheduled = 'Scheduled',
  InProgress = 'InProgress',
  Delayed = 'Delayed',
  Completed = 'Completed',
  Cancelled = 'Cancelled'
}

export interface Operation {
  id: string;
  aircraftId: string;
  aircraftTailNumber: string;
  gateNo: string;
  flightNumber: string;
  arrivalTime: string;
  departureTime: string;
  status: OperationStatus;
  delayMinutes: number;
  delayReason: string | null;
  operationsManagerId: string | null;
  operationsManagerName: string | null;
  createdAt: string;
}

export interface CreateOperation {
  aircraftId: string;
  gateNo: string;
  flightNumber: string;
  arrivalTime: string;
  departureTime: string;
  operationsManagerId?: string;
}

export interface UpdateOperation {
  gateNo?: string;
  flightNumber?: string;
  arrivalTime?: string;
  departureTime?: string;
  status?: OperationStatus;
  delayMinutes?: number;
  delayReason?: string;
  operationsManagerId?: string;
}

export interface CloseOperation {
  delayMinutes: number;
  delayReason?: string;
  completionNotes?: string;
}

export interface SLARecord {
  operationId: string;
  flightNumber: string;
  turnaroundMinutes: number;
  delayMinutes: number;
  metSLA: boolean;
  notes: string;
  recordedAt: string;
}

export interface OperationChecklistItem {
  step: string;
  isCompleted: boolean;
}

export interface OperationChecklist {
  operationId: string;
  flightNumber: string;
  aircraftTailNumber: string;
  gateNo: string;
  status: OperationStatus;
  items: OperationChecklistItem[];
}

// ===== MODULE 3: Fault Reports =====
export enum FaultStatus {
  Open = 'Open',
  UnderReview = 'UnderReview',
  InProgress = 'InProgress',
  Resolved = 'Resolved',
  Closed = 'Closed'
}

export enum PriorityLevel {
  Low = 'Low',
  Medium = 'Medium',
  High = 'High',
  Critical = 'Critical'
}

export interface FaultReport {
  id: string;
  aircraftId: string;
  aircraftTailNumber: string;
  reportedByTechnicianId: string;
  reportedByTechnicianName: string;
  assignedEngineerId: string | null;
  assignedEngineerName: string | null;
  priority: PriorityLevel;
  status: FaultStatus;
  openDate: string;
  closeDate: string | null;
  description: string;
  resolutionNotes: string | null;
  elapsedMinutes: number;
  isSLABreached: boolean;
  createdAt: string;
}

export interface CreateFaultReport {
  aircraftId: string;
  priority: PriorityLevel;
  description: string;
  assignedEngineerId?: string;
}

export interface UpdateFaultReport {
  status?: FaultStatus;
  priority?: PriorityLevel;
  resolutionNotes?: string;
  assignedEngineerId?: string;
}

// ===== MODULE 3B: Jet Bridges =====
export enum JetBridgeStatus {
  Available = 'Available',
  Reserved = 'Reserved',
  Connected = 'Connected',
  UnderMaintenance = 'UnderMaintenance'
}

export enum JetBridgeAssignmentStatus {
  Planned = 'Planned',
  AircraftLanded = 'AircraftLanded',
  BridgeConnected = 'BridgeConnected',
  DisembarkingComplete = 'DisembarkingComplete',
  Released = 'Released'
}

export interface JetBridge {
  id: string;
  bridgeNo: string;
  terminalNo: string;
  statusCode: JetBridgeStatus;
  currentAssignment: JetBridgeAssignment | null;
  createdAt: string;
}

export interface CreateJetBridge {
  bridgeNo: string;
  terminalNo: string;
  statusCode: JetBridgeStatus;
}

export interface UpdateJetBridge {
  bridgeNo?: string;
  terminalNo?: string;
  statusCode?: JetBridgeStatus;
}

export interface JetBridgeAssignment {
  id: string;
  jetBridgeId: string;
  bridgeNo: string;
  terminalNo: string;
  aircraftId: string;
  aircraftTailNumber: string;
  operationId: string;
  flightNumber: string;
  estimatedArrivalTime: string;
  actualArrivalTime: string | null;
  connectionTime: string | null;
  disconnectionTime: string | null;
  passengerCount: number;
  status: JetBridgeAssignmentStatus;
  createdAt: string;
}

export interface CreateJetBridgeAssignment {
  jetBridgeId: string;
  aircraftId: string;
  operationId: string;
  estimatedArrivalTime: string;
  estimatedDepartureTime: string;
  passengerCount: number;
}

export interface UpdateAssignmentStatus {
  newStatus: JetBridgeAssignmentStatus;
}

export interface JetBridgeConflictResult {
  hasConflict: boolean;
  message: string;
  conflictingAssignment: JetBridgeAssignment | null;
  alternativeBridges: JetBridge[];
}

// ===== MODULE 4: Notifications =====
export enum NotificationType {
  FaultAssigned = 'FaultAssigned',
  FaultStatusChanged = 'FaultStatusChanged',
  SLAWarning = 'SLAWarning',
  SLABreached = 'SLABreached',
  PartCriticalThreshold = 'PartCriticalThreshold',
  MaintenanceScheduled = 'MaintenanceScheduled',
  General = 'General',
  JetBridgeConnected = 'JetBridgeConnected',
  JetBridgeReleased = 'JetBridgeReleased',
  OperationDelayed = 'OperationDelayed',
  OperationCompleted = 'OperationCompleted'
}

export interface AppNotification {
  id: string;
  recipientUserId: string;
  recipientName: string;
  faultReportId: string | null;
  message: string;
  notificationType: NotificationType;
  isRead: boolean;
  date: string;
}

// ===== MODULE 6: Metrics =====
export interface Metrics {
  totalOpenFaults: number;
  totalSLABreaches: number;
  avgFaultResolutionMinutes: number;
  activeOperations: number;
  totalJetBridges: number;
  availableJetBridges: number;
  connectedJetBridges: number;
  generatedAt: string;
}
