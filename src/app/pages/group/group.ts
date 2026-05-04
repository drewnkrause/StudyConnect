import {
  Component,
  OnInit,
  OnDestroy,
  AfterViewInit,
  ChangeDetectorRef,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { FirebaseService } from '../../services/firebase';
import { ChatService } from '../../services/chat';
import { ChatMessage } from '../../models/message';
import { Group as GroupModel } from '../../models/group';
import { Observable, Subscription } from 'rxjs';

@Component({
  selector: 'app-group',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './group.html',
  styleUrl: './group.css',
})
export class Group implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('messagesContainer') private messagesContainer!: ElementRef<HTMLDivElement>;

  group: GroupModel | null = null;
  memberNames: Array<{ uid: string; name: string }> = [];
  sessions: any[] = [];
  newMessage: string = '';
  messages$: Observable<ChatMessage[]>;
  private messagesSubscription: Subscription | null = null;

  constructor(
    private route: ActivatedRoute,
    private firebase: FirebaseService,
    private chatService: ChatService,
    private cdr: ChangeDetectorRef,
  ) {
    this.messages$ = this.chatService.messages$;
  }

  async ngOnInit(): Promise<void> {
    const groupId = this.route.snapshot.paramMap.get('id');
    if (!groupId) return;

    this.group = await this.firebase.getGroup(groupId);
    this.sessions = await this.firebase.getSessions(groupId);
    this.memberNames = await this.getNamesById(this.group?.members ?? []);
    this.cdr.detectChanges();

    const canAccess = await this.chatService.canAccessGroupChat(groupId);
    if (canAccess) {
      this.chatService.joinGroupChat(groupId);
      this.cdr.detectChanges();
    } else {
      console.warn('User does not have access to this group chat');
    }
  }

  ngAfterViewInit(): void {
    this.messagesSubscription = this.messages$.subscribe(() => {
      requestAnimationFrame(() => this.scrollChatToBottom());
    });
  }

  async sendMessage(): Promise<void> {
    if (!this.newMessage.trim()) return;

    try {
      const sent = this.newMessage;
      this.newMessage = '';
      await this.chatService.sendMessage(sent);
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  }

  scheduleSession(): void {}

  ngOnDestroy(): void {
    // Leave the chat room when component is destroyed
    this.chatService.leaveGroupChat();
    this.messagesSubscription?.unsubscribe();
  }

  private scrollChatToBottom(): void {
    if (!this.messagesContainer?.nativeElement) {
      return;
    }

    const element = this.messagesContainer.nativeElement;
    element.scrollTop = element.scrollHeight;
  }

  private async getNamesById(
    memberUids: string[] = [],
  ): Promise<Array<{ uid: string; name: string }>> {
    if (!memberUids?.length) {
      return [];
    }

    const members = await Promise.all(
      memberUids.map(async (uid) => {
        const user = await this.firebase.getUser(uid);
        return {
          uid,
          name: user?.name || user?.email || uid,
        };
      }),
    );

    return members;
  }

  getMessageDate(sentAt: any): Date | null {
    if (sentAt && typeof sentAt.toDate === 'function') {
      return sentAt.toDate();
    }
    return null;
  }
}
