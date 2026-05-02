import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { FirebaseService } from '../../services/firebase';
import { AuthService } from '../../services/auth';
import { ChatService } from '../../services/chat';
import { ChatMessage } from '../../models/message';
import { Group as GroupModel } from '../../models/group';
import { UserAccount } from '../../models/user';
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
  memberAccounts: UserAccount[] = [];
  memberItems: Array<{ uid: string; label: string; initials: string }> = [];
  currentUserId: string | null = null;
  isOwner = false;
  isMember = false;
  editMode = false;
  editTitle = '';
  editCourseId = '';
  editDescription = '';
  editType: 'student' | 'professor' = 'student';
  editIsPrivate = false;
  inviteEmail = '';
  inviteError = '';
  inviteSuccess = '';
  joinError = '';
  newMessage: string = '';
  messages$: Observable<ChatMessage[]>;

  constructor(
    private route: ActivatedRoute,
    private firebase: FirebaseService,
    private auth: AuthService,
    private chatService: ChatService,
  ) {
    this.messages$ = this.chatService.messages$;
  }

  async ngOnInit(): Promise<void> {
    const groupId = this.route.snapshot.paramMap.get('id');
    if (!groupId) return;

    const currentUser = this.auth.currentUser$();
    this.currentUserId = currentUser?.uid ?? null;

    this.group = await this.firebase.getGroup(groupId);
    this.sessions = await this.firebase.getSessions(groupId);

    if (this.group) {
      this.isOwner = currentUser?.uid === this.group.ownerId;
      this.isMember = currentUser ? this.group.members.includes(currentUser.uid) : false;
      this.setupEditableFields();
    }

    if (this.group?.members?.length) {
      try {
        this.memberAccounts = await this.firebase.getUsersByIds(this.group.members);
      } catch (error) {
        console.error('Could not load group member profiles:', error);
      }

      this.memberItems = this.memberAccounts.map((member) => ({
        uid: member.uid,
        label: member.name || member.email || member.uid,
        initials: (member.name || member.email || member.uid).charAt(0).toUpperCase(),
      }));
    }

    if (!this.memberItems.length && this.group?.members?.length) {
      this.memberItems = this.group.members.map((memberId) => ({
        uid: memberId,
        label: memberId,
        initials: memberId.charAt(0).toUpperCase(),
      }));
    }

    const canAccess = await this.chatService.canAccessGroupChat(groupId);
    if (canAccess) {
      this.chatService.joinGroupChat(groupId);
    } else {
      console.warn('User does not have access to this group chat');
    }
  }

  setupEditableFields(): void {
    if (!this.group) {
      return;
    }

    this.editTitle = this.group.title;
    this.editCourseId = this.group.courseId;
    this.editDescription = this.group.description;
    this.editType = this.group.type;
    this.editIsPrivate = this.group.isPrivate;
  }

  async saveGroupUpdates(): Promise<void> {
    if (!this.group) {
      return;
    }

    try {
      await this.firebase.updateGroup(this.group.id, {
        title: this.editTitle.trim(),
        courseId: this.editCourseId.trim(),
        description: this.editDescription.trim(),
        type: this.editType,
        isPrivate: this.editIsPrivate,
      });

      this.group = await this.firebase.getGroup(this.group.id);
      this.setupEditableFields();
      this.editMode = false;
    } catch (error: any) {
      console.error('Failed to update group:', error);
    }
  }

  async inviteMemberByEmail(): Promise<void> {
    if (!this.group || !this.isOwner || !this.inviteEmail.trim()) {
      this.inviteError = 'Enter a valid email address to invite.';
      return;
    }

    this.inviteError = '';
    this.inviteSuccess = '';

    try {
      const result = await this.firebase.inviteUserToGroup(this.group.id, this.inviteEmail.trim().toLowerCase());
      this.inviteSuccess = result.invitedUserId
        ? 'User added to the group successfully.'
        : 'Invitation saved. The user will join once they sign in with that email.';
      this.inviteEmail = '';
    } catch (error: any) {
      this.inviteError = error?.message || 'Unable to send invitation. Please try again.';
    }
  }

  async joinGroup(): Promise<void> {
    if (!this.group) {
      return;
    }

    const currentUser = this.auth.currentUser$();
    if (!currentUser) {
      this.joinError = 'You must be logged in to join this group.';
      return;
    }

    try {
      await this.firebase.joinGroup(this.group.id, currentUser.uid);
      this.isMember = true;
      this.group = await this.firebase.getGroup(this.group.id);
      if (this.group?.members?.length) {
        this.memberAccounts = await this.firebase.getUsersByIds(this.group.members);
        this.memberItems = this.memberAccounts.map((member) => ({
          uid: member.uid,
          label: member.name || member.email || member.uid,
          initials: (member.name || member.email || member.uid).charAt(0).toUpperCase(),
        }));
      }
      await this.chatService.joinGroupChat(this.group!.id);
    } catch (error: any) {
      this.joinError = error?.message || 'Unable to join the group.';
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
