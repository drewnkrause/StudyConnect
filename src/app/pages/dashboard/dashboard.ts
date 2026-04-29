import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { FirebaseService } from '../../services/firebase';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit {
  userName: string = 'there';
  myGroups: any[] = [];
  upcomingSessions: any[] = [];

  constructor(private firebase: FirebaseService) {}

  async ngOnInit(): Promise<void> {
    const user = this.firebase.getCurrentUser();
    if (user) {
      this.userName = user.displayName || user.email || 'there';
      this.myGroups = await this.firebase.getUserGroups(user.uid);
    }
  }

  createGroup(): void {
  }
}
