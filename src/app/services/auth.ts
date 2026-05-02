import { Injectable, signal, computed } from '@angular/core';
import { FirebaseService } from './firebase';
import { User } from 'firebase/auth';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private currentUserSignal = signal<User | null>(null);
  public currentUser$ = this.currentUserSignal.asReadonly();
  
  private authInitializedSignal = signal<boolean>(false);
  public authInitialized$ = this.authInitializedSignal.asReadonly();

  constructor(private firebaseService: FirebaseService) {
    this.firebaseService.onAuthStateChange(async (user) => {
      this.currentUserSignal.set(user);
      this.authInitializedSignal.set(true);

      if (user) {
        try {
          await this.firebaseService.createOrUpdateUserProfile(user);
          if (user.email) {
            await this.firebaseService.acceptInvitesForEmail(user.email, user.uid);
          }
        } catch (error) {
          console.error('Failed to sync user profile or accept invites:', error);
        }
      }
    });
  }

  waitForAuthState(): Promise<User | null> {
    return new Promise((resolve) => {
      const unsubscribe = this.firebaseService.onAuthStateChange((user) => {
        resolve(user);
        unsubscribe();
      });
    });
  }

  onAuthStateChange(callback: (user: User | null) => void) {
    return this.firebaseService.onAuthStateChange(callback);
  }

  getCurrentUser() {
    return this.currentUserSignal();
  }

  // Check if user is authenticated
  isAuthenticated = computed(() => !!this.currentUserSignal());

  // Check if auth state has been initialized
  isAuthInitialized = computed(() => this.authInitializedSignal());

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
