import { Component, OnInit, ChangeDetectorRef, signal, computed, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Courses } from '../../services/courses';
import { Course } from '../../models/course';

interface DepartmentGroup {
  name: string;
  courses: Course[];
  isCollapsed: boolean;
}

@Component({
  selector: 'app-course-catalog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './course-catalog.html',
  styleUrl: './course-catalog.css'
})
export class CourseCatalog implements OnInit {
  private coursesService = inject(Courses);
  private cdr = inject(ChangeDetectorRef);

  private allCoursesSignal = signal<Course[]>([]);
  public searchQuery = signal<string>('');
  public isLoading = signal<boolean>(true);

  // Tracks which departments are expanded. Using a Set or an object might be easier with signals.
  // For simplicity with the requested "collapsable" cards, we'll manage an array of groups.
  public departments = signal<DepartmentGroup[]>([]);

  public filteredDepartments = computed(() => {
    const query = this.searchQuery().toLowerCase();
    const depts = this.departments();
    
    if (!query) return depts;

    return depts.map(dept => {
      const filteredCourses = dept.courses.filter(c => 
        c.name.toLowerCase().includes(query) || 
        c.code.toLowerCase().includes(query)
      );

      if (filteredCourses.length > 0 || dept.name.toLowerCase().includes(query)) {
        return { ...dept, courses: filteredCourses, isCollapsed: false }; // Expand if matches
      }
      return null;
    }).filter(d => d !== null) as DepartmentGroup[];
  });

  async ngOnInit(): Promise<void> {
    try {
      const courses = await this.coursesService.getCourses();
      this.allCoursesSignal.set(courses);
      
      // Group by department initially
      const groups: { [key: string]: Course[] } = {};
      courses.forEach(course => {
        if (!groups[course.department]) {
          groups[course.department] = [];
        }
        groups[course.department].push(course);
      });

      const deptGroups = Object.keys(groups).sort().map(dept => ({
        name: dept,
        courses: groups[dept],
        isCollapsed: true
      }));

      this.departments.set(deptGroups);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      this.isLoading.set(false);
      this.cdr.detectChanges();
    }
  }

  toggleDepartment(deptName: string): void {
    this.departments.update(depts => 
      depts.map(d => d.name === deptName ? { ...d, isCollapsed: !d.isCollapsed } : d)
    );
  }

  onSearchChange(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.searchQuery.set(value);
  }
}
