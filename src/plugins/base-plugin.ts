export interface PluginContext {
  workspaceId?: string;
  runtime?: string;
}

export interface HookContext {
  [key: string]: any;
}

export abstract class BasePlugin {
  public abstract name: string;
  public abstract version: string;

  public abstract onActivate(context: PluginContext): void | Promise<void>;
  public abstract onDeactivate(): void | Promise<void>;

  // Optional hook handlers - override in subclasses as needed
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public onRuntimeStart(context: HookContext): void | Promise<void> {}
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public onLogMessage(message: any, context: HookContext): any | Promise<any> {
    return message;
  }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  public onProvideCompletion(context: HookContext): any[] | Promise<any[]> {
    return [];
  }
}
