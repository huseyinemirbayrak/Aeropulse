import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ApiService } from '../../../core/api.service';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-ops-dashboard',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div class="dashboard">
      <div class="header-actions">
        <h2 class="section-title">Operations Dashboard</h2>
        <div>
          <button class="btn btn-primary" routerLink="/ops/operations">Manage Operations</button>
          <button class="btn btn-secondary ml-2" routerLink="/ops/jet-bridges">View Jet Bridges</button>
        </div>
      </div>

      <div class="grid grid-3 mt-3">
        <div class="glass-card text-center animate-fade-in" style="padding: 2rem;">
          <h3 style="color: var(--color-info);">Active Operations</h3>
          <h1 style="font-size: 3rem; margin: 1rem 0;">{{ activeOps }}</h1>
          <p class="text-muted">Currently in progress or scheduled</p>
        </div>

        <div class="glass-card text-center animate-fade-in" style="padding: 2rem;">
          <h3 style="color: var(--color-warning);">Delayed Flights</h3>
          <h1 style="font-size: 3rem; margin: 1rem 0;">{{ delayedOps }}</h1>
          <p class="text-muted">Flights exceeding SLA limits</p>
        </div>

        <div class="glass-card text-center animate-fade-in" style="padding: 2rem;">
          <h3 style="color: var(--color-success);">Jet Bridges Available</h3>
          <h1 style="font-size: 3rem; margin: 1rem 0;">{{ availableBridges }}</h1>
          <p class="text-muted">Across all terminals</p>
        </div>
      </div>
      
      <div class="mt-4">
        <div class="glass-card">
          <h3 class="section-title">Recent Activity Overview</h3>
          <p class="text-muted">Navigate to specific modules using the sidebar to see detailed lists.</p>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .header-actions { display: flex; justify-content: space-between; align-items: center; }
    .ml-2 { margin-left: 0.5rem; }
    .text-center { text-align: center; }
  `]
})
export class OpsDashboardComponent implements OnInit {
  activeOps = 0;
  delayedOps = 0;
  availableBridges = 0;

  constructor(private api: ApiService) {}

  ngOnInit() {
    this.api.getOperations(1, 100, undefined, 'InProgress').subscribe(res => {
      if (res.success) this.activeOps = res.data.totalCount;
    });
    this.api.getDelayedOperations().subscribe(res => {
      if (res.success) this.delayedOps = res.data.length;
    });
    this.api.getJetBridges().subscribe(res => {
      if (res.success) {
        this.availableBridges = res.data.filter(b => b.statusCode === 'Available').length;
      }
    });
  }
}
