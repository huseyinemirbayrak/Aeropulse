import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  ApiResponse, PagedResult, Aircraft, Part, MaintenanceRecord,
  AdminDashboard, MRODashboard
} from './models';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly API = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Aircraft
  getAircraft(page = 1, pageSize = 20, search?: string): Observable<ApiResponse<PagedResult<Aircraft>>> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (search) params = params.set('search', search);
    return this.http.get<ApiResponse<PagedResult<Aircraft>>>(`${this.API}/aircraft`, { params });
  }

  getAircraftById(id: string): Observable<ApiResponse<Aircraft>> {
    return this.http.get<ApiResponse<Aircraft>>(`${this.API}/aircraft/${id}`);
  }

  createAircraft(data: any): Observable<ApiResponse<Aircraft>> {
    return this.http.post<ApiResponse<Aircraft>>(`${this.API}/aircraft`, data);
  }

  updateAircraft(id: string, data: any): Observable<ApiResponse<Aircraft>> {
    return this.http.put<ApiResponse<Aircraft>>(`${this.API}/aircraft/${id}`, data);
  }

  deleteAircraft(id: string): Observable<ApiResponse<boolean>> {
    return this.http.delete<ApiResponse<boolean>>(`${this.API}/aircraft/${id}`);
  }

  // Parts
  getParts(page = 1, pageSize = 20, search?: string, aircraftId?: string): Observable<ApiResponse<PagedResult<Part>>> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (search) params = params.set('search', search);
    if (aircraftId) params = params.set('aircraftId', aircraftId);
    return this.http.get<ApiResponse<PagedResult<Part>>>(`${this.API}/parts`, { params });
  }

  getPartById(id: string): Observable<ApiResponse<Part>> {
    return this.http.get<ApiResponse<Part>>(`${this.API}/parts/${id}`);
  }

  createPart(data: any): Observable<ApiResponse<Part>> {
    return this.http.post<ApiResponse<Part>>(`${this.API}/parts`, data);
  }

  updatePart(id: string, data: any): Observable<ApiResponse<Part>> {
    return this.http.put<ApiResponse<Part>>(`${this.API}/parts/${id}`, data);
  }

  getCriticalAlerts(): Observable<ApiResponse<Part[]>> {
    return this.http.get<ApiResponse<Part[]>>(`${this.API}/parts/critical-alerts`);
  }

  // Maintenance
  getMaintenanceRecords(page = 1, pageSize = 20, aircraftId?: string): Observable<ApiResponse<PagedResult<MaintenanceRecord>>> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (aircraftId) params = params.set('aircraftId', aircraftId);
    return this.http.get<ApiResponse<PagedResult<MaintenanceRecord>>>(`${this.API}/maintenance`, { params });
  }

  getMyTasks(): Observable<ApiResponse<MaintenanceRecord[]>> {
    return this.http.get<ApiResponse<MaintenanceRecord[]>>(`${this.API}/maintenance/my-tasks`);
  }

  createMaintenanceRecord(data: any): Observable<ApiResponse<MaintenanceRecord>> {
    return this.http.post<ApiResponse<MaintenanceRecord>>(`${this.API}/maintenance`, data);
  }

  updateMaintenanceRecord(id: string, data: any): Observable<ApiResponse<MaintenanceRecord>> {
    return this.http.put<ApiResponse<MaintenanceRecord>>(`${this.API}/maintenance/${id}`, data);
  }

  // Dashboard
  getAdminDashboard(): Observable<ApiResponse<AdminDashboard>> {
    return this.http.get<ApiResponse<AdminDashboard>>(`${this.API}/dashboard/admin`);
  }

  getMRODashboard(): Observable<ApiResponse<MRODashboard>> {
    return this.http.get<ApiResponse<MRODashboard>>(`${this.API}/dashboard/mro`);
  }

  getViewerDashboard(): Observable<ApiResponse<AdminDashboard>> {
    return this.http.get<ApiResponse<AdminDashboard>>(`${this.API}/dashboard/viewer`);
  }

  // ============================================
  // ===== MODULE 3: Operations =====
  // ============================================
  getOperations(page = 1, pageSize = 20, flightNumber?: string, status?: string): Observable<ApiResponse<PagedResult<any>>> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (flightNumber) params = params.set('flightNumber', flightNumber);
    if (status) params = params.set('status', status);
    return this.http.get<ApiResponse<PagedResult<any>>>(`${this.API}/operations`, { params });
  }

  getOperationById(id: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.API}/operations/${id}`);
  }

  createOperation(data: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.API}/operations`, data);
  }

  updateOperation(id: string, data: any): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.API}/operations/${id}`, data);
  }

  closeOperationWithSLA(id: string, data: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.API}/operations/${id}/close`, data);
  }

  getOperationChecklist(id: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.API}/operations/${id}/checklist`);
  }

  getDelayedOperations(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.API}/operations/delayed`);
  }

  // ============================================
  // ===== MODULE 3: Fault Reports =====
  // ============================================
  getFaultReports(page = 1, pageSize = 20, status?: string, aircraftId?: string): Observable<ApiResponse<PagedResult<any>>> {
    let params = new HttpParams().set('page', page).set('pageSize', pageSize);
    if (status) params = params.set('status', status);
    if (aircraftId) params = params.set('aircraftId', aircraftId);
    return this.http.get<ApiResponse<PagedResult<any>>>(`${this.API}/fault-reports`, { params });
  }

  getFaultReportById(id: string): Observable<ApiResponse<any>> {
    return this.http.get<ApiResponse<any>>(`${this.API}/fault-reports/${id}`);
  }

  createFaultReport(data: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.API}/fault-reports`, data);
  }

  updateFaultReport(id: string, data: any): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.API}/fault-reports/${id}`, data);
  }

  getMyFaults(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.API}/fault-reports/my-faults`);
  }

  getOverdueFaults(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.API}/fault-reports/overdue`);
  }

  // ============================================
  // ===== MODULE 3B: Jet Bridges =====
  // ============================================
  getJetBridges(terminalNo?: string): Observable<ApiResponse<any[]>> {
    let params = new HttpParams();
    if (terminalNo) params = params.set('terminalNo', terminalNo);
    return this.http.get<ApiResponse<any[]>>(`${this.API}/jet-bridges`, { params });
  }

  getAvailableJetBridges(terminalNo: string = 'T1'): Observable<ApiResponse<any[]>> {
    const params = new HttpParams().set('terminalNo', terminalNo);
    return this.http.get<ApiResponse<any[]>>(`${this.API}/jet-bridges/available`, { params });
  }

  getJetBridgeAssignments(jetBridgeId?: string): Observable<ApiResponse<any[]>> {
    let params = new HttpParams();
    if (jetBridgeId) params = params.set('jetBridgeId', jetBridgeId);
    return this.http.get<ApiResponse<any[]>>(`${this.API}/jet-bridges/assignments`, { params });
  }

  createJetBridgeAssignment(data: any): Observable<ApiResponse<any>> {
    return this.http.post<ApiResponse<any>>(`${this.API}/jet-bridges/assignments`, data);
  }

  updateJetBridgeAssignmentStatus(id: string, status: string): Observable<ApiResponse<any>> {
    return this.http.put<ApiResponse<any>>(`${this.API}/jet-bridges/assignments/${id}/status`, { newStatus: status });
  }

  checkJetBridgeAvailability(id: string, start: string, end: string): Observable<ApiResponse<any>> {
    const params = new HttpParams().set('start', start).set('end', end);
    return this.http.get<ApiResponse<any>>(`${this.API}/jet-bridges/${id}/check-availability`, { params });
  }

  // ============================================
  // ===== MODULE 4: Notifications =====
  // ============================================
  getMyNotifications(): Observable<ApiResponse<any[]>> {
    return this.http.get<ApiResponse<any[]>>(`${this.API}/notifications`);
  }

  getUnreadNotificationCount(): Observable<ApiResponse<number>> {
    return this.http.get<ApiResponse<number>>(`${this.API}/notifications/unread-count`);
  }

  markNotificationAsRead(id: string): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.API}/notifications/${id}/read`, {});
  }

  markAllNotificationsAsRead(): Observable<ApiResponse<boolean>> {
    return this.http.put<ApiResponse<boolean>>(`${this.API}/notifications/read-all`, {});
  }
}

