import { Injectable } from '@angular/core';
import { initializeApp } from 'firebase/app';
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
import {
  getFirestore,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
} from 'firebase/firestore';
import { environment } from '../../environments/environment';
import { Group } from '../models/group';

@Injectable({
  providedIn: 'root',
})
export class FirebaseService {
  private app: any;
  private auth: any;
  private db: any;

  constructor() {
    this.app = initializeApp(environment.firebase);
    this.auth = getAuth(this.app);
    this.db = getFirestore(this.app);
  }

  // ---- Authentication ----

  async googleSignIn() {
    const provider = new GoogleAuthProvider();
    return signInWithPopup(this.auth, provider);
  }

  async register(email: string, password: string) {
    return createUserWithEmailAndPassword(this.auth, email, password);
  }

  async login(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  async logout() {
    return signOut(this.auth);
  }

  onAuthStateChange(callback: (user: User | null) => void) {
    return onAuthStateChanged(this.auth, callback);
  }

  getCurrentUser() {
    return this.auth.currentUser;
  }

  // ---- Firestore Groups ----

  async getGroup(groupId: string): Promise<Group | null> {
    const ref = doc(this.db, 'groups', groupId);
    const snap = await getDoc(ref);
    return snap.exists() ? { id: snap.id, ...snap.data() } as Group : null;
  }

  async getUserGroups(userId: string): Promise<Group[]> {
    const ref = collection(this.db, 'groups');
    const q = query(ref, where('memberIds', 'array-contains', userId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Group));
  }

  async createGroup(data: any) {
    const ref = collection(this.db, 'groups');
    return addDoc(ref, data);
  }

  // ---- Firestore Sessions ----

  async getSessions(groupId: string) {
    const ref = collection(this.db, 'groups', groupId, 'sessions');
    const q = query(ref, orderBy('date', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  async addSession(groupId: string, data: any) {
    const ref = collection(this.db, 'groups', groupId, 'sessions');
    return addDoc(ref, data);
  }

  // ---- Firestore Messages ----

  listenToMessages(groupId: string, callback: (messages: any[]) => void) {
    const ref = collection(this.db, 'groups', groupId, 'messages');
    const q = query(ref, orderBy('date', 'asc'));
    return onSnapshot(q, (snap) => {
      const messages = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      callback(messages);
    });
  }

  async sendMessage(groupId: string, data: any) {
    const ref = collection(this.db, 'groups', groupId, 'messages');
    return addDoc(ref, { ...data, date: Timestamp.now() });
  }
}
