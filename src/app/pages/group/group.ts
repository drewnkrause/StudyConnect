import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { FirebaseService } from '../../services/firebase';

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
  private unsubscribeMessages: any;

  constructor(
    private route: ActivatedRoute,
    private firebase: FirebaseService,
  ) {}

  async ngOnInit(): Promise<void> {
    const groupId = this.route.snapshot.paramMap.get('id');
    if (!groupId) return;

    // Loads group data and sessions
    this.group = await this.firebase.getGroup(groupId);
    this.group.sessions = await this.firebase.getSessions(groupId);
    this.group.messages = [];

    // Listens for real-time messages
    this.unsubscribeMessages = this.firebase.listenToMessages(groupId, (messages) => {
      this.group.messages = messages;
    });
  }

  async sendMessage(): Promise<void> {
    if (!this.newMessage.trim()) return;
    const groupId = this.route.snapshot.paramMap.get('id');
    const user = this.firebase.getCurrentUser();

    await this.firebase.sendMessage(groupId!, {
      text: this.newMessage,
      senderName: user?.displayName || user?.email || 'Anonymous',
      senderId: user?.uid,
    });

    this.newMessage = '';
  }

  scheduleSession(): void {
  }

  ngOnDestroy(): void {
    if (this.unsubscribeMessages) {
      this.unsubscribeMessages();
    }
  }
}
