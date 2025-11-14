class EventBatcher {
  private events: any[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly BATCH_SIZE = 5;
  private readonly BATCH_TIMEOUT = 3000; // 3 seconds

  addEvent(event: any) {
    this.events.push({
      ...event,
      timestamp: new Date().toISOString()
    });

    // Flush immediately if batch is full
    if (this.events.length >= this.BATCH_SIZE) {
      this.flushEvents();
    } else if (!this.batchTimer) {
      // Set timer for partial batch
      this.batchTimer = setTimeout(() => {
        this.flushEvents();
      }, this.BATCH_TIMEOUT);
    }
  }

  private async flushEvents() {
    if (this.events.length === 0) return;

    const eventsToSend = [...this.events];
    this.events = [];
    
    if (this.batchTimer) {
      clearTimeout(this.batchTimer);
      this.batchTimer = null;
    }

    try {
      const response = await fetch('http://localhost:8081/api/monitoring/batch-log-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ events: eventsToSend })
      });

      if (!response.ok) {
        console.error('Failed to send batch events:', response.statusText);
        // Re-add events to queue for retry
        this.events.unshift(...eventsToSend);
      } else {
        console.log(`Successfully sent batch of ${eventsToSend.length} events`);
      }
    } catch (error) {
      console.error('Error sending batch events:', error);
      // Re-add events to queue for retry
      this.events.unshift(...eventsToSend);
    }
  }

  // Force flush all pending events
  flush() {
    this.flushEvents();
  }
}

export const eventBatcher = new EventBatcher();