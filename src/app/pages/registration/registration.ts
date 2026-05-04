import { Component, inject, signal } from '@angular/core';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/auth';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-registration',
  imports: [ReactiveFormsModule, CommonModule, RouterModule],
  templateUrl: './registration.html',
  styleUrl: './registration.css',
})
export class Registration {
  private authService = inject(AuthService);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  error = signal('');

  registerForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    confirmPassword: ['', Validators.required],
    name: ['', Validators.required],
    studentId: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
    major: ['', Validators.required],
    university: ['', Validators.required],
  });

  async onSubmit() {
    if (this.registerForm.valid) {
      const { password, confirmPassword } = this.registerForm.value;
      if (password !== confirmPassword) {
        this.error.set('Passwords do not match');
        return;
      }

      try {
        const { email, name, studentId, major, university } = this.registerForm.value;
        await this.authService.register(email!, password!, {
          name: name!,
          studentId: parseInt(studentId!),
          major: major!,
          university: university!,
        });
        this.router.navigate(['/dashboard']);
      } catch (err: any) {
        this.error.set(err.message || 'Registration failed');
      }
    }
  }

  async googleSignIn() {
    try {
      await this.authService.googleSignIn();
      const currentUser = this.authService.currentUser$();
      if (currentUser) {
        const userData = await this.authService.getUserData(currentUser.uid);
        if (userData && (userData.studentId === 0 || !userData.major || !userData.university)) {
          // Redirect to account page to complete profile
          this.router.navigate(['/account']);
        } else {
          this.router.navigate(['/dashboard']);
        }
      } else {
        this.router.navigate(['/dashboard']);
      }
    } catch (err: any) {
      this.error.set(err.message || 'Google sign-in failed');
    }
  }
}
