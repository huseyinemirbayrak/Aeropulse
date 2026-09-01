import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-my-tasks',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6">
      <h1 class="text-3xl font-bold mb-6 text-gray-800 dark:text-white">Görevlerim (My Tasks)</h1>
      
      <div *ngIf="loading" class="text-center py-10">
        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto"></div>
        <p class="mt-4 text-gray-600">Görevler yükleniyor...</p>
      </div>
      
      <div *ngIf="error" class="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
        <strong class="font-bold">Hata!</strong>
        <span class="block sm:inline"> {{ error }}</span>
      </div>

      <div *ngIf="!loading && !error && tasks.length === 0" class="bg-gray-50 border border-gray-200 rounded-lg p-8 text-center">
        <p class="text-gray-500 text-lg">Şu an size atanmış aktif bir görev bulunmuyor.</p>
      </div>

      <div *ngIf="!loading && !error && tasks.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div *ngFor="let task of tasks" class="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300 border border-gray-100 dark:border-gray-700">
          <div class="p-6">
            <div class="flex justify-between items-start mb-4">
              <span class="px-3 py-1 text-xs font-semibold rounded-full" 
                    [ngClass]="{
                      'bg-yellow-100 text-yellow-800': task.status === 'Open' || task.status === 0,
                      'bg-blue-100 text-blue-800': task.status === 'InProgress' || task.status === 1,
                      'bg-green-100 text-green-800': task.status === 'Resolved' || task.status === 2
                    }">
                {{ task.status === 'Open' || task.status === 0 ? 'Açık' : (task.status === 'InProgress' || task.status === 1 ? 'Devam Ediyor' : 'Çözüldü') }}
              </span>
              <span class="text-sm text-gray-500">{{ task.createdAt | date:'short' }}</span>
            </div>
            
            <h3 class="text-xl font-bold text-gray-900 dark:text-white mb-2">{{ task.title || task.description?.substring(0, 30) || 'Bakım Görevi' }}</h3>
            <p class="text-gray-600 dark:text-gray-300 mb-4 line-clamp-3">{{ task.description }}</p>
            
            <div class="pt-4 border-t border-gray-100 dark:border-gray-700">
              <button class="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200">
                Detayları Gör
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class MyTasksComponent implements OnInit {
  tasks: any[] = [];
  loading = true;
  error = '';
  
  // Note: Backend might be on a different port during dev, e.g., http://localhost:5146/api/fault-reports/my-faults
  // Using relative path assuming a proxy or exact same host is used.
  private apiUrl = 'http://localhost:5146/api/fault-reports/my-faults'; 

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.fetchTasks();
  }

  fetchTasks(): void {
    this.loading = true;
    this.http.get<any>(this.apiUrl).subscribe({
      next: (response) => {
        this.tasks = response.data || response || [];
        this.loading = false;
      },
      error: (err) => {
        console.error('Error fetching tasks', err);
        this.error = 'Görevler yüklenirken bir sorun oluştu.';
        this.loading = false;
      }
    });
  }
}
