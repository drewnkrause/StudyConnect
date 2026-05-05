import type { FieldValue, Timestamp } from 'firebase/firestore';

export interface StudySession {
  id: string;
  groupId: string;
  topic: string;
  location: string;
  startTime: Timestamp | FieldValue;
}
