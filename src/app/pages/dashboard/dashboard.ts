import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FirebaseService } from '../../services/firebase';
import { AuthService } from '../../services/auth';
import { Group } from '../../models/group';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  userName: string = 'User';
  myGroups: Group[] = [];
  upcomingSessions: any[] = [];
  currentUserId: string = '';

  constructor(
    private firebase: FirebaseService,
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef,
  ) {}

  getGroupName(groupId: string): string {
    return this.myGroups.find((g) => g.id === groupId)?.title || 'Unknown Group';
  }

  editGroup(groupId: string): void {
    this.router.navigate(['/groups', groupId, 'edit']);
  }

  async deleteGroup(groupId: string): Promise<void> {
    if (confirm('Are you sure you want to delete this group? This action cannot be undone.')) {
      try {
        await this.firebase.deleteGroup(groupId);
        this.myGroups = this.myGroups.filter((g) => g.id !== groupId);
        this.upcomingSessions = this.upcomingSessions.filter((s) => s.groupId !== groupId);
        this.cdr.detectChanges();
      } catch (error) {
        console.error('Error deleting group:', error);
      }
    }
  }

  async ngOnInit(): Promise<void> {
    const user = this.auth.currentUser$();
    if (!user) return;

    this.currentUserId = user.uid;
    this.userName = user.displayName || user.email || 'there';
    try {
      this.myGroups = await this.firebase.getUserGroups(user.uid);
      console.log('Current user UID:', user.uid);
      console.log('My groups:', this.myGroups);

      const groupIds = this.myGroups.map((g) => g.id);
      if (groupIds.length > 0) {
        this.upcomingSessions = await this.firebase.getUpcomingSessions(groupIds);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      this.cdr.detectChanges();
    }
  }

  isGroupOwner(group: Group): boolean {
    return group.ownerId === this.currentUserId;
  }

  isGroupMember(group: Group): boolean {
    return group.members.includes(this.currentUserId);
  }

  async leaveGroup(groupId: string): Promise<void> {
    if (!confirm('Leave this group?')) {
      return;
    }

    try {
      await this.firebase.leaveGroup(groupId, this.currentUserId);
      this.myGroups = this.myGroups.filter((g) => g.id !== groupId);
      this.upcomingSessions = this.upcomingSessions.filter((s) => s.groupId !== groupId);
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error leaving group:', error);
    }
  }

  createGroup(): void {
    this.router.navigate(['/groups/create']);
  }
}
