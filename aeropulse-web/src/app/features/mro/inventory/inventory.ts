import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-inventory',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="p-6">
      <div class="flex justify-between items-center mb-6">
        <h1 class="text-3xl font-bold text-gray-800 dark:text-white">Envanter ve Parça Yönetimi</h1>
        <div class="flex gap-4">
          <input type="text" [(ngModel)]="searchTerm" placeholder="Parça Ara..." 
                 class="border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                 (keyup.enter)="search()">
          <button (click)="search()" class="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors duration-200">
            Ara
          </button>
        </div>
      </div>
      
      <div *ngIf="loading" class="text-center py-10">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p class="mt-4 text-gray-600">Envanter yükleniyor...</p>
      </div>
      
      <div *ngIf="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong class="font-bold">Hata!</strong>
        <span class="block sm:inline"> {{ error }}</span>
      </div>

      <div *ngIf="!loading && !error" class="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
        <div class="overflow-x-auto">
          <table class="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead class="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Parça No</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">İsim</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Kategori</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Stok</th>
                <th scope="col" class="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">Durum</th>
                <th scope="col" class="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">İşlemler</th>
              </tr>
            </thead>
            <tbody class="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              <tr *ngFor="let part of parts" class="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-150">
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{{ part.partNumber }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{{ part.name }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{{ part.category || 'Belirtilmemiş' }}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                  <span class="font-bold" [ngClass]="{'text-red-600': part.stockQuantity <= (part.minimumThreshold || 5)}">
                    {{ part.stockQuantity }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap">
                  <span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full" 
                        [ngClass]="part.stockQuantity > (part.minimumThreshold || 5) ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'">
                    {{ part.stockQuantity > (part.minimumThreshold || 5) ? 'Yeterli' : 'Kritik Seviye' }}
                  </span>
                </td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button class="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300">Düzenle</button>
                </td>
              </tr>
              <tr *ngIf="parts.length === 0">
                <td colspan="6" class="px-6 py-10 text-center text-gray-500">Arama kriterlerine uygun parça bulunamadı.</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <!-- Pagination controls can go here -->
        <div class="bg-gray-50 px-6 py-3 border-t border-gray-200 flex items-center justify-between">
          <div class="text-sm text-gray-500">
            Toplam <span class="font-medium">{{ totalCount }}</span> parça
          </div>
          <div class="flex gap-2">
            <button [disabled]="page === 1" (click)="changePage(page - 1)" class="px-3 py-1 border border-gray-300 rounded text-sm disabled:opacity-50">Önceki</button>
            <button (click)="changePage(page + 1)" class="px-3 py-1 border border-gray-300 rounded text-sm">Sonraki</button>
          </div>
        </div>
      </div>
    </div>
  `
})
export class InventoryComponent implements OnInit {
  parts: any[] = [];
  loading = true;
  error = '';
  searchTerm = '';
  page = 1;
  pageSize = 20;
  totalCount = 0;
  
  private apiUrl = 'http://localhost:5146/api/parts'; 

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchParts();
  }

  fetchParts(): void {
    this.loading = true;
    let url = `${this.apiUrl}?page=${this.page}&pageSize=${this.pageSize}`;
    if (this.searchTerm) {
      url += `&search=${this.searchTerm}`;
    }

    this.http.get<any>(url).subscribe({
      next: (response) => {
        this.parts = response.data?.items || response.items || response || [];
        this.totalCount = response.data?.totalCount || this.parts.length;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching inventory', err);
        this.error = 'Envanter yüklenirken bir sorun oluştu.';
        this.loading = false;
      }
    });
  }

  search(): void {
    this.page = 1;
    this.fetchParts();
  }
  
  changePage(newPage: number): void {
    if (newPage > 0) {
      this.page = newPage;
      this.fetchParts();
    }
  }
}
