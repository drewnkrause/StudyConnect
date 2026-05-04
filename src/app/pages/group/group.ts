import { Component, OnInit, OnDestroy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { FirebaseService } from '../../services/firebase';
import { ChatService } from '../../services/chat';
import { ChatMessage } from '../../models/message';
import { Group as GroupModel } from '../../models/group';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-group',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './group.html',
  styleUrl: './group.css',
})
export class Group implements OnInit, OnDestroy {
  group: GroupModel | null = null;
  sessions: any[] = [];
  newMessage: string = '';
  messages$: Observable<ChatMessage[]>;

  constructor(
    private route: ActivatedRoute,
    private firebase: FirebaseService,
    private chatService: ChatService,
    private cdr: ChangeDetectorRef
  ) {
    this.messages$ = this.chatService.messages$;
  }

  async ngOnInit(): Promise<void> {
    const groupId = this.route.snapshot.paramMap.get('id');
    if (!groupId) return;

    this.group = await this.firebase.getGroup(groupId);
    this.sessions = await this.firebase.getSessions(groupId);
    this.cdr.detectChanges();

    const canAccess = await this.chatService.canAccessGroupChat(groupId);
    if (canAccess) {
      this.chatService.joinGroupChat(groupId);
      this.cdr.detectChanges();
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

  scheduleSession(): void {}

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
