import { Injectable } from '@angular/core';
import { initializeApp, getApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  private app: any;
  private auth: any;

  constructor() {
    this.app = initializeApp(environment.firebase);
    this.auth = getAuth(this.app);
  }

  // Google Authentication
  async googleSignIn() {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(this.auth, provider);
  }

  // Email/Password Registration
  async register(email: string, password: string) {
    return createUserWithEmailAndPassword(this.auth, email, password);
  }

  // Email/Password Login
  async login(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  // Logout
  async logout() {
    return signOut(this.auth);
  }

  // Auth State Observer
  onAuthStateChange(callback: (user: User | null) => void) {
    return onAuthStateChanged(this.auth, callback);
  }

  // Current User
  getCurrentUser() {
    return this.auth.currentUser;
  }
}
