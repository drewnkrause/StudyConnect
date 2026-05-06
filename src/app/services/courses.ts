import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Location } from '@angular/common';
import { firstValueFrom, map } from 'rxjs';
import { Course } from '../models/course';

@Injectable({
  providedIn: 'root',
})
export class Courses {
  private http = inject(HttpClient);
  private location = inject(Location);

  async getCourses(): Promise<Course[]> {
    return firstValueFrom(
      this.http.get<any[]>(this.location.prepareExternalUrl('courses.json'))
    );
  }
}
