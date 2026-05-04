import type { FieldValue, Timestamp } from 'firebase/firestore';

export interface StudySession {
  id: string;
  groupId: string;
  topic: string;
  locaiton: string;
  startTime: Timestamp | FieldValue;
}
