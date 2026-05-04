import { Component, inject, signal, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth';
import { FirebaseService } from '../../services/firebase';
import { Courses } from '../../services/courses';
import { Course } from '../../models/course';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { UserAccount } from '../../models/user';

@Component({
  selector: 'app-account',
  imports: [ReactiveFormsModule, CommonModule, FormsModule],
  templateUrl: './account.html',
  styleUrl: './account.css',
})
export class Account implements OnInit {
  private authService = inject(AuthService);
  private firebaseService = inject(FirebaseService);
  private coursesService = inject(Courses);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  user = signal<UserAccount | null>(null);
  error = signal('');
  success = signal('');

  // Course management
  enrolledCourses: Course[] = [];
  allCourses: Course[] = [];
  departments: string[] = [];
  filteredCourses: Course[] = [];
  departmentSearchQuery: string = '';
  courseSearchQuery: string = '';
  showDepartmentDropdown: boolean = false;
  showCourseDropdown: boolean = false;
  selectedDepartment: string = '';

  profileForm = this.fb.group({
    name: ['', Validators.required],
    studentId: ['', [Validators.required, Validators.pattern(/^\d+$/)]],
    major: ['', Validators.required],
    university: ['', Validators.required],
  });

  async ngOnInit() {
    const currentUser = this.authService.currentUser$();
    if (currentUser) {
      const userData = await this.firebaseService.getUser(currentUser.uid);
      if (userData) {
        this.user.set(userData);
        this.profileForm.patchValue({
          name: userData.name,
          studentId: userData.studentId.toString(),
          major: userData.major,
          university: userData.university,
        });

        // Load courses
        await this.loadCourses();
        await this.loadEnrolledCourses(userData.enrolledCourseIds);
      }
    }
  }

  async onSubmit() {
    if (this.profileForm.valid && this.user()) {
      try {
        const { name, studentId, major, university } = this.profileForm.value;
        await this.firebaseService.updateUser(this.user()!.uid, {
          name: name!,
          studentId: parseInt(studentId!),
          major: major!,
          university: university!,
        });
        this.success.set('Profile updated successfully');
        this.error.set('');
      } catch (err: any) {
        this.error.set(err.message || 'Update failed');
        this.success.set('');
      }
    }
  }

  // Course management methods
  async loadCourses() {
    try {
      this.allCourses = await this.coursesService.getCourses();
      const uniqueDepts = new Set(this.allCourses.map((c) => c.department));
      this.departments = Array.from(uniqueDepts).sort();
    } catch (error) {
      console.error('Error loading courses:', error);
    }
  }

  async loadEnrolledCourses(courseIds: string[]) {
    this.enrolledCourses = this.allCourses.filter((course) => courseIds.includes(course.code));
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
      this.selectedDepartment = '';
      this.updateFilteredCourses();
    }
  }

  selectDepartment(dept: string): void {
    this.selectedDepartment = dept;
    this.departmentSearchQuery = '';
    this.showDepartmentDropdown = false;
    this.courseSearchQuery = '';
    this.updateFilteredCourses();
  }

  updateFilteredCourses(): void {
    if (!this.selectedDepartment) {
      this.filteredCourses = [];
      return;
    }

    const courses = this.allCourses.filter((c) => c.department === this.selectedDepartment);

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
  }

  async selectCourse(course: Course): Promise<void> {
    if (!this.user()) return;

    const currentIds = this.user()!.enrolledCourseIds;
    if (!currentIds.includes(course.code)) {
      const updatedIds = [...currentIds, course.code];
      try {
        await this.firebaseService.updateUser(this.user()!.uid, {
          enrolledCourseIds: updatedIds,
        });
        this.user.update((user) => (user ? { ...user, enrolledCourseIds: updatedIds } : null));
        await this.loadEnrolledCourses(updatedIds);
        this.success.set('Course added successfully');
        this.error.set('');
      } catch (err: any) {
        this.error.set(err.message || 'Failed to add course');
        this.success.set('');
      }
    }
    this.showCourseDropdown = false;
    this.courseSearchQuery = '';
  }

  async removeCourse(courseId: string): Promise<void> {
    if (!this.user()) return;

    const currentIds = this.user()!.enrolledCourseIds;
    const updatedIds = currentIds.filter((id) => id !== courseId);
    try {
      await this.firebaseService.updateUser(this.user()!.uid, {
        enrolledCourseIds: updatedIds,
      });
      this.user.update((user) => (user ? { ...user, enrolledCourseIds: updatedIds } : null));
      await this.loadEnrolledCourses(updatedIds);
      this.success.set('Course removed successfully');
      this.error.set('');
    } catch (err: any) {
      this.error.set(err.message || 'Failed to remove course');
      this.success.set('');
    }
  }
}
