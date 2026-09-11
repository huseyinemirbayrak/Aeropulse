import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { ApiService } from '../../../core/api.service';
import { AuthService } from '../../../core/auth.service';
import { NotificationService } from '../../../core/notification.service';
import { SignalRService } from '../../../core/signalr.service';

@Component({
  selector: 'app-ramp-tasks',
  standalone: true,
  imports: [CommonModule, RouterModule, FormsModule],
  template: `
    <div class="dashboard animate-fade-in">
      <!-- HEADER -->
      <div class="header-actions mb-4">
        <div>
          <div class="d-flex align-items-center gap-2">
            <span class="ramp-badge">👷 RAMP</span>
            <h1 class="section-title mb-0">Ramp Görevlisi Saha İş Emirleri</h1>
          </div>
          <p class="text-muted mt-1 mb-0">
            Uçak başı yer hizmetleri (Yakıt ikmali, bagaj yükleme/boşaltma, ikram, temizlik ve pushback) anlık iş akışı
          </p>
        </div>
        <div class="header-buttons">
          <button class="btn btn-primary" (click)="loadTasks()">🔄 Yenile</button>
          <a class="btn btn-secondary" routerLink="/ops/gse-fleet">Apron Filosu</a>
          <a class="btn btn-outline" routerLink="/ops/operations">Uçuşlar</a>
        </div>
      </div>

      <!-- KPI METRİK KARTLARI -->
      <div class="grid grid-4 mb-4">
        <div class="glass-card stat-card">
          <div class="stat-icon-wrapper blue">📋</div>
          <div class="stat-details">
            <div class="stat-num">{{ tasks.length }}</div>
            <div class="stat-label">Toplam İş Emri</div>
          </div>
        </div>

        <div class="glass-card stat-card">
          <div class="stat-icon-wrapper amber">⚙️</div>
          <div class="stat-details">
            <div class="stat-num">{{ inProgressCount }}</div>
            <div class="stat-label">İşlemde / Sürüyor</div>
          </div>
        </div>

        <div class="glass-card stat-card">
          <div class="stat-icon-wrapper purple">⏳</div>
          <div class="stat-details">
            <div class="stat-num">{{ pendingCount }}</div>
            <div class="stat-label">Bekleyen / Havuzda</div>
          </div>
        </div>

        <div class="glass-card stat-card">
          <div class="stat-icon-wrapper green">✅</div>
          <div class="stat-details">
            <div class="stat-num">{{ completedCount }}</div>
            <div class="stat-label">Tamamlanan Görev</div>
          </div>
        </div>
      </div>

      <!-- SEKME NAVİGASYONU & FİLTRELER -->
      <div class="glass-card mb-4 filter-bar">
        <div class="tabs-group">
          <button class="tab-pill" [class.active]="activeTab === 'ACTIVE'" (click)="activeTab = 'ACTIVE'">
            🔥 Aktif Görevler ({{ inProgressCount + acceptedCount }})
          </button>
          <button class="tab-pill" [class.active]="activeTab === 'POOL'" (click)="activeTab = 'POOL'">
            ⏳ Görev Havuzu / Bekleyenler ({{ pendingCount }})
          </button>
          <button class="tab-pill" [class.active]="activeTab === 'COMPLETED'" (click)="activeTab = 'COMPLETED'">
            ✅ Tamamlananlar ({{ completedCount }})
          </button>
          <button class="tab-pill" [class.active]="activeTab === 'ALL'" (click)="activeTab = 'ALL'">
            Tümü ({{ tasks.length }})
          </button>
        </div>

        <div class="search-box">
          <input 
            type="text" 
            [(ngModel)]="searchQuery" 
            placeholder="Uçuş (TK1821), Görev veya Kapı ara..." 
            class="search-input"
          />
        </div>
      </div>

      <!-- İŞ EMİRLERİ LİSTESİ -->
      <div class="tasks-grid">
        <div *ngFor="let task of filteredTasks" class="glass-card task-card" [ngClass]="getCardClass(task.status)">
          <!-- KART ÜST STRİP -->
          <div class="task-top">
            <div class="d-flex align-items-center gap-2 flex-wrap">
              <span class="flight-pill">✈️ {{ task.flightNumber }}</span>
              <span class="gate-pill">🚪 {{ task.gateNo || 'Stand-101' }}</span>
              <span class="runway-pill">🛫 {{ task.assignedRunwayCode || '35L' }}</span>
            </div>

            <span class="badge" [ngClass]="getStatusBadgeClass(task.status)">
              {{ getStatusText(task.status) }}
            </span>
          </div>

          <!-- GÖREV BAŞLIĞI VE UÇAK -->
          <div class="task-main mt-3 mb-2">
            <div class="d-flex align-items-center gap-3">
              <div class="task-icon-circle">
                {{ getTaskIcon(task.taskType) }}
              </div>
              <div>
                <h3 class="task-title mb-0">{{ getTaskTitle(task.taskType) }}</h3>
                <span class="text-muted aircraft-text">
                  Uçak: <strong>{{ task.aircraftTailNumber }}</strong> ({{ task.aircraftModel }})
                </span>
              </div>
            </div>
          </div>

          <!-- NOTLAR VEYA METRİK -->
          <div class="task-notes-box mb-3" *ngIf="task.notes">
            <span class="notes-label">GÖREV NOTU:</span>
            <p class="notes-text mb-0">{{ task.notes }}</p>
          </div>

          <!-- DETAY METADATA -->
          <div class="meta-row mb-3">
            <div class="meta-cell" *ngIf="task.assignedGSECode">
              <span class="meta-label">ATANAN ARAÇ (GSE)</span>
              <span class="gse-tag">🚜 {{ task.assignedGSECode }}</span>
            </div>
            <div class="meta-cell">
              <span class="meta-label">HEDEF SÜRE</span>
              <span class="time-tag">⏱️ {{ task.targetDurationMinutes }} dk</span>
            </div>
            <div class="meta-cell" *ngIf="task.assignedUserName">
              <span class="meta-label">SORUMLU RAMP PERSONELİ</span>
              <span class="user-tag">👷 {{ task.assignedUserName }}</span>
            </div>
          </div>

          <!-- İLERLEME ÇUBUĞU -->
          <div class="progress-section mb-3">
            <div class="d-flex justify-content-between align-items-center mb-1">
              <span class="prog-label">İlerleme Seviyesi</span>
              <strong class="prog-val">{{ task.progressPercentage }}%</strong>
            </div>
            <div class="prog-track">
              <div class="prog-fill" [style.width.%]="task.progressPercentage"></div>
            </div>
          </div>

          <!-- 3 ADIMLI İŞ EMRİ AKSİYON BUTONLARI -->
          <div class="task-actions-area">
            <!-- 1. ADIM: KABUL ET -->
            <button 
              *ngIf="task.status === 0" 
              class="btn btn-primary w-100 action-flow-btn" 
              (click)="executeStep(task, 'ACCEPT')"
              [disabled]="submittingId === task.id"
            >
              ▶ Görevi Kabul Et (İşi Üzerine Al)
            </button>

            <!-- 2. ADIM: İŞLEME AL / BAŞLAT -->
            <div *ngIf="task.status === 1" class="d-flex gap-2 w-100">
              <button 
                class="btn btn-info flex-grow-1 action-flow-btn" 
                (click)="executeStep(task, 'START')"
                [disabled]="submittingId === task.id"
              >
                ⚙️ İşe Başla / İşleme Al
              </button>
            </div>

            <!-- 3. ADIM: DEVAM EDİYOR VE TAMAMLA -->
            <div *ngIf="task.status === 2" class="d-flex flex-column gap-2 w-100">
              <div class="d-flex gap-1">
                <button class="btn btn-sm btn-outline flex-grow-1" (click)="quickProgress(task, 50)">%50 Yap</button>
                <button class="btn btn-sm btn-outline flex-grow-1" (click)="quickProgress(task, 75)">%75 Yap</button>
              </div>
              <button 
                class="btn btn-success w-100 action-flow-btn" 
                (click)="executeStep(task, 'COMPLETE')"
                [disabled]="submittingId === task.id"
              >
                ✓ Görevi Tamamla (İşi Bitir)
              </button>
            </div>

            <!-- 4. ADIM: BİTTİ -->
            <div *ngIf="task.status === 3" class="completed-banner">
              ✅ Görev Başarıyla Tamamlandı
            </div>
          </div>
        </div>
      </div>

      <div *ngIf="filteredTasks.length === 0" class="glass-card text-center py-5">
        <p class="text-muted mb-0">Bu sekmede gösterilecek iş emri bulunmamaktadır.</p>
      </div>
    </div>
  `,
  styles: [`
    .dashboard {
      display: flex;
      flex-direction: column;
      gap: 1.5rem;
    }

    .header-actions {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .section-title {
      font-size: 1.6rem;
      font-weight: 800;
      color: #fff;
    }

    .ramp-badge {
      font-size: 1.1rem;
      font-weight: 800;
      color: #00d4ff;
      background: rgba(0, 212, 255, 0.15);
      padding: 4px 10px;
      border-radius: 6px;
      border: 1px solid rgba(0, 212, 255, 0.3);
    }

    .header-buttons {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    /* GRID */
    .grid-4 {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.25rem;
    }

    .stat-card {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1.25rem;
      background: rgba(15, 23, 42, 0.7);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
    }

    .stat-icon-wrapper {
      width: 48px;
      height: 48px;
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.5rem;
    }
    .stat-icon-wrapper.blue { background: rgba(0, 212, 255, 0.15); border: 1px solid rgba(0, 212, 255, 0.3); }
    .stat-icon-wrapper.amber { background: rgba(245, 158, 11, 0.15); border: 1px solid rgba(245, 158, 11, 0.3); }
    .stat-icon-wrapper.purple { background: rgba(168, 85, 247, 0.15); border: 1px solid rgba(168, 85, 247, 0.3); }
    .stat-icon-wrapper.green { background: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.3); }

    .stat-num {
      font-size: 1.5rem;
      font-weight: 800;
      color: #fff;
    }

    .stat-label {
      font-size: 0.8rem;
      color: #94a3b8;
    }

    /* FILTER BAR */
    .filter-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 1rem;
      padding: 1rem 1.25rem;
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
    }

    .tabs-group {
      display: flex;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .tab-pill {
      background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1);
      color: #94a3b8;
      padding: 0.5rem 1rem;
      border-radius: 20px;
      font-size: 0.85rem;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }
    .tab-pill:hover { background: rgba(255, 255, 255, 0.1); color: #fff; }
    .tab-pill.active {
      background: rgba(0, 212, 255, 0.2);
      border-color: #00d4ff;
      color: #00d4ff;
      font-weight: 700;
    }

    .search-input {
      padding: 0.5rem 1rem;
      background: rgba(30, 41, 59, 0.6);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 8px;
      color: #fff;
      font-size: 0.85rem;
      outline: none;
      min-width: 250px;
    }
    .search-input:focus { border-color: #00d4ff; }

    /* TASKS GRID */
    .tasks-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
      gap: 1.25rem;
    }

    .task-card {
      padding: 1.25rem;
      background: rgba(15, 23, 42, 0.7);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      transition: all 0.2s ease;
    }
    .task-card:hover {
      transform: translateY(-2px);
      border-color: rgba(0, 212, 255, 0.3);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
    }
    .task-card.pending-card { border-left: 4px solid #a855f7; }
    .task-card.accepted-card { border-left: 4px solid #00d4ff; }
    .task-card.progress-card { border-left: 4px solid #f59e0b; background: rgba(245, 158, 11, 0.03); }
    .task-card.completed-card { border-left: 4px solid #10b981; background: rgba(16, 185, 129, 0.03); }

    .task-top {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      gap: 0.5rem;
    }

    .flight-pill {
      font-weight: 800;
      color: #00d4ff;
      background: rgba(0, 212, 255, 0.1);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.85rem;
    }
    .gate-pill {
      font-weight: 700;
      color: #fff;
      background: rgba(255, 255, 255, 0.08);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.8rem;
    }
    .runway-pill {
      font-weight: 600;
      color: #34d399;
      background: rgba(16, 185, 129, 0.1);
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 0.75rem;
    }

    .task-icon-circle {
      width: 44px;
      height: 44px;
      border-radius: 12px;
      background: rgba(0, 212, 255, 0.1);
      border: 1px solid rgba(0, 212, 255, 0.25);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
      flex-shrink: 0;
    }

    .task-title {
      font-size: 1.05rem;
      font-weight: 700;
      color: #fff;
    }
    .aircraft-text {
      font-size: 0.75rem;
    }

    .task-notes-box {
      padding: 0.6rem 0.8rem;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 6px;
    }
    .notes-label {
      font-size: 0.65rem;
      font-weight: 700;
      color: #94a3b8;
      display: block;
    }
    .notes-text {
      font-size: 0.8rem;
      color: #e2e8f0;
    }

    .meta-row {
      display: flex;
      gap: 0.75rem;
      flex-wrap: wrap;
      background: rgba(0, 0, 0, 0.2);
      padding: 0.6rem;
      border-radius: 6px;
    }
    .meta-cell {
      display: flex;
      flex-direction: column;
    }
    .meta-label {
      font-size: 0.65rem;
      color: #94a3b8;
      font-weight: 700;
    }
    .gse-tag { color: #fbbf24; font-weight: 700; font-size: 0.8rem; }
    .time-tag { color: #38bdf8; font-weight: 700; font-size: 0.8rem; }
    .user-tag { color: #c084fc; font-weight: 600; font-size: 0.8rem; }

    .progress-section {
      background: rgba(0, 0, 0, 0.2);
      padding: 0.6rem;
      border-radius: 6px;
    }
    .prog-label { font-size: 0.75rem; color: #94a3b8; }
    .prog-val { font-size: 0.85rem; color: #00d4ff; }
    .prog-track {
      width: 100%;
      height: 6px;
      background: rgba(255, 255, 255, 0.1);
      border-radius: 999px;
      overflow: hidden;
      margin-top: 4px;
    }
    .prog-fill {
      height: 100%;
      background: linear-gradient(90deg, #00d4ff, #10b981);
      border-radius: 999px;
      transition: width 0.3s ease;
    }

    .action-flow-btn {
      padding: 0.65rem 1rem;
      font-weight: 700;
      font-size: 0.9rem;
      border-radius: 8px;
    }

    .completed-banner {
      padding: 0.6rem;
      background: rgba(16, 185, 129, 0.15);
      border: 1px solid #10b981;
      border-radius: 6px;
      color: #34d399;
      text-align: center;
      font-weight: 700;
      font-size: 0.85rem;
    }

    /* BADGES */
    .badge {
      display: inline-block;
      padding: 3px 8px;
      border-radius: 999px;
      font-size: 0.75rem;
      font-weight: 700;
    }
    .badge.secondary { background: rgba(255, 255, 255, 0.1); color: #94a3b8; }
    .badge.info { background: rgba(56, 189, 248, 0.2); color: #38bdf8; border: 1px solid rgba(56, 189, 248, 0.4); }
    .badge.warning { background: rgba(245, 158, 11, 0.2); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.4); }
    .badge.success { background: rgba(16, 185, 129, 0.2); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.4); }
  `]
})
export class RampTasksComponent implements OnInit, OnDestroy {
  tasks: any[] = [];
  activeTab: 'ACTIVE' | 'POOL' | 'COMPLETED' | 'ALL' = 'ACTIVE';
  searchQuery = '';
  submittingId = '';

