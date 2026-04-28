import type { FieldValue, Timestamp } from 'firebase/firestore';

export interface SharedResource {
  id: string;
  groupId: string;
  title: string;
  url: string;
  type: 'file' | 'link';
  uploadedBy: string;
  uploadedAt: Timestamp | FieldValue;
}
