type WsEventType = 'new_message' | 'agent_typing' | 'agent_status' | 'presence' | 'typing' | 'connected' | 'disconnected';
type WsHandler = (data: unknown) => void;

class WebSocketManager {
  private ws: WebSocket | null = null;
  private token: string | null = null;
  private handlers = new Map<WsEventType, Set<WsHandler>>();
  private subscribedChannels = new Set<string>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private intentionalClose = false;

  connect(token: string) {
    this.token = token;
    this.intentionalClose = false;
    this.doConnect();
  }

  disconnect() {
    this.intentionalClose = true;
    this.clearReconnect();
    this.ws?.close();
    this.ws = null;
  }

  private doConnect() {
    if (!this.token) return;
    const url = `${process.env.NEXT_PUBLIC_WS_URL}?token=${this.token}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectDelay = 1000;
      this.emit('connected', {});
      // Re-subscribe to channels after reconnect
      for (const channelId of this.subscribedChannels) {
        this.send({ type: 'subscribe', channelId });
      }
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data as string);
        if (data.type) {
          this.emit(data.type as WsEventType, data);
        }
      } catch {
        // ignore malformed messages
      }
    };

    this.ws.onclose = () => {
      this.emit('disconnected', {});
      if (!this.intentionalClose) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = () => {
      this.ws?.close();
    };
  }

  private scheduleReconnect() {
    this.clearReconnect();
    this.reconnectTimer = setTimeout(() => {
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
      this.doConnect();
    }, this.reconnectDelay);
  }

  private clearReconnect() {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  subscribe(channelId: string) {
    this.subscribedChannels.add(channelId);
    this.send({ type: 'subscribe', channelId });
  }

  unsubscribe(channelId: string) {
    this.subscribedChannels.delete(channelId);
    this.send({ type: 'unsubscribe', channelId });
  }

  sendTyping(channelId: string) {
    this.send({ type: 'typing', channelId });
  }

  private send(data: Record<string, unknown>) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  on(event: WsEventType, handler: WsHandler) {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
  }

  off(event: WsEventType, handler: WsHandler) {
    this.handlers.get(event)?.delete(handler);
  }

  private emit(event: WsEventType, data: unknown) {
    this.handlers.get(event)?.forEach((h) => h(data));
  }
}

export const wsManager = new WebSocketManager();