  private pollTimer: any = null;
  private subs: Subscription[] = [];

  constructor(
    private api: ApiService,
    private auth: AuthService,
    private notification: NotificationService,
    private signalr: SignalRService
  ) {}

  ngOnInit() {
    this.loadTasks();

    // Canli gelen is emri guncellemelerini dinle
    this.subs.push(
      this.signalr.turnaround$.subscribe((ev) => {
        const t = this.tasks.find(x => x.id === ev.taskId);
        if (t) {
          const statusNum = ev.status === 'Completed' ? 3 : ev.status === 'InProgress' ? 2 : ev.status === 'Accepted' ? 1 : 0;
          t.status = statusNum;
          t.progressPercentage = ev.progressPercentage;
          if (ev.notes) t.notes = ev.notes;
          if (ev.assignedUserName) t.assignedUserName = ev.assignedUserName;
          if (ev.assignedGSECode) t.assignedGSECode = ev.assignedGSECode;
        } else {
          this.loadTasks(true);
        }
      })
    );

    this.pollTimer = setInterval(() => {
      this.loadTasks(true);
    }, 15000);
  }

  ngOnDestroy() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    this.subs.forEach(s => s.unsubscribe());
  }

  loadTasks(silent = false) {
    this.api.getRampTasks().subscribe({
      next: (res) => {
        if (res.success && res.data) {
          this.tasks = res.data;
        }
      },
      error: (err) => console.error('Ramp görevleri yüklenemedi:', err)
    });
  }

  get pendingCount(): number {
    return this.tasks.filter(t => t.status === 0).length;
  }

  get acceptedCount(): number {
    return this.tasks.filter(t => t.status === 1).length;
  }

  get inProgressCount(): number {
    return this.tasks.filter(t => t.status === 2).length;
  }

  get completedCount(): number {
    return this.tasks.filter(t => t.status === 3).length;
  }

  get filteredTasks(): any[] {
    return this.tasks.filter(t => {
      const q = this.searchQuery.toLowerCase();
      const matchesSearch = !this.searchQuery ||
        t.flightNumber?.toLowerCase().includes(q) ||
        t.gateNo?.toLowerCase().includes(q) ||
        t.taskTitle?.toLowerCase().includes(q) ||
        t.notes?.toLowerCase().includes(q) ||
        t.assignedGSECode?.toLowerCase().includes(q);

      let matchesTab = true;
      if (this.activeTab === 'ACTIVE') {
        matchesTab = t.status === 1 || t.status === 2; // Accepted or InProgress
      } else if (this.activeTab === 'POOL') {
        matchesTab = t.status === 0; // Pending
      } else if (this.activeTab === 'COMPLETED') {
        matchesTab = t.status === 3; // Completed
      }

      return matchesSearch && matchesTab;
    });
  }

  getTaskTitle(type: number): string {
    switch (type) {
      case 0: return '🚶‍♀️ Yolcu İndirme (Deboarding)';
      case 1: return '🧳 Bagaj Boşaltma (Baggage Unload)';
      case 2: return '⛽ Jet A-1 Yakıt İkmali (Refueling)';
      case 3: return '🧹 Kabin & Tuvalet Temizliği';
      case 4: return '🥪 İkram & Galley Yükleme (Catering)';
      case 5: return '📦 Giden Bagaj Yükleme (Baggage Load)';
      case 6: return '🚶‍♂️ Yolcu Binişi (Boarding)';
      case 7: return '🚜 Pushback & Motor Çalıştırma';
      default: return 'Ramp Saha Görevi';
    }
  }

  getTaskIcon(type: number): string {
    switch (type) {
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

  getStatusText(status: number): string {
    switch (status) {
      case 0: return 'Havuzda (Bekliyor)';
      case 1: return 'Kabul Edildi';
      case 2: return 'İşlemde (Sürüyor)';
      case 3: return 'Tamamlandı';
      default: return 'Bilinmiyor';
    }
  }

  getStatusBadgeClass(status: number): string {
    switch (status) {
      case 0: return 'secondary';
      case 1: return 'info';
      case 2: return 'warning';
      case 3: return 'success';
      default: return 'secondary';
    }
  }

  getCardClass(status: number): string {
    switch (status) {
      case 0: return 'pending-card';
      case 1: return 'accepted-card';
      case 2: return 'progress-card';
      case 3: return 'completed-card';
      default: return '';
    }
  }

  executeStep(task: any, action: 'ACCEPT' | 'START' | 'COMPLETE') {
    this.submittingId = task.id;
    const currentUserId = this.auth.currentUser?.id;

    this.api.executeRampWorkflow(task.id, {
      action,
      userId: currentUserId
    }).subscribe({
      next: (res) => {
        this.submittingId = '';
        if (res.success) {
          if (action === 'ACCEPT') {
            task.status = 1;
            task.assignedUserName = this.auth.currentUser?.fullName || 'Ramp Görevlisi';
            this.notification.success(`✅ Görev kabul edildi: ${task.flightNumber} - ${this.getTaskTitle(task.taskType)}`);
          } else if (action === 'START') {
            task.status = 2;
            task.progressPercentage = 30;
            this.notification.info(`⚙️ Görev başlatıldı: ${task.flightNumber}`);
          } else if (action === 'COMPLETE') {
            task.status = 3;
            task.progressPercentage = 100;
            this.notification.success(`🎉 Görev tamamlandı! Turnaround ekranı yeşile döndü.`);
          }
        } else {
          this.notification.error(res.message || 'İşlem başarısız.');
        }
      },
      error: () => {
        this.submittingId = '';
        this.notification.error('Sunucu hatası.');
      }
    });
  }

  quickProgress(task: any, pct: number) {
    task.progressPercentage = pct;
    this.api.updateTurnaroundTask(task.id, {
      status: 2,
      progressPercentage: pct
    }).subscribe({
      next: () => this.notification.info(`İlerleme: %${pct}`)
    });
  }
}
