import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';

class WebSocketService {
  private client: Client | null = null;
  private connected = false;

  connect(onMessageReceived: (message: any) => void): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket = new SockJS('http://localhost:8081/ws');

      this.client = new Client({
        webSocketFactory: () => socket,
        onConnect: () => {
          console.log('WebSocket connected');
          this.connected = true;

          // Subscribe to monitoring events
          this.client?.subscribe('/topic/monitoring', (message) => {
            const event = JSON.parse(message.body);
            onMessageReceived(event);
          });

          resolve();
        },
        onStompError: (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        },
      });

      this.client.activate();
    });
  }

  sendMonitoringEvent(eventData: {
    sessionId: string;
    candidateEmail: string;
    eventType: string;
    description: string;
    metadata?: string;
  }) {
    if (this.connected && this.client) {
      this.client.publish({
        destination: '/app/monitoring-event',
        body: JSON.stringify(eventData),
      });
    }
  }

  disconnect() {
    if (this.client) {
      this.client.deactivate();
      this.connected = false;
    }
  }
}

export const websocketService = new WebSocketService();
