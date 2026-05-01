import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FirebaseService } from '../../services/firebase';
import { AuthService } from '../../services/auth';
import { Group } from '../../models/group';

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
  ) {}

  getGroupName(groupId: string): string {
    return this.myGroups.find((g) => g.id === groupId)?.title || 'Unknown Group';
  }

  async ngOnInit(): Promise<void> {
    const user = this.auth.currentUser$();
    if (user) {
      this.userName = user.displayName || user.email || 'there';
      this.myGroups = await this.firebase.getUserGroups(user.uid);

      // Fetch upcoming sessions across all groups
      const groupIds = this.myGroups.map((g) => g.id);
      if (groupIds.length > 0) {
        this.upcomingSessions = await this.firebase.getUpcomingSessions(groupIds);
      }
    }
  }

  createGroup(): void {
    // Coming soon!
  }
}
