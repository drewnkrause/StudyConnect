import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { FirebaseService } from '../../services/firebase';
import { ChatService } from '../../services/chat';
import { ChatMessage } from '../../models/message';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-group',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './group.html',
  styleUrl: './group.css',
})
export class Group implements OnInit, OnDestroy {
  group: any = null;
  newMessage: string = '';
  messages$: Observable<ChatMessage[]>;

  constructor(
    private route: ActivatedRoute,
    private firebase: FirebaseService,
    private chatService: ChatService
  ) {
    this.messages$ = this.chatService.messages$;
  }

  async ngOnInit(): Promise<void> {
    const groupId = this.route.snapshot.paramMap.get('id');
    if (!groupId) return;

    // Load group data and sessions
    this.group = await this.firebase.getGroup(groupId);
    this.group.sessions = await this.firebase.getSessions(groupId);

    // Check if user can access this group's chat
    const canAccess = await this.chatService.canAccessGroupChat(groupId);
    if (canAccess) {
      // Join the group chat
      this.chatService.joinGroupChat(groupId);
    } else {
      console.warn('User does not have access to this group chat');
    }
  }

  async sendMessage(): Promise<void> {
    if (!this.newMessage.trim()) return;

    try {
      await this.chatService.sendMessage(this.newMessage);
      this.newMessage = '';
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }

  scheduleSession(): void {
  }

  ngOnDestroy(): void {
    // Leave the chat room when component is destroyed
    this.chatService.leaveGroupChat();
  }

  getMessageDate(sentAt: any): Date | null {
    if (sentAt && typeof sentAt.toDate === 'function') {
      return sentAt.toDate();
    }
    return null;
  }
}