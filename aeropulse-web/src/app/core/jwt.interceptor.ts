import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';

// API isteklerine auth token ve firma bilgisini ekleyen interceptor
export const jwtInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const token = authService.getToken();
  // Hafızadaki seçili firma kodunu alıyoruz
  const tenantId = localStorage.getItem('aeropulse_tenant_id') || 'ALL';

  const headers: Record<string, string> = {
    'X-Tenant-ID': tenantId
  };

  // Kullanıcı giriş yapmışsa Bearer token ekle
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  req = req.clone({
    setHeaders: headers
  });

  return next(req).pipe(
    catchError(error => {
      if (error.status === 401) {
        authService.logout();
      } else if (error.status === 403) {
        router.navigate(['/forbidden']);
      }
      return throwError(() => error);
    })
  );
};
