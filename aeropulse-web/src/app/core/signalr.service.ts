import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { BehaviorSubject, Subject } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  TurnaroundTaskUpdatedEvent,
  FlightGateOverrideEvent,
  GSEStatusChangedEvent,
  BoardingProgressEvent,
  FlightAlertEvent
} from './models';

export interface LiveToastNotification {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'warning' | 'success' | 'danger';
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class SignalRService {
  private hubConnection: signalR.HubConnection | null = null;

  public isConnected$ = new BehaviorSubject<boolean>(false);
  public connectionStatus$ = new BehaviorSubject<'connected' | 'connecting' | 'reconnecting' | 'disconnected'>('disconnected');

  // Event Streams
  public turnaround$ = new Subject<TurnaroundTaskUpdatedEvent>();
  public gateOverride$ = new Subject<FlightGateOverrideEvent>();
  public gse$ = new Subject<GSEStatusChangedEvent>();
  public boarding$ = new Subject<BoardingProgressEvent>();
  public flightAlert$ = new Subject<FlightAlertEvent>();

  // Global Active Toast Stream for notifications banner
  public toast$ = new Subject<LiveToastNotification>();

  constructor() {
    this.initConnection();
  }

  public initConnection(): void {
    const hubUrl = environment.apiUrl.replace(/\/api\/?$/, '') + '/hubs/aeropulse';

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        skipNegotiation: false,
        transport: signalR.HttpTransportType.WebSockets | signalR.HttpTransportType.LongPolling
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Information)
      .build();

    this.registerHandlers();
    this.startConnection();
  }

  private registerHandlers(): void {
    if (!this.hubConnection) return;

    this.hubConnection.onreconnecting((error) => {
      console.warn('⚠️ [SignalR] Yeniden bağlanılıyor...', error);
      this.isConnected$.next(false);
      this.connectionStatus$.next('reconnecting');
    });

    this.hubConnection.onreconnected((connectionId) => {
      console.log('✅ [SignalR] Yeniden bağlandı:', connectionId);
      this.isConnected$.next(true);
      this.connectionStatus$.next('connected');
      this.showToast('Canlı Bağlantı Kuruldu', 'Operasyon akışı senkronize edildi.', 'success');
    });

    this.hubConnection.onclose((error) => {
      console.warn('❌ [SignalR] Bağlantı kapandı:', error);
      this.isConnected$.next(false);
      this.connectionStatus$.next('disconnected');
    });

    // Event Dinleyicileri
    this.hubConnection.on('ReceiveConnectionAck', (ack) => {
      console.log('[SignalR] Bağlantı sağlandı:', ack);
      this.isConnected$.next(true);
      this.connectionStatus$.next('connected');
    });

    this.hubConnection.on('ReceiveTurnaroundUpdate', (task: TurnaroundTaskUpdatedEvent) => {
      console.log('[SignalR] Görev güncellendi:', task.flightNumber, task.taskType);
      this.turnaround$.next(task);
      this.showToast(
        `Görev: ${task.flightNumber}`,
        `${task.taskType} görevi ${task.status} durumuna geçti (%${task.progressPercentage}).`,
        task.status === 'Completed' ? 'success' : 'info'
      );
    });

    this.hubConnection.on('ReceiveFlightTurnaroundUpdate', (task: TurnaroundTaskUpdatedEvent) => {
      this.turnaround$.next(task);
    });

    this.hubConnection.on('ReceiveGateOverride', (gate: FlightGateOverrideEvent) => {
      console.log('[SignalR] Kapı değişikliği:', gate.flightNumber, gate.newGateNumber);
      this.gateOverride$.next(gate);
      this.showToast(
        `Kapı Değişikliği: ${gate.flightNumber}`,
        `Eski: ${gate.oldGateNumber || 'Açık'} ➔ Yeni Kapı: ${gate.newGateNumber}`,
        'warning'
      );
    });

    this.hubConnection.on('ReceiveGseUpdate', (gse: GSEStatusChangedEvent) => {
      console.log('[SignalR] GSE filosu güncellendi:', gse.code);
      this.gse$.next(gse);
      if (gse.status === 'OutOfService') {
        this.showToast(
          `Araç Arıza Bildirimi: ${gse.code}`,
          `${gse.name} bakım/arıza durumuna alındı!`,
          'danger'
        );
      }
    });

    this.hubConnection.on('ReceiveBoardingUpdate', (b: BoardingProgressEvent) => {
      console.log('[SignalR] Biniş/Bagaj güncellemesi:', b.flightNumber);
      this.boarding$.next(b);
      if (b.loadsheetApproved) {
        this.showToast(
          `Loadsheet Onayı: ${b.flightNumber}`,
          `Kalkış izni verildi (${b.approvedByRedcap || 'Redcap'})`,
          'success'
        );
      }
    });

    this.hubConnection.on('ReceiveFlightBoardingUpdate', (b: BoardingProgressEvent) => {
      this.boarding$.next(b);
    });

    this.hubConnection.on('ReceiveFlightAlert', (alert: FlightAlertEvent) => {
      console.log('[SignalR] Operasyon uyarısı:', alert);
      this.flightAlert$.next(alert);
      const toastType: 'info' | 'warning' | 'danger' =
        alert.severity === 'Danger' ? 'danger' :
        alert.severity === 'Warning' ? 'warning' : 'info';

      this.showToast(`Uyarı: ${alert.flightNumber}`, alert.message, toastType);
    });
  }

  public async startConnection(): Promise<void> {
    if (!this.hubConnection) return;
    this.connectionStatus$.next('connecting');

    try {
      await this.hubConnection.start();
      console.log('[SignalR] Canlı bağlantı açıldı.');
      this.isConnected$.next(true);
      this.connectionStatus$.next('connected');
    } catch (err) {
      console.warn('[SignalR] Bağlantı hatası, tekrar denenecek...', err);
      this.isConnected$.next(false);
      this.connectionStatus$.next('disconnected');
      setTimeout(() => this.startConnection(), 5000);
    }
  }

  public async joinFlight(flightNumber: string): Promise<void> {
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      try {
        await this.hubConnection.invoke('JoinFlightGroup', flightNumber);
      } catch (err) {
        console.error(`Uçuş ${flightNumber} grubuna katılırken hata:`, err);
      }
    }
  }

  public async leaveFlight(flightNumber: string): Promise<void> {
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      try {
        await this.hubConnection.invoke('LeaveFlightGroup', flightNumber);
      } catch (err) {
        console.error(`Uçuş ${flightNumber} grubundan ayrılırken hata:`, err);
      }
    }
  }

  public showToast(title: string, message: string, type: 'info' | 'warning' | 'success' | 'danger'): void {
    const toast: LiveToastNotification = {
      id: Math.random().toString(36).substring(2, 9),
      title,
      message,
      type,
      timestamp: new Date()
    };
    this.toast$.next(toast);
  }
}
