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
import { AuthService } from '../../services/auth';
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
  currentUserId: string = '';
  memberNames: Array<{ uid: string; name: string }> = [];
  sessions: any[] = [];
  resources: any[] = [];
  newMessage: string = '';
  messages$: Observable<ChatMessage[]>;
  private messagesSubscription: Subscription | null = null;

  // Session/resource form state
  showSessionForm: boolean = false;
  sessionTopic: string = '';
  sessionLocation: string = '';
  sessionStartTime: string = '';

  // Resource form state
  showResourceForm: boolean = false;
  resourceTitle: string = '';
  resourceUrl: string = '';
  resourceType: 'file' | 'link' = 'link';

  constructor(
    private route: ActivatedRoute,
    private firebase: FirebaseService,
    private auth: AuthService,
    private chatService: ChatService,
    private cdr: ChangeDetectorRef,
  ) {
    this.messages$ = this.chatService.messages$;
  }

  async ngOnInit(): Promise<void> {
    const groupId = this.route.snapshot.paramMap.get('id');
    if (!groupId) return;

    const user = this.auth.currentUser$();
    if (user) {
      this.currentUserId = user.uid;
    }

    this.group = await this.firebase.getGroup(groupId);
    this.sessions = await this.firebase.getSessions(groupId);
    this.resources = await this.firebase.getResources(groupId);
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

  scheduleSession(): void {
    if (!this.canEditSessions()) return;
    this.showSessionForm = !this.showSessionForm;
  }

  async createSession(): Promise<void> {
    if (!this.group || !this.sessionTopic.trim() || !this.sessionStartTime) {
      return;
    }

    try {
      await this.firebase.addSession(this.group.id, {
        topic: this.sessionTopic.trim(),
        locaiton: this.sessionLocation.trim(),
        startTime: new Date(this.sessionStartTime),
      });

      this.sessionTopic = '';
      this.sessionLocation = '';
      this.sessionStartTime = '';
      this.showSessionForm = false;

      this.sessions = await this.firebase.getSessions(this.group.id);
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error creating session:', error);
    }
  }

  async deleteSession(sessionId: string): Promise<void> {
    if (!this.canEditSessions() || !this.group) return;

    try {
      await this.firebase.deleteSession(this.group.id, sessionId);
      this.sessions = await this.firebase.getSessions(this.group.id);
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  }

  async addResource(): Promise<void> {
    if (!this.group || !this.resourceTitle.trim() || !this.resourceUrl.trim()) {
      return;
    }

    try {
      await this.firebase.addResource(this.group.id, {
        title: this.resourceTitle.trim(),
        url: this.resourceUrl.trim(),
        type: this.resourceType,
        uploadedBy: this.currentUserId,
      });

      this.resourceTitle = '';
      this.resourceUrl = '';
      this.resourceType = 'link';
      this.showResourceForm = false;

      this.resources = await this.firebase.getResources(this.group.id);
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error adding resource:', error);
    }
  }

  async deleteResource(resourceId: string): Promise<void> {
    if (!this.canEditResources() || !this.group) return;

    try {
      await this.firebase.deleteResource(this.group.id, resourceId);
      this.resources = await this.firebase.getResources(this.group.id);
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Error deleting resource:', error);
    }
  }

  canEditSessions(): boolean {
    if (!this.group) return false;
    if (this.group.type === 'student') return true;
    return this.group.ownerId === this.currentUserId;
  }

  canEditResources(): boolean {
    if (!this.group) return false;
    if (this.group.type === 'student') return true;
    return this.group.ownerId === this.currentUserId;
  }

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
