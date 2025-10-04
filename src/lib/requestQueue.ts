import EventEmitter from 'events';

/**
 * Request queue for managing API calls under rate limits
 */

interface QueuedRequest {
  id: string;
  execute: () => Promise<any>;
  resolve: (value: any) => void;
  reject: (error: any) => void;
  timestamp: number;
  priority: number;
}

export class RequestQueue extends EventEmitter {
  private queue: QueuedRequest[] = [];
  private processing = false;
  private readonly maxQueueSize: number;
  private readonly requestInterval: number; // ms between requests
  private lastRequestTime = 0;

  constructor(maxQueueSize: number = 50, requestInterval: number = 6500) { // ~9 requests per minute
    super();
    this.maxQueueSize = maxQueueSize;
    this.requestInterval = requestInterval;
  }

  /**
   * Add a request to the queue
   */
  async enqueue<T>(
    execute: () => Promise<T>, 
    priority: number = 0,
    timeout: number = 300000 // 5 minutes default timeout
  ): Promise<T> {
    if (this.queue.length >= this.maxQueueSize) {
      throw new Error('Request queue is full. Please try again later.');
    }

    return new Promise<T>((resolve, reject) => {
      const id = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const request: QueuedRequest = {
        id,
        execute,
        resolve,
        reject,
        timestamp: Date.now(),
        priority
      };

      // Insert based on priority (higher priority first)
      const insertIndex = this.queue.findIndex(item => item.priority < priority);
      if (insertIndex === -1) {
        this.queue.push(request);
      } else {
        this.queue.splice(insertIndex, 0, request);
      }

      // Set timeout
      const timeoutId = setTimeout(() => {
        this.removeRequest(id);
        reject(new Error('Request timeout'));
      }, timeout);

      // Clear timeout when request is processed
      const originalResolve = request.resolve;
      const originalReject = request.reject;
      
      request.resolve = (value) => {
        clearTimeout(timeoutId);
        originalResolve(value);
      };
      
      request.reject = (error) => {
        clearTimeout(timeoutId);
        originalReject(error);
      };

      this.emit('enqueued', { id, queueLength: this.queue.length });
      this.processQueue();
    });
  }

  /**
   * Process the queue
   */
  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0) {
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      
      // Wait if we need to respect rate limiting
      if (timeSinceLastRequest < this.requestInterval) {
        const waitTime = this.requestInterval - timeSinceLastRequest;
        await this.sleep(waitTime);
      }

      const request = this.queue.shift();
      if (!request) break;

      try {
        this.emit('processing', { id: request.id, queueLength: this.queue.length });
        
        this.lastRequestTime = Date.now();
        const result = await request.execute();
        request.resolve(result);
        
        this.emit('completed', { id: request.id, queueLength: this.queue.length });
      } catch (error) {
        this.emit('failed', { id: request.id, error, queueLength: this.queue.length });
        request.reject(error);
      }
    }

    this.processing = false;
  }

  /**
   * Remove a request from the queue
   */
  private removeRequest(id: string): boolean {
    const index = this.queue.findIndex(req => req.id === id);
    if (index !== -1) {
      this.queue.splice(index, 1);
      this.emit('removed', { id, queueLength: this.queue.length });
      return true;
    }
    return false;
  }

  /**
   * Get queue status
   */
  getStatus() {
    return {
      queueLength: this.queue.length,
      processing: this.processing,
      maxQueueSize: this.maxQueueSize,
      requestInterval: this.requestInterval,
      lastRequestTime: this.lastRequestTime
    };
  }

  /**
   * Clear the queue
   */
  clear(): void {
    const requests = this.queue.splice(0);
    requests.forEach(req => {
      req.reject(new Error('Queue cleared'));
    });
    this.emit('cleared', { clearedCount: requests.length });
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Global queue instance for Gemini requests
export const geminiQueue = new RequestQueue(50, 6500); // ~9 requests per minute

// Log queue events for debugging
geminiQueue.on('enqueued', ({ id, queueLength }) => {
  console.log(`Request ${id} enqueued. Queue length: ${queueLength}`);
});

geminiQueue.on('processing', ({ id, queueLength }) => {
  console.log(`Processing request ${id}. Remaining in queue: ${queueLength}`);
});

geminiQueue.on('completed', ({ id, queueLength }) => {
  console.log(`Request ${id} completed. Remaining in queue: ${queueLength}`);
});

geminiQueue.on('failed', ({ id, error, queueLength }) => {
  console.log(`Request ${id} failed: ${error.message}. Remaining in queue: ${queueLength}`);
});