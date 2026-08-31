import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../core/api.service';

@Component({
  selector: 'app-jet-bridges',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dashboard">
      <div class="header-actions">
        <h2 class="section-title">Jet Bridges Map</h2>
        <button class="btn btn-primary" (click)="loadBridges()">Refresh</button>
      </div>

      <div class="grid grid-4 mt-3">
        <div *ngFor="let b of bridges" class="glass-card animate-fade-in" 
             [ngClass]="{'border-success': b.statusCode === 'Available', 
                        'border-warning': b.statusCode === 'Reserved', 
                        'border-info': b.statusCode === 'Connected', 
                        'border-danger': b.statusCode === 'UnderMaintenance'}">
          <div class="header-actions mb-2">
            <h3>{{ b.bridgeNo }}</h3>
            <span class="badge" 
                  [class.badge-success]="b.statusCode === 'Available'"
                  [class.badge-warning]="b.statusCode === 'Reserved'"
                  [class.badge-info]="b.statusCode === 'Connected'"
                  [class.badge-danger]="b.statusCode === 'UnderMaintenance'">
              {{ b.statusCode }}
            </span>
          </div>
          
          <div class="mt-2" *ngIf="b.currentAssignment">
            <p class="text-sm"><strong>Flight:</strong> {{ b.currentAssignment.flightNumber }}</p>
            <p class="text-sm"><strong>Aircraft:</strong> {{ b.currentAssignment.aircraftTailNumber }}</p>
            <p class="text-sm text-muted">ETA: {{ b.currentAssignment.estimatedArrivalTime | date:'shortTime' }}</p>
          </div>
          
          <div class="mt-2" *ngIf="!b.currentAssignment">
            <p class="text-sm text-muted">No active assignment.</p>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .header-actions { display: flex; justify-content: space-between; align-items: center; }
    .border-success { border-left: 4px solid var(--color-success); }
    .border-warning { border-left: 4px solid var(--color-warning); }
    .border-info { border-left: 4px solid var(--color-info); }
    .border-danger { border-left: 4px solid var(--color-danger); }
  `]
})
export class JetBridgesComponent implements OnInit {
  bridges: any[] = [];

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.loadBridges();
  }

  loadBridges() {
    this.api.getJetBridges().subscribe(res => {
      if (res.success) this.bridges = res.data;
    });
  }
}
