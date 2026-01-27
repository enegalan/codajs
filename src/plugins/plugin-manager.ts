import { BasePlugin, PluginContext, HookContext } from './base-plugin';

export class PluginManager {
  private plugins: Map<string, BasePlugin> = new Map();
  private pluginContexts: Map<string, PluginContext> = new Map();

  public async loadPlugin(pluginPath: string, context: PluginContext): Promise<void> {
    try {
      // In a real implementation, this would load the plugin module
      // For now, this is a placeholder
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const pluginModule = require(pluginPath);
      const plugin: BasePlugin = new pluginModule.default();

      await plugin.onActivate(context);
      this.plugins.set(plugin.name, plugin);
      this.pluginContexts.set(plugin.name, context);
    } catch (error) {
      console.error(`Failed to load plugin from ${pluginPath}:`, error);
      throw error;
    }
  }

  public async unloadPlugin(pluginName: string): Promise<void> {
    const plugin = this.plugins.get(pluginName);
    if (plugin) {
      await plugin.onDeactivate();
      this.plugins.delete(pluginName);
      this.pluginContexts.delete(pluginName);
    }
  }

  public async callHook(hookName: string, context: HookContext): Promise<any[]> {
    const results: any[] = [];

    for (const plugin of this.plugins.values()) {
      const handler = (plugin as any)[hookName];
      if (handler && typeof handler === 'function') {
        try {
          const result = await handler.call(plugin, context);
          if (result !== undefined) {
            results.push(result);
          }
        } catch (error) {
          console.error(`Error in plugin ${plugin.name} hook ${hookName}:`, error);
        }
      }
    }

    return results;
  }

  public getPlugin(name: string): BasePlugin | undefined {
    return this.plugins.get(name);
  }

  public getAllPlugins(): BasePlugin[] {
    return Array.from(this.plugins.values());
  }
}
