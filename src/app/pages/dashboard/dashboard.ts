import { Component, OnInit, OnDestroy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { User } from 'firebase/auth';
import { FirebaseService } from '../../services/firebase';
import { AuthService } from '../../services/auth';
import { Group } from '../../models/group';
import { Timestamp } from 'firebase/firestore';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit, OnDestroy {
  userName = signal('there');
  myGroups = signal<Group[]>([]);
  publicGroups = signal<Group[]>([]);
  upcomingSessions = signal<any[]>([]);
  showNewGroupForm = false;
  newGroupTitle = '';
  newGroupCourseId = '';
  newGroupDescription = '';
  newGroupType: 'student' | 'professor' = 'student';
  newGroupIsPrivate = false;
  createError = '';
  isCreating = false;
  currentUserId = signal<string | null>(null);
  isLoadingGroups = signal(false);
  private router = inject(Router);
  private authUnsubscribe: (() => void) | null = null;
  private myGroupsSubscription: Subscription | null = null;
  private publicGroupsSubscription: Subscription | null = null;

  constructor(
    private firebase: FirebaseService,
    private auth: AuthService,
  ) {}

  getGroupName(groupId: string): string {
    return this.myGroups().find((g) => g.id === groupId)?.title || 'Unknown Group';
  }

  ngOnInit(): void {
    const currentUser = this.auth.getCurrentUser();

    if (currentUser) {
      this.onUserAvailable(currentUser);
    } else {
      this.isLoadingGroups.set(true);
      this.auth.waitForAuthState().then((user) => {
        if (user) {
          this.onUserAvailable(user);
        } else {
          this.isLoadingGroups.set(false);
        }
      });
    }

    this.authUnsubscribe = this.auth.onAuthStateChange((user) => {
      if (user) {
        this.onUserAvailable(user);
      } else {
        this.currentUserId.set(null);
        this.myGroups.set([]);
        this.publicGroups.set([]);
        this.upcomingSessions.set([]);
        this.isLoadingGroups.set(false);
        this.myGroupsSubscription?.unsubscribe();
        this.publicGroupsSubscription?.unsubscribe();
      }
    });
  }

  private onUserAvailable(user: User): void {
    this.currentUserId.set(user.uid);
    this.userName.set(user.displayName || user.email || 'there');
    this.prepareGroupStreams(user.uid);
  }

  ngOnDestroy(): void {
    this.authUnsubscribe?.();
    this.myGroupsSubscription?.unsubscribe();
    this.publicGroupsSubscription?.unsubscribe();
  }

  private prepareGroupStreams(userId: string): void {
    this.myGroupsSubscription?.unsubscribe();
    this.publicGroupsSubscription?.unsubscribe();

    this.isLoadingGroups.set(true);
    this.myGroupsSubscription = this.firebase.watchUserGroups(userId).subscribe((groups) => {
      this.myGroups.set(groups);
      this.updateUpcomingSessions(groups);
      this.isLoadingGroups.set(false);
    });

    this.publicGroupsSubscription = this.firebase.watchPublicGroupsNotMember(userId).subscribe((groups) => {
      this.publicGroups.set(groups);
      this.isLoadingGroups.set(false);
    });
  }

  private async updateUpcomingSessions(groups: Group[]): Promise<void> {
    const groupIds = groups.map((g) => g.id);
    if (groupIds.length > 0) {
      this.upcomingSessions.set(await this.firebase.getUpcomingSessions(groupIds));
    } else {
      this.upcomingSessions.set([]);
    }
  }

  toggleCreateGroupForm(): void {
    this.showNewGroupForm = !this.showNewGroupForm;
    this.createError = '';
  }

  async createGroup(): Promise<void> {
    const user = this.auth.currentUser$();
    if (!user) {
      this.createError = 'You must be logged in to create a group.';
      return;
    }

    if (!this.newGroupTitle.trim() || !this.newGroupCourseId.trim()) {
      this.createError = 'Please provide both a group name and course code.';
      return;
    }

    this.isCreating = true;
    this.createError = '';

    try {
      const groupData = {
        title: this.newGroupTitle.trim(),
        description: this.newGroupDescription.trim(),
        courseId: this.newGroupCourseId.trim(),
        ownerId: user.uid,
        members: [user.uid],
        isPrivate: this.newGroupIsPrivate,
        type: this.newGroupType,
        department: '',
        invites: [],
        lastActivity: Timestamp.now(),
      };

      const groupRef = await this.firebase.createGroup(groupData);
      this.showNewGroupForm = false;
      this.newGroupTitle = '';
      this.newGroupCourseId = '';
      this.newGroupDescription = '';
      this.newGroupType = 'student';
      this.newGroupIsPrivate = false;

      await this.router.navigate(['/groups', groupRef.id]);
    } catch (error: any) {
      this.createError = error?.message || 'Unable to create group. Please try again.';
    } finally {
      this.isCreating = false;
    }
  }

  async joinPublicGroup(groupId: string): Promise<void> {
    const user = this.auth.currentUser$();
    if (!user) {
      return;
    }

    try {
      await this.firebase.joinGroup(groupId, user.uid);
      await this.router.navigate(['/groups', groupId]);
    } catch (error: any) {
      console.error('Failed to join public group:', error);
    }
  }
}
