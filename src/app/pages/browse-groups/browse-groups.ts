import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { FirebaseService } from '../../services/firebase';
import { AuthService } from '../../services/auth';
import { Group } from '../../models/group';

@Component({
  selector: 'app-browse-groups',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './browse-groups.html',
  styleUrl: './browse-groups.css',
})
export class BrowseGroups implements OnInit {
  allGroups: Group[] = [];
  filteredGroups: Group[] = [];
  departmentFilter: string = '';
  searchQuery: string = '';
  isLoading: boolean = true;
  errorMessage: string = '';
  joiningGroupId: string | null = null;
  currentUserId: string = '';

  constructor(
    private firebase: FirebaseService,
    private auth: AuthService,
    private router: Router,
    private cdr: ChangeDetectorRef
  ) {}

  async ngOnInit(): Promise<void> {
    const user = this.auth.currentUser$();
    if (!user) {
      this.isLoading = false;
      this.cdr.detectChanges();
      return;
    }

    this.currentUserId = user.uid;

    try {
      this.allGroups = await this.firebase.browseGroups();
      this.filteredGroups = this.allGroups;
    } catch (error) {
      console.error('Error loading groups:', error);
      this.errorMessage = 'Failed to load groups. Please try again.';
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }

  filterGroups(): void {
    this.filteredGroups = this.allGroups.filter((group) => {
      const matchesSearch =
        !this.searchQuery ||
        group.title.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        group.courseId.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        group.description.toLowerCase().includes(this.searchQuery.toLowerCase());

      const matchesDepartment =
        !this.departmentFilter ||
        group.department.toLowerCase().includes(this.departmentFilter.toLowerCase());

      return matchesSearch && matchesDepartment;
    });
  }

  isMember(group: Group): boolean {
    return group.members.includes(this.currentUserId);
  }

  async joinGroup(group: Group): Promise<void> {
    this.joiningGroupId = group.id;
    try {
      await this.firebase.joinGroup(group.id, this.currentUserId);
      this.router.navigate(['/groups', group.id]);
    } catch (error) {
      console.error('Error joining group:', error);
      this.errorMessage = 'Failed to join group. Please try again.';
    } finally {
      this.joiningGroupId = null;
    }
  }

  viewGroup(group: Group): void {
    this.router.navigate(['/groups', group.id]);
  }
}
