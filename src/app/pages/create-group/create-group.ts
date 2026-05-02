import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FirebaseService } from '../../services/firebase';
import { AuthService } from '../../services/auth';
import { Timestamp } from 'firebase/firestore';

@Component({
  selector: 'app-create-group',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-group.html',
  styleUrl: './create-group.css'
})
export class CreateGroup {
  title: string = '';
  description: string = '';
  courseId: string = '';
  department: string = '';
  type: 'student' | 'professor' = 'student';
  isPrivate: boolean = false;
  isLoading: boolean = false;
  errorMessage: string = '';

  constructor(
    private firebase: FirebaseService,
    private auth: AuthService,
    private router: Router
  ) {}

  async createGroup(): Promise<void> {
    if (!this.title.trim() || !this.courseId.trim() || !this.department.trim()) {
      this.errorMessage = 'Please fill in all required fields.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const user = this.auth.currentUser$();
      if (!user) throw new Error('Not authenticated');

      const groupData = {
        title: this.title.trim(),
        description: this.description.trim(),
        courseId: this.courseId.trim(),
        department: this.department.trim(),
        type: this.type,
        isPrivate: this.isPrivate,
        ownerId: user.uid,
        members: [user.uid],
        lastActivity: Timestamp.now()
      };

      const result = await this.firebase.createGroup(groupData);
      this.router.navigate(['/groups', result.id]);
    } catch (error) {
      console.error('Error creating group:', error);
      this.errorMessage = 'Something went wrong. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  cancel(): void {
    this.router.navigate(['/']);
  }
}