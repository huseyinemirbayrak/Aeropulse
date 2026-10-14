import { Injectable } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  constructor(private snackBar: MatSnackBar) {}

  success(message: string, duration = 3000) {
    this.snackBar.open(message, 'Dismiss', {
      duration,
      panelClass: ['snackbar-success'],
      horizontalPosition: 'end',
      verticalPosition: 'bottom'
    });
  }

  error(message: string, duration = 5000) {
    this.snackBar.open(message, 'Dismiss', {
      duration,
      panelClass: ['snackbar-error'],
      horizontalPosition: 'end',
      verticalPosition: 'bottom'
    });
  }

  warning(message: string, duration = 4000) {
    this.snackBar.open(message, 'Dismiss', {
      duration,
      panelClass: ['snackbar-warning'],
      horizontalPosition: 'end',
      verticalPosition: 'bottom'
    });
  }

  info(message: string, duration = 3000) {
    this.snackBar.open(message, 'Dismiss', {
      duration,
      panelClass: ['snackbar-info'],
      horizontalPosition: 'end',
      verticalPosition: 'bottom'
    });
  }
}
