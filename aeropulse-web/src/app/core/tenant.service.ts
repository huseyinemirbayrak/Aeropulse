import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { ApiResponse, Tenant } from './models';

@Injectable({ providedIn: 'root' })
export class TenantService {
  private readonly API = environment.apiUrl;
  private readonly STORAGE_KEY = 'aeropulse_tenant_id';

  private tenantsSubject = new BehaviorSubject<Tenant[]>([]);
  public tenants$ = this.tenantsSubject.asObservable();

  private currentTenantSubject = new BehaviorSubject<Tenant | null>(null);
  public currentTenant$ = this.currentTenantSubject.asObservable();

  constructor(private http: HttpClient) {
    this.loadTenants();
  }

  public loadTenants(): Observable<ApiResponse<Tenant[]>> {
    return this.http.get<ApiResponse<Tenant[]>>(`${this.API}/tenants`).pipe(
      tap((res) => {
        if (res.success && res.data) {
          this.tenantsSubject.next(res.data);
          this.restoreSelectedTenant(res.data);
          // console.log('Kiracılar listesi geldi:', res.data);
        }
      })
    );
  }

  // Tarayıcı hafızasındaki seçili firmayı geri yüklüyoruz
  private restoreSelectedTenant(tenants: Tenant[]): void {
    const savedTenantId = localStorage.getItem(this.STORAGE_KEY);
    if (savedTenantId && savedTenantId !== 'ALL') {
      const match = tenants.find(
        (t) => t.id.toLowerCase() === savedTenantId.toLowerCase() || t.code.toUpperCase() === savedTenantId.toUpperCase()
      );
      if (match) {
        this.currentTenantSubject.next(match);
        return;
      }
    }
    // Seçim yoksa genel havalimanı görünümü aktif kalsın
    this.currentTenantSubject.next(null);
  }

  // Kullanıcı dropdown'dan firma seçtiğinde çalışır
  public selectTenant(tenant: Tenant | null): void {
    if (tenant) {
      localStorage.setItem(this.STORAGE_KEY, tenant.code);
      this.currentTenantSubject.next(tenant);
      console.log('Firma seçildi:', tenant.code);
    } else {
      localStorage.setItem(this.STORAGE_KEY, 'ALL');
      this.currentTenantSubject.next(null);
      console.log('Genel havalimanı görünümüne geçildi');
    }
    // Verilerin yeni firma filtresine göre temiz yüklenmesi için sayfayı yeniliyoruz
    window.location.reload();
  }

  public getSelectedTenantHeader(): string {
    return localStorage.getItem(this.STORAGE_KEY) || 'ALL';
  }

  public get currentTenant(): Tenant | null {
    return this.currentTenantSubject.value;
  }
}
