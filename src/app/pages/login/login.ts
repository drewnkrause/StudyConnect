import { Component, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, CommonModule, RouterModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css'],
})
export class Login {
  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  error = signal('');

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  async onSubmit() {
    if (this.loginForm.valid) {
      try {
        const { email, password } = this.loginForm.value;
        await this.authService.login(email!, password!);
        this.router.navigate(['/dashboard']);
      } catch (err: any) {
        this.error.set(err.message || 'Login failed');
      }
    }
  }

  async googleSignIn() {
    try {
      await this.authService.googleSignIn();
      this.router.navigate(['/dashboard']);
    } catch (err: any) {
      this.error.set(err.message || 'Google sign-in failed');
    }
  }
}
