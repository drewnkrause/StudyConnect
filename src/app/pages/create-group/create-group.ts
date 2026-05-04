import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { FirebaseService } from '../../services/firebase';
import { AuthService } from '../../services/auth';
import { Courses } from '../../services/courses';
import { Course } from '../../models/course';
import { Timestamp } from 'firebase/firestore';

@Component({
  selector: 'app-create-group',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './create-group.html',
  styleUrl: './create-group.css',
})
export class CreateGroup implements OnInit {
  title: string = '';
  description: string = '';
  courseId: string = '';
  department: string = '';
  type: 'student' | 'professor' = 'student';
  isPrivate: boolean = false;
  isLoading: boolean = false;
  errorMessage: string = '';

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
    private coursesService: Courses,
  ) {}

  async ngOnInit(): Promise<void> {
    try {
      this.allCourses = await this.coursesService.getCourses();
      const uniqueDepts = new Set(this.allCourses.map((c) => c.department));
      this.departments = Array.from(uniqueDepts).sort();
    } catch (error) {
      console.error('Error loading courses:', error);
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
        lastActivity: Timestamp.now(),
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
