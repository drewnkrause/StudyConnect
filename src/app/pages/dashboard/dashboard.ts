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
  userName: string = 'there';
  myGroups: Group[] = [];
  upcomingSessions: any[] = [];

  constructor(
    private firebase: FirebaseService,
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  getGroupName(groupId: string): string {
    return this.myGroups.find((g) => g.id === groupId)?.title || 'Unknown Group';
  }

  async ngOnInit(): Promise<void> {
    await new Promise<void>((resolve) => {
      const unsubscribe = this.firebase.onAuthStateChange((user) => {
        unsubscribe();
        resolve();
      });
    });

    const user = this.auth.currentUser$();
    if (user) {
      this.userName = user.displayName || user.email || 'there';
      this.myGroups = await this.firebase.getUserGroups(user.uid);
      console.log('Current user UID:', user.uid);
      console.log('My groups:', this.myGroups);

      const groupIds = this.myGroups.map((g) => g.id);
      if (groupIds.length > 0) {
        this.upcomingSessions = await this.firebase.getUpcomingSessions(groupIds);
      }
      this.cdr.detectChanges();
    }
  }

  createGroup(): void {
    this.router.navigate(['/groups/create']);
  }
}
