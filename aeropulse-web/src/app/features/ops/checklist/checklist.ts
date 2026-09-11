import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterModule, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { ApiService } from '../../../core/api.service';
import { NotificationService } from '../../../core/notification.service';
import { SignalRService } from '../../../core/signalr.service';

interface MissingPassenger {
  id: string;
  name: string;
  seat: string;
  bagTag: string;
  bagStatus: 'LOADED' | 'OFFLOADED' | 'NO_BAG';
  announced: boolean;
}

@Component({
  selector: 'app-checklist',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="dashboard animate-fade-in" *ngIf="loading && !operation">
      <div class="glass-card text-center py-5">
        <p class="text-muted">Turnaround & Uçuş detayları yükleniyor...</p>
      </div>
    </div>

    <div class="dashboard animate-fade-in" *ngIf="operation">
      <!-- HEADER & FLIGHT STRIP -->
      <div class="header-actions mb-3">
        <div>
          <div class="d-flex align-items-center gap-2 flex-wrap">
            <span class="flight-badge">✈️ {{ operation.flightNumber }}</span>
            <h1 class="section-title mb-0">{{ operation.tailNumber }} • {{ operation.aircraftModel || 'Airbus A320neo' }}</h1>
            <span class="status-badge" [ngClass]="operation.status === 'Completed' ? 'success' : 'warning'">
              {{ operation.status }}
            </span>
          </div>
          <p class="text-muted mt-1 mb-0">
            📍 Kapı: <strong>{{ operation.gateNo || 'A1' }}</strong> • 
            Pist: <strong>{{ operation.assignedRunwayCode || '35R' }}</strong> • 
            Hedef Kalkış: <strong>{{ operation.departureTime | date:'shortTime' }}</strong> •
            Güzergah: <strong>IST ➔ Frankfurt (FRA)</strong>
          </p>
        </div>
        <div class="header-buttons">
          <button class="btn btn-secondary" routerLink="/ops/operations">◀ Seferler</button>
          <button class="btn btn-secondary" routerLink="/ops/gse-fleet">Apron Filosu</button>
          <button class="btn btn-secondary" routerLink="/ops/ramp">Ramp Görevleri</button>
          <button class="btn btn-secondary" routerLink="/ops/dashboard">Uçuş Radarı</button>
          <button class="btn btn-refresh" (click)="loadTurnaroundData()">🔄 Yenile</button>
        </div>
      </div>

      <!-- REDCAP COUNTDOWN & SUMMARY BANNER -->
      <div class="glass-card banner-card mb-4">
        <div class="banner-grid">
          <!-- SÜRE GERİ SAYIMI -->
          <div class="banner-col">
            <span class="banner-label">DÖNÜŞ (TURNAROUND) KRONOMETRESİ</span>
            <div class="countdown-value">{{ countdownText }}</div>
            <span class="banner-sub">Hedeflenen kalkış saatine kalan süre</span>
          </div>

          <!-- GÖREV İLERLEMESİ -->
          <div class="banner-col">
            <span class="banner-label">GENEL GÖREV İLERLEMESİ</span>
            <div class="d-flex align-items-center gap-2 mt-1">
              <div class="progress-track flex-grow-1">
                <div class="progress-bar-fill" [style.width.%]="overallProgress"></div>
              </div>
              <strong class="progress-text">{{ overallProgress }}%</strong>
            </div>
            <span class="banner-sub">{{ completedTasksCount }} / {{ tasks.length }} Görev Tamamlandı</span>
          </div>

          <!-- REDCAP KALKIŞ ONAYI (CLEARANCE) SWITCH -->
          <div class="banner-col">
            <span class="banner-label">REDCAP KALKIŞ YETKİSİ (CLEARANCE)</span>
            <div class="d-flex align-items-center gap-2 mt-1">
              <button 
                class="clearance-toggle-btn"
                [class.authorized]="manifest?.loadsheetApproved"
                (click)="toggleClearance()"
                [disabled]="approvalSubmitting"
              >
                <span class="indicator-dot"></span>
                {{ manifest?.loadsheetApproved ? '🚀 KALKIŞ İZNİ VERİLDİ' : '🛑 ONAY BEKLİYOR' }}
              </button>
            </div>
            <span class="banner-sub" *ngIf="manifest?.approvedByRedcap">
              Onaylayan: {{ manifest.approvedByRedcap }}
            </span>
            <span class="banner-sub" *ngIf="!manifest?.approvedByRedcap">
              Kalkış için Redcap dijital imzası gereklidir
            </span>
          </div>
        </div>
      </div>

      <!-- TAB NAVIGATION -->
      <div class="tab-nav mb-4">
        <button class="tab-btn" [class.active]="activeTab === 'TASKS'" (click)="activeTab = 'TASKS'">
          📋 Turnaround Görevleri & Redcap ({{ tasks.length }})
        </button>
        <button class="tab-btn" [class.active]="activeTab === 'BOARDING'" (click)="activeTab = 'BOARDING'">
          🚶‍♂️ Yolcu Hizmetleri & Biniş (Gate Agent)
        </button>
        <button class="tab-btn" [class.active]="activeTab === 'LOADSHEET'" (click)="activeTab = 'LOADSHEET'">
          ⚖️ Yük & Denge Formu (e-Loadsheet)
        </button>
      </div>

      <!-- ============================================== -->
      <!-- TAB 1: TURNAROUND GÖREVLERİ (REDCAP KOORDİNASYONU) -->
      <!-- ============================================== -->
      <div *ngIf="activeTab === 'TASKS'" class="tab-content">
        <div class="glass-card mb-4">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h3 class="card-section-title">⏱️ Kritik Dönüş Adımları (7 Temel Görev)</h3>
              <p class="text-muted mb-0">Uçağın inişinden kalkışına kadar sahada yürütülen eş zamanlı yer hizmetleri</p>
            </div>
            <button class="btn btn-sm btn-outline" (click)="loadTurnaroundData()">Görevleri Tazele</button>
          </div>

          <div class="tasks-list">
            <div *ngFor="let task of tasks" class="task-card" [ngClass]="getTaskCardClass(task.status)">
              <!-- SOL: İKON VE BİLGİ -->
              <div class="task-left">
                <div class="task-icon-box">
                  <span class="task-icon">{{ getTaskIcon(task.taskType) }}</span>
                </div>
                <div class="task-details">
                  <div class="task-title-row">
                    <h4 class="task-name">{{ getTaskTitle(task.taskType) }}</h4>
                    <span class="badge" [ngClass]="getTaskBadgeClass(task.status)">
                      {{ getTaskStatusText(task.status) }}
                    </span>
                  </div>

                  <!-- GÖREVE ÖZEL CANLI METRİK -->
                  <div class="task-dynamic-metric mt-1">
                    <span class="metric-text">{{ getDynamicTaskMetric(task) }}</span>
                  </div>

                  <p class="task-notes text-muted mt-1 mb-0" *ngIf="task.notes">{{ task.notes }}</p>

                  <div class="task-meta mt-2">
                    <a *ngIf="task.assignedGSECode" routerLink="/ops/gse-fleet" class="meta-pill gse" style="text-decoration: none; cursor: pointer;" title="Apron GSE Filosunda Gör">
                      🚜 Araç: <strong>{{ task.assignedGSECode }} ➔</strong>
                    </a>
                    <span *ngIf="task.assignedUserName" class="meta-pill user">
                      👷 Sorumlu: <strong>{{ task.assignedUserName }}</strong>
                    </span>
                    <span class="meta-pill time">
                      ⏱️ Hedef: {{ task.targetDurationMinutes }} dk
                    </span>
                  </div>
                </div>
              </div>

              <!-- ORTA / İLERLEME ÇUBUĞU VE SLIDER -->
              <div class="task-center">
                <div class="d-flex justify-content-between mb-1" style="font-size: 0.75rem;">
                  <span class="text-muted">İlerleme Seviyesi</span>
                  <strong>{{ task.progressPercentage }}%</strong>
                </div>
                <div class="progress-track">
                  <div class="progress-bar-fill" [style.width.%]="task.progressPercentage"></div>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="100" 
                  [(ngModel)]="task.progressPercentage" 
                  class="progress-slider mt-2" 
                  (change)="quickUpdateProgress(task)"
                  title="İlerlemeyi kaydırın"
                />
              </div>

              <!-- SAĞ / AKSİYON BUTONLARI -->
              <div class="task-actions">
                <button 
                  *ngIf="task.status === 0" 
                  class="btn btn-sm btn-primary" 
                  (click)="updateTaskStatus(task, 2)"
                >
                  ▶ Başlat
                </button>
                <button 
                  *ngIf="task.status === 2" 
                  class="btn btn-sm btn-success" 
                  (click)="updateTaskStatus(task, 3)"
                >
                  ✓ Tamamla
                </button>
                <span *ngIf="task.status === 3" class="text-success font-weight-bold" style="font-size: 0.85rem;">
                  ✅ Bitti
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- ============================================== -->
      <!-- TAB 2: YOLCU HİZMETLERİ & BİNİŞ (GATE AGENT & BRS) -->
      <!-- ============================================== -->
      <div *ngIf="activeTab === 'BOARDING'" class="tab-content">
        <div class="grid grid-2 mb-4">
          <!-- SOL: MANİFESTO & CANLI BİNİŞ SAYAÇLARI -->
          <div class="glass-card">
            <h3 class="card-section-title mb-3">🚶‍♂️ Yolcu Manifestosu & Biniş Sayacı (Gate Agent)</h3>

            <div class="boarding-stats-grid mb-4">
              <div class="boarding-stat-box">
                <span class="label">TOPLAM BİLETLİ</span>
                <span class="num">{{ manifest?.totalBooked || 180 }}</span>
                <small class="text-muted">Kayıtlı Yolcu</small>
              </div>
              <div class="boarding-stat-box highlight">
                <span class="label">UÇAĞA BİNEN</span>
                <span class="num text-success">{{ manifest?.boardedCount || 0 }}</span>
                <small class="text-muted">{{ ((manifest?.boardedCount || 0) / (manifest?.totalBooked || 180) * 100) | number:'1.0-0' }}% Tamamlandı</small>
              </div>
              <div class="boarding-stat-box">
                <span class="label">KAPIDA BEKLEYEN</span>
                <span class="num text-warning">{{ missingPassengerCount }}</span>
                <small class="text-muted">Eksik / Gelmeyen</small>
              </div>
            </div>

            <div class="mb-4">
              <div class="d-flex justify-content-between mb-1">
                <span>Kapı Biniş İlerlemesi</span>
                <strong>{{ ((manifest?.boardedCount || 0) / (manifest?.totalBooked || 180) * 100) | number:'1.0-0' }}%</strong>
              </div>
              <div class="progress-track" style="height: 12px;">
                <div class="progress-bar-fill" [style.width.%]="(manifest?.boardedCount || 0) / (manifest?.totalBooked || 180) * 100"></div>
              </div>
            </div>

            <!-- BARKOD / BİNİŞ SİMÜLATÖRÜ -->
            <div class="d-flex gap-2 flex-wrap mb-2">
              <button class="btn btn-primary" (click)="scanSinglePassenger()" [disabled]="(manifest?.boardedCount || 0) >= (manifest?.totalBooked || 180)">
                🎫 Biniş Kartı Tara (+1 Yolcu)
              </button>
              <button class="btn btn-outline" (click)="bulkScanPassengers(10)" [disabled]="(manifest?.boardedCount || 0) >= (manifest?.totalBooked || 180)">
                👥 Grup Tara (+10 Yolcu)
              </button>
              <button class="btn btn-secondary" (click)="completeAllBoarding()">
                ✓ Kapıyı Kapat (Tümünü Al)
              </button>
            </div>
          </div>

          <!-- SAĞ: BRS (BAGAJ EŞLEŞTİRME SİSTEMİ) GÜVENLİK KONTROLÜ -->
          <div class="glass-card">
            <h3 class="card-section-title mb-3">🧳 BRS (Baggage Reconciliation System)</h3>
            
            <div class="brs-box mb-3">
              <div class="d-flex justify-content-between align-items-center mb-2">
                <span>Kayıtlı Ambar Bagajı:</span>
                <strong>{{ manifest?.checkedBaggageCount || 154 }} Adet</strong>
              </div>
              <div class="d-flex justify-content-between align-items-center mb-2">
                <span>Uçağa Yüklenen Bagaj:</span>
                <strong class="text-info">{{ manifest?.loadedBaggageCount || 0 }} Adet</strong>
              </div>
              <div class="d-flex justify-content-between align-items-center">
                <span>Bagaj-Yolcu Eşleşmesi:</span>
                <span class="badge" [ngClass]="isLuggageCompliant ? 'success' : 'warning'">
                  {{ isLuggageCompliant ? '✅ %100 Güvenli & Eşleşti' : '⚠️ Eksik Yolcu Bagajı Var' }}
                </span>
              </div>
            </div>

            <div class="brs-alert-card mb-3" *ngIf="missingPassengerCount > 0 && hasLoadedMissingBags">
              <div class="alert-icon">⚠️</div>
              <div>
                <strong>ICAO Annex 17 & IATA Güvenlik Kuralı:</strong>
                <p class="mb-0 text-muted" style="font-size: 0.85rem;">
                  Uçağa henüz binmemiş {{ missingPassengerCount }} yolcu bulunmaktadır. Ambarda uçağa binmeyen yolcuya ait bagaj varsa uçuştan derhal indirilmelidir!
                </p>
              </div>
            </div>

            <button class="btn btn-warning w-100 mb-2" (click)="notifyMissingPassengers()">
              📢 Eksik Yolcuları Redcap & OCC'ye Bildir
            </button>
          </div>
        </div>

        <!-- GELMEYEN / KAYIP YOLCULAR LİSTESİ (ANONS & BRS AMBAR İNDİRME) -->
        <div class="glass-card">
          <div class="d-flex justify-content-between align-items-center mb-3">
            <div>
              <h3 class="card-section-title">🚨 Biniş Yapmayan (Eksik) Yolcular & BRS Bagaj Takibi</h3>
              <p class="text-muted mb-0">Kapıya gelmeyen yolcular için son çağrı anonsu yapabilir veya güvenlik gereği bagajını ambardan indirebilirsiniz.</p>
            </div>
            <span class="badge warning">{{ missingPassengers.length }} Yolcu Bekleniyor</span>
          </div>

          <div class="table-responsive">
            <table class="data-table">
              <thead>
                <tr>
                  <th>KOLTUK</th>
                  <th>YOLCU ADI</th>
                  <th>BAGAJ ETİKETİ (TAG)</th>
                  <th>BRS BAGAJ DURUMU</th>
                  <th>KAPI ÇAĞRISI</th>
                  <th style="text-align: right;">GÜVENLİK AKSİYONU</th>
                </tr>
              </thead>
              <tbody>
                <tr *ngFor="let p of missingPassengers">
                  <td>
                    <span class="seat-badge">{{ p.seat }}</span>
                  </td>
                  <td>
                    <strong>{{ p.name }}</strong>
                    <div class="text-muted" style="font-size: 0.75rem;">Ekonomi Sınıfı • Check-in Yapıldı</div>
                  </td>
                  <td>
                    <code class="bag-tag">{{ p.bagTag }}</code>
                  </td>
                  <td>
                    <span *ngIf="p.bagStatus === 'LOADED'" class="badge danger">
                      Ambarda Yüklü (Risk)
                    </span>
                    <span *ngIf="p.bagStatus === 'OFFLOADED'" class="badge success">
                      ✅ Ambardan İndirildi
                    </span>
                    <span *ngIf="p.bagStatus === 'NO_BAG'" class="badge info">
                      Bagajsız Yolcu
                    </span>
                  </td>
                  <td>
                    <span *ngIf="p.announced" class="badge info">📢 Anons Yapıldı</span>
                    <span *ngIf="!p.announced" class="badge secondary">Bekliyor</span>
                  </td>
                  <td style="text-align: right;">
                    <div class="d-flex justify-content-end gap-2">
                      <button 
                        class="btn btn-sm btn-outline" 
                        (click)="announcePassenger(p)"
                        title="Havalimanı hoparlöründen son çağrı anonsu simülasyonu"
                      >
                        📢 Anons Yap
                      </button>
                      <button 
                        *ngIf="p.bagStatus === 'LOADED'"
                        class="btn btn-sm btn-danger" 
                        (click)="offloadBag(p)"
                        title="Yolcu gelmediği için bagajı uçaktan çıkar"
                      >
                        🧳 Bagajı İndir (BRS)
                      </button>
                      <button 
                        *ngIf="p.bagStatus === 'OFFLOADED'"
                        class="btn btn-sm btn-secondary" 
                        (click)="restoreBag(p)"
                      >
                        Geri Yükle
                      </button>
                    </div>
                  </td>
                </tr>

                <tr *ngIf="missingPassengers.length === 0">
                  <td colspan="6" class="text-center py-4 text-success font-weight-bold">
                    🎉 Tüm yolcular uçağa bindi! Kapı kapatmaya hazır.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <!-- ============================================== -->
      <!-- TAB 3: YÜK VE DENGE (LOADSHEET) & FLIGHT RELEASE -->
      <!-- ============================================== -->
      <div *ngIf="activeTab === 'LOADSHEET'" class="tab-content">
        <div class="glass-card loadsheet-card">
          <div class="loadsheet-header mb-4">
            <div class="d-flex align-items-center gap-2">
              <span class="logo-plane">✈️</span>
              <div>
                <h3 class="mb-0">AEROPULSE ELEKTRONİK YÜK VE DENGE FORMU (e-LOADSHEET)</h3>
                <small class="text-muted">IATA AHM 560 Standardına Uygun Ağırlık ve Ağırlık Merkezi (CG) Formu</small>
              </div>
            </div>
            <div class="loadsheet-status">
              <span *ngIf="manifest?.loadsheetApproved" class="stamp approved">ONAYLANDI (RELEASED)</span>
              <span *ngIf="!manifest?.loadsheetApproved" class="stamp pending">TASLAK (DRAFT)</span>
            </div>
          </div>

          <!-- AĞIRLIK VE DENGE TABLOSU -->
          <div class="loadsheet-table-wrap mb-4">
            <table class="loadsheet-table">
              <thead>
                <tr>
                  <th>AĞIRLIK PARAMETRESİ</th>
                  <th>DEĞER (KG)</th>
                  <th>LİMİT (MAX KG)</th>
                  <th>DURUM</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>Kuru Boş Ağırlık (Dry Operating Weight - DOW)</td>
                  <td><strong>41,500 kg</strong></td>
                  <td>-</td>
                  <td><span class="badge success">OK</span></td>
                </tr>
                <tr>
                  <td>Yolcu Yükü (Traffic Load: {{ manifest?.boardedCount || 162 }} pax x 84 kg)</td>
                  <td><strong>{{ (manifest?.boardedCount || 162) * 84 | number }} kg</strong></td>
                  <td>-</td>
                  <td><span class="badge success">OK</span></td>
                </tr>
                <tr>
                  <td>Bagaj & Ambar Kargo (Luggage Weight)</td>
                  <td><strong>{{ (manifest?.loadedBaggageCount || 130) * 18 | number }} kg</strong></td>
                  <td>-</td>
                  <td><span class="badge success">OK</span></td>
                </tr>
                <tr class="highlight-row">
                  <td>Sıfır Yakıt Ağırlığı (Zero Fuel Weight - ZFW)</td>
                  <td><strong>{{ 41500 + ((manifest?.boardedCount || 162) * 84) + ((manifest?.loadedBaggageCount || 130) * 18) | number }} kg</strong></td>
                  <td>62,500 kg</td>
                  <td><span class="badge success">LİMİT DAHİLİ</span></td>
                </tr>
                <tr>
                  <td>Alınan Blok Yakıt (Takeoff / Block Fuel)</td>
                  <td><strong>8,500 kg</strong></td>
                  <td>26,020 kg</td>
                  <td><span class="badge success">OK</span></td>
                </tr>
                <tr class="total-row">
                  <td>Kalkış Ağırlığı (Takeoff Weight - TOW)</td>
                  <td><strong>{{ 41500 + ((manifest?.boardedCount || 162) * 84) + ((manifest?.loadedBaggageCount || 130) * 18) + 8500 | number }} kg</strong></td>
                  <td>79,000 kg</td>
                  <td><span class="badge success">UYGUN (GO)</span></td>
                </tr>
                <tr>
                  <td>Ağırlık Merkezi (Center of Gravity - CG)</td>
                  <td><strong>%27.4 MAC</strong></td>
                  <td>%18 - %33 MAC</td>
                  <td><span class="badge success">DENGEDE</span></td>
                </tr>
              </tbody>
            </table>
          </div>

          <!-- ONAY VE İMZA KUTULARI -->
          <div class="approval-box">
            <div class="grid grid-2 mb-3">
              <div class="signature-box">
                <span class="sign-role">HAREKAT MEMURU (REDCAP)</span>
                <strong class="sign-name">{{ manifest?.approvedByRedcap || 'Sarah Operations (Redcap)' }}</strong>
                <span class="sign-status" [class.signed]="manifest?.loadsheetApproved">
                  {{ manifest?.loadsheetApproved ? '✅ DİJİTAL İMZALANDI' : '⏳ İMZA BEKLİYOR' }}
                </span>
                <small class="text-muted" *ngIf="manifest?.departureClearanceGivenAt">
                  İmza Tarihi: {{ manifest.departureClearanceGivenAt | date:'medium' }}
                </small>
              </div>

              <div class="signature-box">
                <span class="sign-role">SORUMLU KAPTAN PİLOT</span>
                <strong class="sign-name">Kpt. Mehmet Yılmaz</strong>
                <span class="sign-status" [class.signed]="manifest?.loadsheetApproved">
                  {{ manifest?.loadsheetApproved ? '✅ ACARS ÜZERİNDEN KABUL EDİLDİ' : '⏳ ACARS İLETİMİ BEKLİYOR' }}
                </span>
                <small class="text-muted">Kokpit EFBsine iletildi</small>
              </div>
            </div>

            <!-- BUTON AKSİYONLARI -->
            <div class="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div>
                <p class="mb-0 text-muted" style="font-size: 0.85rem;">
                  Bu form onaylandığında ATC kulesine kalkış hazırlığının tamamlandığı bildirilir ve uçağa kalkış izni (departure clearance) verilir.
                </p>
              </div>
              <div class="d-flex gap-2">
                <button 
                  *ngIf="!manifest?.loadsheetApproved"
                  class="btn btn-success btn-lg" 
                  (click)="toggleClearance(true)"
                  [disabled]="approvalSubmitting"
                >
                  🚀 Loadsheet'i Onayla ve Kalkış İzni Ver
                </button>
                <button 
                  *ngIf="manifest?.loadsheetApproved"
                  class="btn btn-outline-danger btn-lg" 
                  (click)="toggleClearance(false)"
                  [disabled]="approvalSubmitting"
                >
                  🛑 Kalkış İznini Geri Al (Revoke Clearance)
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dashboard {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .section-title {
      font-size: 1.5rem;
      font-weight: 800;
      color: #fff;
    }

    .flight-badge {
      font-size: 1.25rem;
      font-weight: 800;
      color: #00d4ff;
      background: rgba(0, 212, 255, 0.1);
      padding: 4px 12px;
      border-radius: 6px;
      border: 1px solid rgba(0, 212, 255, 0.3);
    }

    .status-badge {
      font-size: 0.8rem;
      padding: 3px 8px;
      border-radius: 999px;
      font-weight: 700;
    }
    .status-badge.success { background: rgba(16, 185, 129, 0.2); color: #34d399; }
    .status-badge.warning { background: rgba(245, 158, 11, 0.2); color: #fbbf24; }

    .header-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .header-buttons {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .btn-refresh {
      background: rgba(0, 212, 255, 0.1);
      border: 1px solid rgba(0, 212, 255, 0.3);
      color: #ffffff;
      padding: 0.6rem 1rem;
      border-radius: 8px;
      cursor: pointer;
    }

    /* BANNER */
    .banner-card {
      background: linear-gradient(135deg, rgba(15, 21, 56, 0.9) 0%, rgba(20, 30, 80, 0.9) 100%);
      border: 1px solid rgba(0, 212, 255, 0.2);
      padding: 1.25rem;
      border-radius: 12px;
    }

    .banner-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
      gap: 1.5rem;
    }

    .banner-col {
      display: flex;
      flex-direction: column;
      justify-content: center;
    }

    .banner-label {
      font-size: 0.75rem;
      font-weight: 700;
      color: #94a3b8;
      letter-spacing: 0.5px;
    }

    .countdown-value {
      font-size: 1.75rem;
      font-weight: 800;
      color: #00d4ff;
      font-family: monospace;
    }

    .banner-sub {
      font-size: 0.8rem;
      color: #94a3b8;
      margin-top: 0.25rem;
    }

    .clearance-toggle-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.5rem 1rem;
      border-radius: 8px;
      font-weight: 700;
      font-size: 0.875rem;
      cursor: pointer;
      background: rgba(245, 158, 11, 0.15);
      border: 1px solid #f59e0b;
      color: #fbbf24;
      transition: all 0.2s ease;
    }

    .clearance-toggle-btn.authorized {
      background: rgba(16, 185, 129, 0.2);
      border-color: #10b981;
      color: #34d399;
    }

    .indicator-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: currentColor;
      box-shadow: 0 0 6px currentColor;
    }

    /* TAB NAV */
    .tab-nav {
      display: flex;
      gap: 0.5rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 0.5rem;
      overflow-x: auto;
    }

    .tab-btn {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
      padding: 0.6rem 1.2rem;
      border-radius: 8px;
      font-weight: 600;
      font-size: 0.9rem;
      cursor: pointer;
      transition: all 0.2s ease;
      white-space: nowrap;
    }

    .tab-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      color: #fff;
    }

    .tab-btn.active {
      background: rgba(0, 212, 255, 0.15);
      border-color: #00d4ff;
      color: #00d4ff;
      box-shadow: 0 0 10px rgba(0, 212, 255, 0.2);
    }

    /* TASKS LIST */
    .tasks-list {
      display: flex;
      flex-direction: column;
      gap: 1rem;
    }

    .task-card {
      display: grid;
      grid-template-columns: 1fr 220px 140px;
      gap: 1.5rem;
      align-items: center;
      padding: 1rem 1.25rem;
      background: rgba(15, 23, 42, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 10px;
      transition: all 0.2s ease;
    }

    .task-card:hover {
      background: rgba(15, 23, 42, 0.9);
      border-color: rgba(0, 212, 255, 0.3);
    }

    .task-card.in-progress {
      border-left: 4px solid #f59e0b;
      background: rgba(245, 158, 11, 0.04);
    }

    .task-card.completed {
      border-left: 4px solid #10b981;
      background: rgba(16, 185, 129, 0.04);
    }

    .task-left {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .task-icon-box {
      width: 44px;
      height: 44px;
      border-radius: 10px;
      background: rgba(0, 212, 255, 0.1);
      border: 1px solid rgba(0, 212, 255, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
      flex-shrink: 0;
    }

    .task-details {
      flex: 1;
    }

    .task-title-row {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      flex-wrap: wrap;
    }

    .task-name {
      margin: 0;
      font-size: 1rem;
      font-weight: 700;
      color: #fff;
    }

    .task-dynamic-metric {
      font-size: 0.85rem;
      color: #38bdf8;
      font-weight: 600;
    }

    .task-meta {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .meta-pill {
      font-size: 0.75rem;
      padding: 2px 8px;
      border-radius: 4px;
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
    }
    .meta-pill.gse { border-color: rgba(245, 158, 11, 0.3); color: #fbbf24; }
    .meta-pill.user { border-color: rgba(168, 85, 247, 0.3); color: #c084fc; }

    .progress-track {
      width: 100%;
      height: 8px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 999px;
      overflow: hidden;
    }

    .progress-bar-fill {
      height: 100%;
      background: linear-gradient(90deg, #00d4ff, #10b981);
      border-radius: 999px;
      transition: width 0.3s ease;
    }

    .progress-slider {
      width: 100%;
      height: 4px;
      cursor: pointer;
    }

    .task-actions {
      display: flex;
      justify-content: flex-end;
      align-items: center;
    }

    /* BOARDING & BRS */
    .boarding-stats-grid {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 1rem;
    }

    .boarding-stat-box {
      padding: 1rem;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 0.25rem;
    }

    .boarding-stat-box.highlight {
      border-color: rgba(16, 185, 129, 0.3);
      background: rgba(16, 185, 129, 0.08);
    }

    .boarding-stat-box .label {
      font-size: 0.75rem;
      color: #94a3b8;
      font-weight: 700;
    }

    .boarding-stat-box .num {
      font-size: 1.75rem;
      font-weight: 800;
    }

    .brs-box {
      padding: 1rem;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
    }

    .brs-alert-card {
      display: flex;
      gap: 0.75rem;
      align-items: flex-start;
      padding: 0.85rem;
      background: rgba(239, 68, 68, 0.1);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 8px;
      color: #f87171;
    }

    .seat-badge {
      display: inline-block;
      padding: 3px 8px;
      background: rgba(0, 212, 255, 0.15);
      border: 1px solid rgba(0, 212, 255, 0.3);
      border-radius: 4px;
      color: #00d4ff;
      font-weight: 800;
      font-size: 0.85rem;
    }

    .bag-tag {
      background: rgba(255, 255, 255, 0.08);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.8rem;
    }

    /* LOADSHEET */
    .loadsheet-card {
      padding: 2rem;
      background: rgba(15, 23, 42, 0.8);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 12px;
    }

    .loadsheet-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
      padding-bottom: 1.25rem;
    }

    .stamp {
      font-size: 0.85rem;
      font-weight: 800;
      padding: 6px 14px;
      border-radius: 6px;
      border: 2px solid currentColor;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .stamp.approved { color: #10b981; background: rgba(16, 185, 129, 0.1); }
    .stamp.pending { color: #f59e0b; background: rgba(245, 158, 11, 0.1); }

    .loadsheet-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 0.95rem;
    }
    .loadsheet-table th, .loadsheet-table td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
    }
    .loadsheet-table th {
      color: #94a3b8;
      font-size: 0.8rem;
      text-align: left;
    }
    .highlight-row { background: rgba(0, 212, 255, 0.05); }
    .total-row { background: rgba(16, 185, 129, 0.1); font-weight: 700; font-size: 1.05rem; }

    .approval-box {
      border-top: 1px solid rgba(255, 255, 255, 0.1);
      padding-top: 1.5rem;
      margin-top: 1rem;
    }

    .signature-box {
      padding: 1rem;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 8px;
      display: flex;
      flex-direction: column;
      gap: 0.35rem;
    }

    .sign-role {
      font-size: 0.75rem;
      color: #94a3b8;
      font-weight: 700;
    }

    .sign-name {
      font-size: 1rem;
      color: #fff;
    }

    .sign-status {
      font-size: 0.8rem;
      font-weight: 700;
      color: #f59e0b;
    }
    .sign-status.signed {
      color: #10b981;
    }

    /* BADGES */
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 600;
    }
    .badge.secondary { background: rgba(255, 255, 255, 0.1); color: #94a3b8; }
    .badge.info { background: rgba(56, 189, 248, 0.15); color: #38bdf8; }
    .badge.warning { background: rgba(245, 158, 11, 0.15); color: #fbbf24; }
    .badge.danger { background: rgba(239, 68, 68, 0.15); color: #f87171; }
    .badge.success { background: rgba(16, 185, 129, 0.15); color: #34d399; }

    .btn-lg {
      padding: 0.75rem 1.5rem;
      font-size: 1rem;
      font-weight: 700;
    }

    .btn-outline-danger {
      background: transparent;
      border: 1px solid #ef4444;
      color: #ef4444;
      border-radius: 8px;
      cursor: pointer;
    }
    .btn-outline-danger:hover {
      background: rgba(239, 68, 68, 0.2);
    }

    @media (max-width: 900px) {
      .task-card {
        grid-template-columns: 1fr;
        gap: 1rem;
      }
      .task-actions {
        justify-content: flex-start;
      }
    }
  `]
})
export class ChecklistComponent implements OnInit, OnDestroy {
  loading = false;
  operationId = '';
  operation: any = null;
  tasks: any[] = [];
  manifest: any = null;
  activeTab: 'TASKS' | 'BOARDING' | 'LOADSHEET' = 'TASKS';

  countdownText = '00:38:15';
  approvalSubmitting = false;

  // Eksik / Gelmeyen Yolcular Listesi (Gate Agent & BRS Simülasyonu)
  missingPassengers: MissingPassenger[] = [
    { id: '1', name: 'Ahmet Yılmaz', seat: '14B', bagTag: 'TK-849201', bagStatus: 'LOADED', announced: false },
    { id: '2', name: 'Elena Rostova', seat: '22F', bagTag: 'TK-849202', bagStatus: 'LOADED', announced: false },
    { id: '3', name: 'Can Demir', seat: '08C', bagTag: 'TK-849203', bagStatus: 'LOADED', announced: false },
  ];

  private pollTimer: any = null;
  private subs: Subscription[] = [];

  constructor(
    private api: ApiService,
    private route: ActivatedRoute,
    private router: Router,
    private notification: NotificationService,
    private signalr: SignalRService
  ) {}

  ngOnInit() {
    // URL bazlı otomatik sekme seçimi (/turnaround/:id, /gate-agent/:id, /loadsheet/:id)
    const currentUrl = this.router.url;
    if (currentUrl.includes('gate-agent')) {
      this.activeTab = 'BOARDING';
    } else if (currentUrl.includes('loadsheet')) {
      this.activeTab = 'LOADSHEET';
    } else {
      this.activeTab = 'TASKS';
    }

    this.route.paramMap.subscribe(params => {
      this.operationId = params.get('id') || '';
      if (this.operationId) {
        this.loadTurnaroundData();
      }
    });

    this.route.queryParamMap.subscribe(params => {
      const tab = params.get('tab');
      if (tab === 'boarding') this.activeTab = 'BOARDING';
      if (tab === 'loadsheet') this.activeTab = 'LOADSHEET';
      if (tab === 'tasks') this.activeTab = 'TASKS';
    });

    // Canli turnaround ve yolcu binis durumunu dinle
    this.subs.push(
      this.signalr.turnaround$.subscribe((ev) => {
        if (ev.operationId === this.operationId || (this.operation && ev.flightNumber === this.operation.flightNumber)) {
          const task = this.tasks.find(t => t.id === ev.taskId);
          if (task) {
            const statusNum = ev.status === 'Completed' ? 3 : ev.status === 'InProgress' ? 2 : ev.status === 'Accepted' ? 1 : 0;
            task.status = statusNum;
            task.progressPercentage = ev.progressPercentage;
            if (ev.notes) task.notes = ev.notes;
            if (ev.assignedGSECode) task.assignedGSECode = ev.assignedGSECode;
          } else {
            this.loadTurnaroundData(true);
          }
        }
      }),

      this.signalr.boarding$.subscribe((ev) => {
        if (this.manifest && (ev.manifestId === this.manifest.id || (this.operation && ev.flightNumber === this.operation.flightNumber))) {
          this.manifest.boardedCount = ev.boardedCount;
          this.manifest.loadedBaggageCount = ev.loadedBaggageCount;
          this.manifest.luggageMatchComplete = ev.luggageMatchComplete;
          this.manifest.loadsheetApproved = ev.loadsheetApproved;
          this.manifest.approvedByRedcap = ev.approvedByRedcap;
        }
      })
    );

    this.pollTimer = setInterval(() => {
      if (this.operationId) this.loadTurnaroundData(true);
    }, 20000);
  }

  ngOnDestroy() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.operation?.flightNumber) {
      this.signalr.leaveFlight(this.operation.flightNumber);
    }
    this.subs.forEach(s => s.unsubscribe());
  }

  loadTurnaroundData(silent = false) {
    if (!silent) this.loading = true;

    this.api.getTurnaroundDetail(this.operationId).subscribe({
      next: (res) => {
        this.loading = false;
        if (res.success && res.data) {
          this.operation = res.data.operation;
          this.tasks = res.data.tasks || [];
          this.manifest = res.data.manifest;
          this.calculateCountdown();
        }
      },
      error: (err) => {
        this.loading = false;
        console.error('Turnaround detayı yüklenemedi:', err);
      }
    });
  }

  get overallProgress(): number {
    if (this.tasks.length === 0) return 0;
    const total = this.tasks.reduce((sum, t) => sum + (t.progressPercentage || 0), 0);
    return Math.round(total / this.tasks.length);
  }

  get completedTasksCount(): number {
    return this.tasks.filter(t => t.status === 3).length;
  }

  get missingPassengerCount(): number {
    const booked = this.manifest?.totalBooked || 180;
    const boarded = this.manifest?.boardedCount || 0;
    return Math.max(0, booked - boarded);
  }

  get hasLoadedMissingBags(): boolean {
    return this.missingPassengers.some(p => p.bagStatus === 'LOADED');
  }

  get isLuggageCompliant(): boolean {
    if (this.manifest?.luggageMatchComplete) return true;
    if (this.missingPassengerCount === 0) return true;
    // Eğer biniş yapmayan tüm yolcuların bagajı indirilmişse güvenlik tamdır
    return this.missingPassengers.every(p => p.bagStatus !== 'LOADED');
  }

  calculateCountdown() {
    if (!this.operation?.departureTime) {
      this.countdownText = '00:45:00';
      return;
    }
    const diffMs = new Date(this.operation.departureTime).getTime() - new Date().getTime();
    if (diffMs <= 0) {
      this.countdownText = '00:00:00 (Kalkış Zamanı)';
      return;
    }
    const mins = Math.floor(diffMs / 60000);
    const secs = Math.floor((diffMs % 60000) / 1000);
    this.countdownText = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }

  // Dinamik Metrik Hesaplayıcı
  getDynamicTaskMetric(task: any): string {
    const pct = task.progressPercentage || 0;
    switch (task.taskType) {
      case 1: // Baggage Unload
        return `🧳 ${Math.round((pct / 100) * 142)} / 142 Gelen Bagaj Boşaltıldı`;
      case 2: // Refueling
        return `⛽ ${Math.round((pct / 100) * 8500).toLocaleString()} kg / 8,500 kg Jet A-1 İkmal Edildi`;
      case 3: // Cleaning
        return pct >= 100 ? '🧹 Kabin & Lavabo Temizliği Tamamlandı' : '🧹 Kabin Temizliği Devam Ediyor';
      case 4: // Catering
        return pct >= 100 ? '🥪 Galley & Sıcak Yemek Yüklemesi Bitti' : '🥪 İkram & Trolley Yüklemesi Sürüyor';
      case 5: // Baggage Load
        const totalLuggage = this.manifest?.checkedBaggageCount || 154;
        return `📦 ${Math.round((pct / 100) * totalLuggage)} / ${totalLuggage} Çanta Ambara Yerleştirildi`;
      case 6: // Boarding
        const booked = this.manifest?.totalBooked || 180;
        const boarded = this.manifest?.boardedCount || 162;
        return `🚶‍♂️ ${boarded} / ${booked} Yolcu Uçakta`;
      case 7: // Pushback
        return pct >= 100 ? '🚜 Pushback Tamamlandı • Takozlar Alındı' : '🚜 Çeki Demiri Bağlandı • Onay Bekleniyor';
      default:
        return `${pct}% İlerleme`;
    }
  }

  // Task Helpers
  getTaskTitle(taskType: number): string {
    switch (taskType) {
      case 0: return 'Yolcu İndirme (Deboarding)';
      case 1: return 'Bagaj Boşaltma (Baggage Unload)';
      case 2: return 'Yakıt İkmali (Refueling)';
      case 3: return 'Kabin Temizliği (Cleaning)';
      case 4: return 'İkram Yükleme (Catering)';
      case 5: return 'Bagaj Yükleme (Baggage Load)';
      case 6: return 'Yolcu Binişi (Boarding)';
      case 7: return 'Pushback & Motor Çalıştırma';
      default: return 'Yer Hizmeti Görevi';
    }
  }

  getTaskIcon(taskType: number): string {
    switch (taskType) {
      case 0: return '🚶‍♀️';
      case 1: return '🧳';
      case 2: return '⛽';
      case 3: return '🧹';
      case 4: return '🥪';
      case 5: return '📦';
      case 6: return '🚶‍♂️';
      case 7: return '🚜';
      default: return '⚙️';
    }
  }

  getTaskStatusText(status: number): string {
    switch (status) {
      case 0: return 'Beklemede';
      case 1: return 'Kabul Edildi';
      case 2: return 'Devam Ediyor';
      case 3: return 'Tamamlandı';
      case 4: return 'Gecikmeli';
      default: return 'Bilinmiyor';
    }
  }

  getTaskBadgeClass(status: number): string {
    switch (status) {
      case 0: return 'secondary';
      case 1: return 'info';
      case 2: return 'warning';
      case 3: return 'success';
      case 4: return 'danger';
      default: return 'secondary';
    }
  }

  getTaskCardClass(status: number): string {
    switch (status) {
      case 2: return 'in-progress';
      case 3: return 'completed';
      default: return 'pending';
    }
  }

  updateTaskStatus(task: any, newStatus: number) {
    const progress = newStatus === 3 ? 100 : (newStatus === 2 ? 50 : task.progressPercentage);
    this.api.updateTurnaroundTask(task.id, {
      status: newStatus,
      progressPercentage: progress
    }).subscribe({
      next: (res) => {
        if (res.success) {
          task.status = newStatus;
          task.progressPercentage = progress;
          this.notification.success(`✅ ${this.getTaskTitle(task.taskType)} güncellendi.`);
        }
      },
      error: () => this.notification.error('Görev güncellenemedi.')
    });
  }

  quickUpdateProgress(task: any) {
    const newStatus = task.progressPercentage >= 100 ? 3 : (task.progressPercentage > 0 ? 2 : 0);
    this.api.updateTurnaroundTask(task.id, {
      status: newStatus,
      progressPercentage: task.progressPercentage
    }).subscribe({
      next: () => {
        task.status = newStatus;
      }
    });
  }

  // Boarding Actions
  scanSinglePassenger() {
    if (!this.manifest) return;
    const nextCount = (this.manifest.boardedCount || 0) + 1;
    this.manifest.boardedCount = nextCount;
    this.api.updateBoarding(this.manifest.id, {
      boardedCount: nextCount
    }).subscribe({
      next: () => this.notification.success(`🎫 Yolcu Bindi: #${nextCount}`)
    });
  }

  bulkScanPassengers(count: number) {
    if (!this.manifest) return;
    const nextCount = Math.min(this.manifest.totalBooked || 180, (this.manifest.boardedCount || 0) + count);
    this.manifest.boardedCount = nextCount;
    this.api.updateBoarding(this.manifest.id, {
      boardedCount: nextCount
    }).subscribe({
      next: () => this.notification.success(`👥 ${count} Yolcu Bindi. Toplam: ${nextCount}`)
    });
  }

  completeAllBoarding() {
    if (!this.manifest) return;
    const total = this.manifest.totalBooked || 180;
    this.manifest.boardedCount = total;
    this.manifest.loadedBaggageCount = this.manifest.checkedBaggageCount || 154;
    this.manifest.boardingStatus = 3; // Closed
    this.manifest.luggageMatchComplete = true;

    // Eksik yolcular listesini temizle
    this.missingPassengers = [];

    this.api.updateBoarding(this.manifest.id, {
      boardedCount: total,
      loadedBaggageCount: this.manifest.loadedBaggageCount,
      boardingStatus: 3,
      luggageMatchComplete: true
    }).subscribe({
      next: () => this.notification.success('✅ Tüm yolcular bindi ve kapı kapatıldı (Boarding Closed).')
    });
  }

  notifyMissingPassengers() {
    this.notification.warning(`📢 Harekat Memuruna (Redcap) & OCC'ye bildirildi: ${this.missingPassengerCount} yolcu henüz gelmedi!`);
  }

  announcePassenger(p: MissingPassenger) {
    p.announced = true;
    this.notification.info(`📢 [KAPI ANONS] Kapı ${this.operation.gateNo || 'A1'}: Sayın ${p.name} (Koltuk ${p.seat}), uçağınız kalkmak üzeredir. Lütfen derhal biniş kapısına geliniz!`);
  }

  offloadBag(p: MissingPassenger) {
    p.bagStatus = 'OFFLOADED';
    if (this.manifest && this.manifest.loadedBaggageCount > 0) {
      this.manifest.loadedBaggageCount--;
      this.api.updateBoarding(this.manifest.id, {
        loadedBaggageCount: this.manifest.loadedBaggageCount
      }).subscribe();
    }
    this.notification.warning(`🧳 [BRS AMBAR İNDİRME] Bagaj #${p.bagTag} (${p.name}) ICAO/IATA güvenlik kuralı gereğince ambardan indirildi!`);
  }

  restoreBag(p: MissingPassenger) {
    p.bagStatus = 'LOADED';
    if (this.manifest) {
      this.manifest.loadedBaggageCount = (this.manifest.loadedBaggageCount || 0) + 1;
      this.api.updateBoarding(this.manifest.id, {
        loadedBaggageCount: this.manifest.loadedBaggageCount
      }).subscribe();
    }
    this.notification.success(`🧳 Bagaj #${p.bagTag} tekrar ambara yüklendi.`);
  }

  // Loadsheet & Departure Clearance
  toggleClearance(status?: boolean) {
    if (!this.manifest) return;
    const targetStatus = status !== undefined ? status : !this.manifest.loadsheetApproved;

    this.approvalSubmitting = true;
    this.api.approveLoadsheet(this.manifest.id, 'Sarah Operations (Redcap)', targetStatus).subscribe({
      next: (res) => {
        this.approvalSubmitting = false;
        if (res.success) {
          this.manifest.loadsheetApproved = targetStatus;
          this.manifest.approvedByRedcap = targetStatus ? 'Sarah Operations (Redcap)' : null;
          this.manifest.departureClearanceGivenAt = targetStatus ? new Date() : null;
          if (targetStatus) {
            this.notification.success('🚀 Loadsheet Onaylandı ve Uçuşa Kalkış İzni (Release) Verildi!');
          } else {
            this.notification.warning('🛑 Kalkış izni geri alındı (Clearance Revoked).');
          }
        } else {
          this.notification.error(res.message || 'İşlem başarısız.');
        }
      },
      error: () => {
        this.approvalSubmitting = false;
        this.notification.error('Sunucu hatası.');
      }
    });
  }
}
