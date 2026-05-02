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
  limit,
  arrayUnion,
  arrayRemove,
} from 'firebase/firestore';
import { BehaviorSubject, Observable, Subscription } from 'rxjs';
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
  private userGroupSubjects = new Map<string, BehaviorSubject<Group[]>>();
  private publicGroupSubjects = new Map<string, BehaviorSubject<Group[]>>();
  private userGroupSubscriptions = new Map<string, Subscription>();
  private publicGroupSubscriptions = new Map<string, Subscription>();

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

  async createOrUpdateUserProfile(user: User): Promise<void> {
    const ref = doc(this.db, 'users', user.uid);
    const snapshot = await getDoc(ref);
    const profileData = {
      uid: user.uid,
      email: user.email || '',
      name: user.displayName || user.email || 'Anonymous',
    } as Partial<UserAccount>;

    if (snapshot.exists()) {
      await setDoc(ref, profileData, { merge: true });
      return;
    }

    const newProfile: UserAccount = {
      uid: user.uid,
      email: user.email || '',
      name: user.displayName || user.email || 'Anonymous',
      studentId: 0,
      major: '',
      university: '',
      enrolledCourseIds: [],
      groupIds: [],
      createdAt: Timestamp.now(),
    };

    await setDoc(ref, newProfile);
  }

  async getUserProfile(uid: string): Promise<UserAccount | null> {
    const ref = doc(this.db, 'users', uid);
    const snap = await getDoc(ref);
    return snap.exists() ? ({ uid: snap.id, ...snap.data() } as UserAccount) : null;
  }

  async getUsersByIds(uids: string[]): Promise<UserAccount[]> {
    if (uids.length === 0) {
      return [];
    }

    const results = await Promise.allSettled(uids.map((uid) => this.getUserProfile(uid)));
    return results
      .filter((result): result is PromiseFulfilledResult<UserAccount | null> => result.status === 'fulfilled')
      .map((result) => result.value)
      .filter((profile): profile is UserAccount => profile !== null);
  }

  watchUserGroups(userId: string): Observable<Group[]> {
    if (!this.userGroupSubjects.has(userId)) {
      this.userGroupSubjects.set(userId, new BehaviorSubject<Group[]>([]));
      this.startUserGroupListening(userId);
    }
    return this.userGroupSubjects.get(userId)!.asObservable();
  }

  watchPublicGroupsNotMember(userId: string): Observable<Group[]> {
    if (!this.publicGroupSubjects.has(userId)) {
      this.publicGroupSubjects.set(userId, new BehaviorSubject<Group[]>([]));
      this.startPublicGroupListening(userId);
    }
    return this.publicGroupSubjects.get(userId)!.asObservable();
  }

  stopWatchingUserGroups(userId: string): void {
    this.userGroupSubscriptions.get(userId)?.unsubscribe();
    this.userGroupSubscriptions.delete(userId);
    this.userGroupSubjects.delete(userId);
  }

  stopWatchingPublicGroups(userId: string): void {
    this.publicGroupSubscriptions.get(userId)?.unsubscribe();
    this.publicGroupSubscriptions.delete(userId);
    this.publicGroupSubjects.delete(userId);
  }

  private startUserGroupListening(userId: string): void {
    const subject = this.userGroupSubjects.get(userId);
    if (!subject) {
      return;
    }

    const membersRef = collection(this.db, 'groups');
    const membersQuery = query(membersRef, where('members', 'array-contains', userId));
    const ownerRef = collection(this.db, 'groups');
    const ownerQuery = query(ownerRef, where('ownerId', '==', userId));

    const membersSub = onSnapshot(membersQuery, (snap) => {
      const groups = snap.docs.map((docSnap) => this.normalizeGroupData(docSnap.id, docSnap.data()));
      const previousOwnerGroups = subject.value.filter((group) => group.ownerId === userId);
      subject.next(this.mergeUniqueGroups(groups, previousOwnerGroups));
    });

    const ownerSub = onSnapshot(ownerQuery, (snap) => {
      const ownerGroups = snap.docs.map((docSnap) => this.normalizeGroupData(docSnap.id, docSnap.data()));
      const currentMemberGroups = subject.value.filter((group) => !ownerGroups.some((ownerGroup) => ownerGroup.id === group.id));
      subject.next(this.mergeUniqueGroups(currentMemberGroups, ownerGroups));
    });

    const combinedSub = new Subscription();
    combinedSub.add(() => membersSub());
    combinedSub.add(() => ownerSub());
    this.userGroupSubscriptions.set(userId, combinedSub);
  }

  private startPublicGroupListening(userId: string): void {
    const subject = this.publicGroupSubjects.get(userId);
    if (!subject) {
      return;
    }

    const allPublicRef = collection(this.db, 'groups');
    const allPublicQuery = query(allPublicRef, where('isPrivate', '==', false));

    const publicSub = onSnapshot(allPublicQuery, (snap) => {
      const groups = snap.docs
        .map((docSnap) => this.normalizeGroupData(docSnap.id, docSnap.data()))
        .filter((group) => !group.members.includes(userId));
      subject.next(groups);
    });

    const subscription = new Subscription();
    subscription.add(() => publicSub());
    this.publicGroupSubscriptions.set(userId, subscription);
  }

  private mergeUniqueGroups(primary: Group[], secondary: Group[]): Group[] {
    const groupMap = new Map<string, Group>();
    primary.forEach((group) => groupMap.set(group.id, group));
    secondary.forEach((group) => groupMap.set(group.id, group));
    return Array.from(groupMap.values());
  }

  async getUserByEmail(email: string): Promise<UserAccount | null> {
    const ref = collection(this.db, 'users');
    const q = query(ref, where('email', '==', email), limit(1));
    const snap = await getDocs(q);
    return snap.docs.length > 0 ? ({ uid: snap.docs[0].id, ...snap.docs[0].data() } as UserAccount) : null;
  }

  async acceptInvitesForEmail(email: string, uid: string): Promise<void> {
    const ref = collection(this.db, 'groups');
    const q = query(ref, where('invites', 'array-contains', email));
    const snap = await getDocs(q);

    const updatePromises = snap.docs.map((docSnap) => {
      const groupRef = doc(this.db, 'groups', docSnap.id);
      return updateDoc(groupRef, {
        members: arrayUnion(uid),
        invites: arrayRemove(email),
      });
    });

    await Promise.all(updatePromises);
  }

  async inviteUserToGroup(groupId: string, email: string): Promise<{ invitedUserId?: string; invitedByEmail: string }> {
    const existingUser = await this.getUserByEmail(email);
    const groupRef = doc(this.db, 'groups', groupId);

    if (existingUser) {
      await updateDoc(groupRef, {
        members: arrayUnion(existingUser.uid),
        invites: arrayRemove(email),
      });
      return { invitedUserId: existingUser.uid, invitedByEmail: email };
    }

    await updateDoc(groupRef, {
      invites: arrayUnion(email),
    });
    return { invitedByEmail: email };
  }

  async updateGroup(groupId: string, data: Partial<Group>): Promise<void> {
    const groupRef = doc(this.db, 'groups', groupId);
    await updateDoc(groupRef, data);
  }

  async joinGroup(groupId: string, userId: string): Promise<void> {
    const groupRef = doc(this.db, 'groups', groupId);
    await updateDoc(groupRef, {
      members: arrayUnion(userId),
      invites: arrayRemove(userId),
    });
  }

  async getPublicGroupsNotMember(userId: string): Promise<Group[]> {
    const ref = collection(this.db, 'groups');
    const q = query(ref);
    const snap = await getDocs(q);
    return snap.docs
      .map((d) => this.normalizeGroupData(d.id, d.data()))
      .filter((group) => !group.isPrivate && !group.members.includes(userId));
  }

  // ---- Firestore Groups ----

  private normalizeGroupData(id: string, data: any): Group {
    return {
      id,
      title: data.title || 'Untitled Group',
      description: data.description || '',
      courseId: data.courseId || '',
      ownerId: data.ownerId || '',
      members: Array.isArray(data.members) ? data.members : [],
      isPrivate: typeof data.isPrivate === 'boolean' ? data.isPrivate : false,
      type: data.type === 'professor' ? 'professor' : 'student',
      department: data.department || '',
      lastActivity: data.lastActivity || Timestamp.now(),
      invites: Array.isArray(data.invites) ? data.invites : [],
    };
  }

  async getGroup(groupId: string): Promise<Group | null> {
    const ref = doc(this.db, 'groups', groupId);
    const snap = await getDoc(ref);
    return snap.exists() ? this.normalizeGroupData(snap.id, snap.data()) : null;
  }

  async getUserGroups(userId: string): Promise<Group[]> {
    const groups: Group[] = [];

    const membersRef = collection(this.db, 'groups');
    const membersQuery = query(membersRef, where('members', 'array-contains', userId));
    const membersSnap = await getDocs(membersQuery);
    membersSnap.docs.forEach((d) => groups.push(this.normalizeGroupData(d.id, d.data())));

    const ownerRef = collection(this.db, 'groups');
    const ownerQuery = query(ownerRef, where('ownerId', '==', userId));
    const ownerSnap = await getDocs(ownerQuery);
    ownerSnap.docs.forEach((d) => {
      const group = this.normalizeGroupData(d.id, d.data());
      if (!groups.some((existing) => existing.id === group.id)) {
        groups.push(group);
      }
    });

    return groups;
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

  async getUpcomingSessions(groupIds: string[]): Promise<any[]> {
    const now = Timestamp.now();
    const sessions: any[] = [];

    for (const groupId of groupIds) {
      const ref = collection(this.db, 'groups', groupId, 'sessions');
      const q = query(ref, where('date', '>=', now), orderBy('date', 'asc'));
      const snap = await getDocs(q);
      snap.docs.forEach((d) => {
        sessions.push({ id: d.id, groupId, ...d.data() });
      });
    }

    // Sort all sessions between groups by date
    return sessions.sort((a, b) => a.date.seconds - b.date.seconds);
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

  async getMessageHistory(groupId: string, limit: number = 50): Promise<any[]> {
    const ref = collection(this.db, 'groups', groupId, 'messages');
    const q = query(ref, orderBy('date', 'asc'), limitToLast(limit));
    const snap = await getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
}
