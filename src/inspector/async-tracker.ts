export interface AsyncOperation {
  id: string;
  type: 'promise' | 'setTimeout' | 'setInterval' | 'setImmediate';
  createdAt: number;
  resolvedAt?: number;
  rejectedAt?: number;
  error?: string;
  parentId?: string;
}

export class AsyncTracker {
  private operations: Map<string, AsyncOperation> = new Map();
  private operationCounter = 0;

  public trackPromise(promise: Promise<any>, parentId?: string): string {
    const id = `promise-${++this.operationCounter}`;
    const operation: AsyncOperation = {
      id,
      type: 'promise',
      createdAt: Date.now(),
      parentId,
    };

    this.operations.set(id, operation);

    promise
      .then(() => {
        const op = this.operations.get(id);
        if (op) {
          op.resolvedAt = Date.now();
        }
      })
      .catch((error) => {
        const op = this.operations.get(id);
        if (op) {
          op.rejectedAt = Date.now();
          op.error = error.message || String(error);
        }
      });

    return id;
  }

  public trackTimeout(callback: () => void, delay: number, parentId?: string): string {
    const id = `timeout-${++this.operationCounter}`;
    const operation: AsyncOperation = {
      id,
      type: 'setTimeout',
      createdAt: Date.now(),
      parentId,
    };

    this.operations.set(id, operation);

    setTimeout(() => {
      const op = this.operations.get(id);
      if (op) {
        op.resolvedAt = Date.now();
      }
      callback();
    }, delay);

    return id;
  }

  public trackInterval(callback: () => void, delay: number, parentId?: string): string {
    const id = `interval-${++this.operationCounter}`;
    const operation: AsyncOperation = {
      id,
      type: 'setInterval',
      createdAt: Date.now(),
      parentId,
    };

    this.operations.set(id, operation);

    const intervalId = setInterval(() => {
      callback();
    }, delay);

    // Store interval ID for cleanup
    (operation as any).intervalId = intervalId;

    return id;
  }

  public getOperations(): AsyncOperation[] {
    return Array.from(this.operations.values());
  }

  public getOperation(id: string): AsyncOperation | undefined {
    return this.operations.get(id);
  }

  public getOperationsByType(type: AsyncOperation['type']): AsyncOperation[] {
    return Array.from(this.operations.values()).filter((op) => op.type === type);
  }

  public getActiveOperations(): AsyncOperation[] {
    return Array.from(this.operations.values()).filter((op) => !op.resolvedAt && !op.rejectedAt);
  }

  public clear(): void {
    // Clear intervals
    for (const op of this.operations.values()) {
      if (op.type === 'setInterval' && (op as any).intervalId) {
        clearInterval((op as any).intervalId);
      }
    }
    this.operations.clear();
    this.operationCounter = 0;
  }
}
