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

  public turnaround$ = new Subject<TurnaroundTaskUpdatedEvent>();
  public gateOverride$ = new Subject<FlightGateOverrideEvent>();
  public gse$ = new Subject<GSEStatusChangedEvent>();
  public boarding$ = new Subject<BoardingProgressEvent>();
  public flightAlert$ = new Subject<FlightAlertEvent>();
  public weatherAlert$ = new Subject<any>();

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

    this.hubConnection.onreconnecting((error?: any) => {
      console.warn('[SignalR] Reconnecting telemetry stream...', error);
      this.isConnected$.next(false);
      this.connectionStatus$.next('reconnecting');
    });

    this.hubConnection.onreconnected((connectionId?: string) => {
      console.log('[SignalR] Telemetry stream reconnected:', connectionId);
      this.isConnected$.next(true);
      this.connectionStatus$.next('connected');
      this.showToast('Telemetry Stream Active', 'Airside operational feed synchronized.', 'success');
    });

    this.hubConnection.onclose((error?: any) => {
      console.warn('[SignalR] Telemetry connection terminated:', error);
      this.isConnected$.next(false);
      this.connectionStatus$.next('disconnected');
    });

    this.hubConnection.on('ReceiveConnectionAck', (ack: any) => {
      console.log('[SignalR] Connection acknowledged:', ack);
      this.isConnected$.next(true);
      this.connectionStatus$.next('connected');
    });

    this.hubConnection.on('ReceiveTurnaroundUpdate', (task: TurnaroundTaskUpdatedEvent) => {
      this.turnaround$.next(task);
      this.showToast(
        `Task: ${task.flightNumber}`,
        `${task.taskType} milestone transitioned to ${task.status} (${task.progressPercentage}%).`,
        task.status === 'Completed' ? 'success' : 'info'
      );
    });

    this.hubConnection.on('ReceiveFlightTurnaroundUpdate', (task: TurnaroundTaskUpdatedEvent) => {
      this.turnaround$.next(task);
    });

    this.hubConnection.on('ReceiveGateOverride', (gate: FlightGateOverrideEvent) => {
      this.gateOverride$.next(gate);
      this.showToast(
        `Gate Reassignment: ${gate.flightNumber}`,
        `Previous: ${gate.oldGateNumber || 'Open Stand'} ➔ New Assigned Gate: ${gate.newGateNumber}`,
        'warning'
      );
    });

    this.hubConnection.on('ReceiveGseUpdate', (gse: GSEStatusChangedEvent) => {
      this.gse$.next(gse);
      if (gse.status === 'OutOfService') {
        this.showToast(
          `GSE Equipment Defect: ${gse.code}`,
          `${gse.name} transitioned to out-of-service / maintenance.`,
          'danger'
        );
      }
    });

    this.hubConnection.on('ReceiveBoardingUpdate', (b: BoardingProgressEvent) => {
      this.boarding$.next(b);
      if (b.loadsheetApproved) {
        this.showToast(
          `Loadsheet Authorization: ${b.flightNumber}`,
          `Departure clearance confirmed by ${b.approvedByRedcap || 'Operations Lead'}.`,
          'success'
        );
      }
    });

    this.hubConnection.on('ReceiveFlightBoardingUpdate', (b: BoardingProgressEvent) => {
      this.boarding$.next(b);
    });

    this.hubConnection.on('ReceiveFlightAlert', (alert: FlightAlertEvent) => {
      this.flightAlert$.next(alert);
      const toastType: 'info' | 'warning' | 'danger' =
        alert.severity === 'Danger' ? 'danger' :
        alert.severity === 'Warning' ? 'warning' : 'info';

      this.showToast(`Airside Alert: ${alert.flightNumber}`, alert.message, toastType);
    });

    this.hubConnection.on('ReceiveWeatherAlert', (weatherAlert: any) => {
      this.weatherAlert$.next(weatherAlert);
      this.showToast(
        weatherAlert.isCrisisActive ? 'Meteorological Crisis Active' : 'Weather Nominal',
        weatherAlert.message || 'Aerodrome weather alert updated.',
        weatherAlert.isCrisisActive ? 'danger' : 'success'
      );
    });
  }

  public async startConnection(): Promise<void> {
    if (!this.hubConnection) return;
    this.connectionStatus$.next('connecting');

    try {
      await this.hubConnection.start();
      console.log('[SignalR] Telemetry stream established.');
      this.isConnected$.next(true);
      this.connectionStatus$.next('connected');
    } catch (err) {
      console.warn('[SignalR] Connection fault, retrying in 5s...', err);
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
        console.error(`Error subscribing to flight telemetry group ${flightNumber}:`, err);
      }
    }
  }

  public async leaveFlight(flightNumber: string): Promise<void> {
    if (this.hubConnection && this.hubConnection.state === signalR.HubConnectionState.Connected) {
      try {
        await this.hubConnection.invoke('LeaveFlightGroup', flightNumber);
      } catch (err) {
        console.error(`Error unsubscribing from flight telemetry group ${flightNumber}:`, err);
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
