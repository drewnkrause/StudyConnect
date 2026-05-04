import type { FieldValue, Timestamp } from 'firebase/firestore';

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  content: string;
  sentAt: Timestamp | FieldValue;
}
