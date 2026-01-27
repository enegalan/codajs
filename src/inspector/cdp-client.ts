import WebSocket from 'ws';

export interface CDPMessage {
  id?: number;
  method?: string;
  params?: any;
  result?: any;
  error?: any;
}

export class CDPClient {
  private ws: WebSocket | null = null;
  private messageId = 0;
  private pendingRequests: Map<
    number,
    { resolve: (value: any) => void; reject: (error: any) => void }
  > = new Map();

  public async connect(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws = new WebSocket(url);

      this.ws.on('open', () => {
        resolve();
      });

      this.ws.on('message', (data: WebSocket.Data) => {
        try {
          const message: CDPMessage = JSON.parse(data.toString());
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse CDP message:', error);
        }
      });

      this.ws.on('error', (error) => {
        reject(error);
      });

      this.ws.on('close', () => {
        this.ws = null;
      });
    });
  }

  public async send(method: string, params?: any): Promise<any> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('CDP client not connected');
    }

    const id = ++this.messageId;
    const message: CDPMessage = {
      id,
      method,
      params,
    };

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(id, { resolve, reject });
      this.ws!.send(JSON.stringify(message));
    });
  }

  private handleMessage(message: CDPMessage): void {
    if (message.id !== undefined) {
      // Response to a request
      const pending = this.pendingRequests.get(message.id);
      if (pending) {
        this.pendingRequests.delete(message.id);
        if (message.error) {
          pending.reject(new Error(message.error.message || 'CDP error'));
        } else {
          pending.resolve(message.result);
        }
      }
    } else if (message.method) {
      // Event notification
      this.handleEvent(message.method, message.params);
    }
  }

  private handleEvent(method: string, params?: any): void {
    // Override in subclasses or use event emitter pattern
    console.log('CDP event:', method, params);
  }

  public async enableDebugger(): Promise<void> {
    await this.send('Debugger.enable');
  }

  public async evaluate(expression: string, contextId?: number): Promise<any> {
    const result = await this.send('Runtime.evaluate', {
      expression,
      contextId,
    });
    return result.result;
  }

  public async getProperties(objectId: string): Promise<any> {
    const result = await this.send('Runtime.getProperties', {
      objectId,
    });
    return result.result;
  }

  public disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.pendingRequests.clear();
  }
}
