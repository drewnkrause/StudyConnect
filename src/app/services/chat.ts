import { Injectable } from '@angular/core';
import { FirebaseService } from './firebase';
import { AuthService } from './auth';
import { ChatMessage } from '../models/message';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private messagesSubject = new BehaviorSubject<ChatMessage[]>([]);
  public messages$ = this.messagesSubject.asObservable();
  private currentGroupId: string | null = null;
  private unsubscribeMessages: (() => void) | null = null;

  constructor(
    private firebaseService: FirebaseService,
    private authService: AuthService,
  ) {}

  /**
   * Join a group chat room and start listening for messages
   * @param groupId The ID of the group to join
   */
  joinGroupChat(groupId: string): void {
    // Leave current chat if any
    this.leaveGroupChat();

    this.currentGroupId = groupId;

    // Start listening for messages
    this.unsubscribeMessages = this.firebaseService.listenToMessages(groupId, (messages: any[]) => {
      const chatMessages: ChatMessage[] = messages.map((msg) => ({
        id: msg.id,
        senderId: msg.senderId,
        senderName: msg.senderName,
        content: msg.content,
        sentAt: msg.date, // Note: Firebase service uses 'date', but model uses 'sentAt'
      }));
      this.messagesSubject.next(chatMessages);
    });
  }

  /**
   * Leave the current group chat room
   */
  leaveGroupChat(): void {
    if (this.unsubscribeMessages) {
      this.unsubscribeMessages();
      this.unsubscribeMessages = null;
    }
    this.currentGroupId = null;
    this.messagesSubject.next([]);
  }

  /**
   * Send a message to the current group chat
   * @param content The message content
   */
  async sendMessage(content: string): Promise<void> {
    if (!this.currentGroupId) {
      throw new Error('No active chat room. Join a group chat first.');
    }

    const currentUser = this.authService.currentUser$();
    if (!currentUser) {
      throw new Error('User must be authenticated to send messages');
    }

    const messageData = {
      senderId: currentUser.uid,
      senderName: currentUser.displayName || currentUser.email || 'Anonymous',
      content: content.trim(),
    };

    try {
      await this.firebaseService.sendMessage(this.currentGroupId, messageData);
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  }

  /**
   * Get the current group ID being chatted in
   */
  getCurrentGroupId(): string | null {
    return this.currentGroupId;
  }

  /**
   * Check if user can access a group chat
   * @param groupId The group ID to check
   */
  async canAccessGroupChat(groupId: string): Promise<boolean> {
    try {
      const currentUser = this.authService.currentUser$();
      if (!currentUser) return false;

      const group = await this.firebaseService.getGroup(groupId);
      if (!group) return false;

      // Check if user is a member of the group
      return group.members?.includes(currentUser.uid) || false;
    } catch (error) {
      console.error('Error checking group access:', error);
      return false;
    }
  }

  /**
   * Get chat history for a specific group (one-time fetch)
   * @param groupId The group ID
   * @param limit Maximum number of messages to fetch
   */
  async getChatHistory(groupId: string, limit: number = 50): Promise<ChatMessage[]> {
    try {
      const messages = await this.firebaseService.getMessageHistory(groupId, limit);
      return messages.map((msg) => ({
        id: msg.id,
        senderId: msg.senderId,
        senderName: msg.senderName,
        content: msg.content,
        sentAt: msg.date,
      }));
    } catch (error) {
      console.error('Error fetching chat history:', error);
      return [];
    }
  }
}
