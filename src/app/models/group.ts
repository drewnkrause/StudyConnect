import type { FieldValue, Timestamp } from 'firebase/firestore';

export interface Group {
  id: string;
  title: string;
  description: string;
  courseId: string;
  ownerId: string;
  members: string[];
  isPrivate: boolean;
  type: 'student' | 'professor';
  department: string;
  lastActivity: Timestamp | FieldValue;
  invites?: string[];
}
