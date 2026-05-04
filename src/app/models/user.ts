import type { FieldValue, Timestamp } from 'firebase/firestore';

export interface UserAccount {
  uid: string;
  email: string;
  name: string;
  studentId: number;
  major: string;
  university: string;
  enrolledCourseIds: string[];
  groupIds: string[];
  createdAt: Timestamp | FieldValue;
}
