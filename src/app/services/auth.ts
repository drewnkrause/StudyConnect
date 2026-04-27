import { Injectable, signal, computed } from '@angular/core';
import { FirebaseService } from './firebase';
import { User } from 'firebase/auth';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private currentUserSignal = signal<User | null>(null);
  public currentUser$ = this.currentUserSignal.asReadonly();

  constructor(private firebaseService: FirebaseService) {
    this.firebaseService.onAuthStateChange((user) => {
      this.currentUserSignal.set(user);
    });
  }

  // Check if user is authenticated
  isAuthenticated = computed(() => !!this.currentUserSignal());

  // Google Sign In
  googleSignIn() {
    return this.firebaseService.googleSignIn();
  }

  // Email/Password Register
  register(email: string, password: string) {
    return this.firebaseService.register(email, password);
  }

  // Email/Password Login
  login(email: string, password: string) {
    return this.firebaseService.login(email, password);
  }

  // Logout
  logout() {
    return this.firebaseService.logout();
  }
}
