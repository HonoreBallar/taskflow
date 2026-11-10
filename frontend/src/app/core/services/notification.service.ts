import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { environment } from '../../../environments/environment';
import { AppNotification } from '../models';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';

/**
 * Store de notifications (Signals) + connexion temps réel STOMP/SockJS.
 * Le serveur pousse les notifications sur /user/queue/notifications.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private readonly http = inject(HttpClient);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly router = inject(Router);
  private readonly api = `${environment.apiUrl}/notifications`;

  private client: Client | null = null;

  private readonly _items = signal<AppNotification[]>([]);
  private readonly _connected = signal(false);

  readonly items = this._items.asReadonly();
  readonly connected = this._connected.asReadonly();
  readonly unreadCount = computed(() => this._items().filter((n) => !n.read).length);

  load(): void {
    this.http
      .get<AppNotification[]>(this.api, { params: { limit: 50 } })
      .subscribe((list) => this._items.set(list));
  }

  connect(): void {
    if (!this.auth.isAuthenticated() || this.client?.active) return;

    // La connexion est authentifiée par le cookie de session, envoyé par le navigateur lors de la poignée de main
    this.client = new Client({
      webSocketFactory: () => new SockJS(environment.wsUrl),
      reconnectDelay: 5000,
      heartbeatIncoming: 10000,
      heartbeatOutgoing: 10000,
      debug: () => undefined,
    });

    this.client.onConnect = () => {
      this._connected.set(true);
      this.client?.subscribe('/user/queue/notifications', (msg: IMessage) => this.onMessage(msg));
    };
    this.client.onWebSocketClose = () => this._connected.set(false);
    this.client.onStompError = () => this._connected.set(false);
    this.client.activate();
  }

  disconnect(): void {
    this.client?.deactivate();
    this.client = null;
    this._connected.set(false);
    this._items.set([]);
  }

  markRead(n: AppNotification): void {
    if (n.read) return;
    this._items.update((list) => list.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
    this.http.patch<void>(`${this.api}/${n.id}/read`, {}).subscribe();
  }

  markAllRead(): void {
    this._items.update((list) => list.map((x) => ({ ...x, read: true })));
    this.http.patch<void>(`${this.api}/read-all`, {}).subscribe();
  }

  open(n: AppNotification): void {
    this.markRead(n);
    if (n.link) this.router.navigateByUrl(n.link);
  }

  private onMessage(msg: IMessage): void {
    const notification = JSON.parse(msg.body) as AppNotification;
    this._items.update((list) => [notification, ...list]);
    this.toast.info(notification.message);
  }
}
