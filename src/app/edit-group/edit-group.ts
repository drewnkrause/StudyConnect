import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { FirebaseService } from '../services/firebase';
import { AuthService } from '../services/auth';
import { Courses } from '../services/courses';
import { Course } from '../models/course';
import { Group } from '../models/group';
import { UserAccount } from '../models/user';

@Component({
  selector: 'app-edit-group',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-group.html',
  styleUrl: './edit-group.css',
})
export class EditGroup implements OnInit {
  groupId: string = '';
  currentUserId: string = '';
  title: string = '';
  description: string = '';
  courseId: string = '';
  department: string = '';
  type: 'student' | 'professor' = 'student';
  isPrivate: boolean = false;
  isLoading: boolean = false;
  errorMessage: string = '';
  inviteEmail: string = '';
  members: UserAccount[] = [];

  // Course and department filtering
  allCourses: Course[] = [];
  departments: string[] = [];
  filteredCourses: Course[] = [];
  departmentSearchQuery: string = '';
  courseSearchQuery: string = '';
  showDepartmentDropdown: boolean = false;
  showCourseDropdown: boolean = false;
  selectedCourseDisplay: string = '';

  constructor(
    private firebase: FirebaseService,
    private auth: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef,
    private coursesService: Courses,
  ) {}

  async ngOnInit(): Promise<void> {
    this.groupId = this.route.snapshot.params['id'];
    if (!this.groupId) {
      this.router.navigate(['/']);
      return;
    }

    const user = this.auth.currentUser$();
    if (!user) {
      this.router.navigate(['/login']);
      return;
    }

    this.currentUserId = user.uid;

    try {
      const group = await this.firebase.getGroup(this.groupId);
      if (!group) {
        this.errorMessage = 'Group not found.';
        return;
      }

      if (group.ownerId !== user.uid) {
        this.errorMessage = 'You do not have permission to edit this group.';
        return;
      }

      // Load courses
      this.allCourses = await this.coursesService.getCourses();
      const uniqueDepts = new Set(this.allCourses.map((c) => c.department));
      this.departments = Array.from(uniqueDepts).sort();

      // Populate fields
      this.title = group.title;
      this.description = group.description;
      this.courseId = group.courseId;
      this.department = group.department;
      this.type = group.type;
      this.isPrivate = group.isPrivate;

      // Load members
      this.members = [];
      for (const uid of group.members) {
        const member = await this.firebase.getUser(uid);
        if (member) {
          this.members.push(member);
        }
      }

      this.cdr.detectChanges();

      // Set course search query to the course name
      const course = this.allCourses.find(
        (c) => c.code === this.courseId && c.department === this.department,
      );
      if (course) {
        this.selectedCourseDisplay = `${course.code} - ${course.name}`;
      }

      this.updateFilteredCourses();
    } catch (error) {
      console.error('Error loading group:', error);
      this.errorMessage = 'Failed to load group data.';
    }
  }

  get filteredDepartments(): string[] {
    if (!this.departmentSearchQuery.trim()) {
      return this.departments;
    }
    return this.departments.filter((d) =>
      d.toLowerCase().includes(this.departmentSearchQuery.toLowerCase()),
    );
  }

  onDepartmentInputChange(value: string): void {
    if (this.departments.includes(value)) {
      this.selectDepartment(value);
    } else {
      this.departmentSearchQuery = value;
      this.department = '';
      this.updateFilteredCourses();
    }
  }

  selectDepartment(dept: string): void {
    this.department = dept;
    this.departmentSearchQuery = '';
    this.showDepartmentDropdown = false;
    this.courseId = '';
    this.courseSearchQuery = '';
    this.selectedCourseDisplay = '';
    this.updateFilteredCourses();
  }

  updateFilteredCourses(): void {
    if (!this.department) {
      this.filteredCourses = [];
      return;
    }

    const courses = this.allCourses.filter((c) => c.department === this.department);

    if (!this.courseSearchQuery.trim()) {
      this.filteredCourses = courses;
      return;
    }

    const query = this.courseSearchQuery.toLowerCase();
    this.filteredCourses = courses.filter(
      (c) => c.code.toLowerCase().includes(query) || c.name.toLowerCase().includes(query),
    );
  }

  onCourseSearchChange(): void {
    this.updateFilteredCourses();
    this.showCourseDropdown = true;
  }

  selectCourse(course: Course): void {
    this.courseId = course.code;
    this.selectedCourseDisplay = `${course.code} - ${course.name}`;
    this.courseSearchQuery = '';
    this.showCourseDropdown = false;
  }

  async updateGroup(): Promise<void> {
    if (!this.title.trim() || !this.courseId.trim() || !this.department.trim()) {
      this.errorMessage = 'Please fill in all required fields.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const updateData = {
        title: this.title.trim(),
        description: this.description.trim(),
        courseId: this.courseId.trim(),
        department: this.department.trim(),
        type: this.type,
        isPrivate: this.isPrivate,
      };

      await this.firebase.updateGroup(this.groupId, updateData);
      this.router.navigate(['/groups', this.groupId]);
    } catch (error) {
      console.error('Error updating group:', error);
      this.errorMessage = 'Something went wrong. Please try again.';
    } finally {
      this.isLoading = false;
    }
  }

  async inviteMember(): Promise<void> {
    if (!this.inviteEmail.trim()) {
      this.errorMessage = 'Please enter an email to invite.';
      return;
    }

    try {
      const user = await this.firebase.getUserByEmail(this.inviteEmail.trim());
      if (!user) {
        this.errorMessage = 'User not found with that email.';
        return;
      }

      await this.firebase.joinGroup(this.groupId, user.uid);
      this.inviteEmail = '';
      this.errorMessage = 'Member invited successfully.';
      // Reload members
      await this.loadMembers();
    } catch (error) {
      console.error('Error inviting member:', error);
      this.errorMessage = 'Failed to invite member.';
    }
  }

  async removeMember(memberId: string): Promise<void> {
    try {
      await this.firebase.leaveGroup(this.groupId, memberId);
      // Reload members
      await this.loadMembers();
    } catch (error) {
      console.error('Error removing member:', error);
      this.errorMessage = 'Failed to remove member.';
    }
  }

  private async loadMembers(): Promise<void> {
    const group = await this.firebase.getGroup(this.groupId);
    if (group) {
      this.members = [];
      for (const uid of group.members) {
        const member = await this.firebase.getUser(uid);
        if (member) {
          this.members.push(member);
        }
      }
      this.cdr.detectChanges();
    }
  }

  cancel(): void {
    this.router.navigate(['/groups', this.groupId]);
  }
}
