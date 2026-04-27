import { Component, inject, OnInit, OnDestroy } from '@angular/core';
import { AuthService } from '../../services/auth';
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-navbar',
  imports: [CommonModule, RouterModule],
  templateUrl: './navbar.html',
  styleUrls: ['./navbar.css'],
})
export class Navbar implements OnInit, OnDestroy {
  private authService = inject(AuthService);
  private router = inject(Router);

  currentUser = this.authService.currentUser$;

  ngOnInit(): void {}

  ngOnDestroy(): void {}

  logout() {
    this.authService.logout().then(() => {
      this.router.navigate(['/login']);
    });
  }
}
