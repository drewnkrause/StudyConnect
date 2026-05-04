import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom, map } from 'rxjs';
import { Course } from '../models/course';

@Injectable({
  providedIn: 'root',
})
export class Courses {
  private http = inject(HttpClient);

  async getCourses(): Promise<Course[]> {
    return firstValueFrom(
      this.http.get<any[]>('/courses.json')
    );
  }
}
