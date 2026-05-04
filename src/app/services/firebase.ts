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
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  Timestamp,
  limitToLast,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { environment } from '../../environments/environment';
import { Group } from '../models/group';
import { UserAccount } from '../models/user';

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
    const result = await signInWithPopup(this.auth, provider);
    await this.createOrUpdateUserDocument(result.user);
    return result;
  }

  async register(email: string, password: string, userData?: Partial<UserAccount>) {
    const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
    await this.createOrUpdateUserDocument(userCredential.user, userData);
    return userCredential;
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

  async createOrUpdateUserDocument(user: User, additionalData?: Partial<UserAccount>) {
    if (!user?.uid) {
      return;
    }

    const userRef = doc(this.db, 'users', user.uid);
    const existingUser = await getDoc(userRef);
    const userData = {
      uid: user.uid,
      email: user.email,
      name: user.displayName || user.email || 'Anonymous',
      studentId: 0,
      major: '',
      university: 'NDSU',
      enrolledCourseIds: [],
      groupIds: [],
      createdAt: Timestamp.now(),
      ...additionalData, // Merge additional data
    };

    if (existingUser.exists()) {
      await setDoc(
        userRef,
        {
          email: user.email,
          name: user.displayName || user.email || 'Anonymous',
          ...additionalData, // Merge additional data
        },
        { merge: true },
      );
    } else {
      await setDoc(userRef, userData);
    }
  }

  // ---- Firestore Groups ----

  async getGroup(groupId: string): Promise<Group | null> {
    const ref = doc(this.db, 'groups', groupId);
    const snap = await getDoc(ref);
    return snap.exists() ? ({ id: snap.id, ...snap.data() } as Group) : null;
  }

  async getUserGroups(userId: string): Promise<Group[]> {
    const ref = collection(this.db, 'groups');
    const q = query(ref, where('members', 'array-contains', userId));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Group);
  }

  async getUser(userId: string): Promise<UserAccount | null> {
    const ref = doc(this.db, 'users', userId);
    const snap = await getDoc(ref);
    return snap.exists() ? ({ uid: snap.id, ...snap.data() } as UserAccount) : null;
  }

  async updateUser(userId: string, data: Partial<UserAccount>): Promise<void> {
    const ref = doc(this.db, 'users', userId);
    await updateDoc(ref, data);
  }

  async createGroup(data: any) {
    const ref = collection(this.db, 'groups');
    return addDoc(ref, data);
  }

  async joinGroup(groupId: string, userId: string): Promise<void> {
    const ref = doc(this.db, 'groups', groupId);
    await updateDoc(ref, { members: arrayUnion(userId) });
  }

  async leaveGroup(groupId: string, userId: string): Promise<void> {
    const ref = doc(this.db, 'groups', groupId);
    await updateDoc(ref, { members: arrayRemove(userId) });
  }

  async updateGroup(groupId: string, data: any): Promise<void> {
    const ref = doc(this.db, 'groups', groupId);
    await updateDoc(ref, data);
  }

  async getUserByEmail(email: string): Promise<UserAccount | null> {
    const ref = collection(this.db, 'users');
    const q = query(ref, where('email', '==', email));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const docSnap = snap.docs[0];
    return { uid: docSnap.id, ...docSnap.data() } as UserAccount;
  }

  async browseGroups(department?: string): Promise<Group[]> {
    const ref = collection(this.db, 'groups');
    let q;
    if (department) {
      q = query(ref, where('isPrivate', '==', false), where('department', '==', department));
    } else {
      q = query(ref, where('isPrivate', '==', false));
    }
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as Group);
  }

  // ---- Firestore Sessions ----

  async getSessions(groupId: string) {
    const ref = collection(this.db, 'groups', groupId, 'sessions');
    const q = query(ref, orderBy('startTime', 'asc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  async getUpcomingSessions(groupIds: string[]): Promise<any[]> {
    const now = Timestamp.now();
    const sessions: any[] = [];

    for (const groupId of groupIds) {
      const ref = collection(this.db, 'groups', groupId, 'sessions');
      const q = query(ref, where('startTime', '>=', now), orderBy('startTime', 'asc'));
      const snap = await getDocs(q);
      snap.docs.forEach((d) => {
        sessions.push({ id: d.id, groupId, ...d.data() });
      });
    }

    // Sort all sessions between groups by startTime
    return sessions.sort((a, b) => a.startTime.seconds - b.startTime.seconds);
  }

  async addSession(groupId: string, data: any) {
    const ref = collection(this.db, 'groups', groupId, 'sessions');
    return addDoc(ref, data);
  }

  async deleteSession(groupId: string, sessionId: string): Promise<void> {
    const ref = doc(this.db, 'groups', groupId, 'sessions', sessionId);
    await deleteDoc(ref);
  }

  async addResource(groupId: string, data: any) {
    const ref = collection(this.db, 'groups', groupId, 'resources');
    return addDoc(ref, { ...data, uploadedAt: Timestamp.now() });
  }

  async getResources(groupId: string) {
    const ref = collection(this.db, 'groups', groupId, 'resources');
    const snap = await getDocs(ref);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }

  async deleteResource(groupId: string, resourceId: string): Promise<void> {
    const ref = doc(this.db, 'groups', groupId, 'resources', resourceId);
    await deleteDoc(ref);
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

  async getMessageHistory(groupId: string, limit: number = 50): Promise<any[]> {
    const ref = collection(this.db, 'groups', groupId, 'messages');
    const q = query(ref, orderBy('date', 'asc'), limitToLast(limit));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
}
