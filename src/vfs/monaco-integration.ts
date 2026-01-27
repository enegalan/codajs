import * as monaco from 'monaco-editor';
import { VirtualFileSystem } from './virtual-fs';
import { VirtualFile } from '../shared/types';

export class MonacoVFSIntegration {
  private vfs: VirtualFileSystem;
  private models: Map<string, monaco.editor.ITextModel> = new Map();

  constructor(vfs: VirtualFileSystem) {
    this.vfs = vfs;
    this.setupMonaco();
  }

  private setupMonaco(): void {
    // Enable eager model synchronization
    monaco.languages.typescript.javascriptDefaults.setEagerModelSync(true);
    monaco.languages.typescript.typescriptDefaults.setEagerModelSync(true);

    // Override code editor service for virtual URI resolution
    const codeEditorService = (monaco as any).editor.getCodeEditorService();
    const originalOpenCodeEditor = codeEditorService.openCodeEditor.bind(codeEditorService);

    codeEditorService.openCodeEditor = async (
      widget: any,
      resource: monaco.Uri,
      sideBySide?: boolean
    ) => {
      if (resource.scheme === 'inmemory') {
        // Handle virtual file navigation
        const workspaceId = resource.authority;
        const path = resource.path;
        const file = this.vfs.getFile(workspaceId, path);

        if (file) {
          const model = this.getOrCreateModel(file);
          if (model) {
            const editor = monaco.editor.getEditors().find((e) => e.getModel() === model);
            if (editor) {
              editor.focus();
              return Promise.resolve(true);
            }
          }
        }
      }

      return originalOpenCodeEditor(widget, resource, sideBySide);
    };
  }

  public registerWorkspace(workspaceId: string): void {
    const workspace = this.vfs.getWorkspace(workspaceId);
    if (!workspace) {
      return;
    }

    // Pre-register all files as Monaco models
    for (const file of workspace.files) {
      this.getOrCreateModel(file);
    }
  }

  public getOrCreateModel(file: VirtualFile): monaco.editor.ITextModel | null {
    if (this.models.has(file.uri)) {
      return this.models.get(file.uri)!;
    }

    const uri = monaco.Uri.parse(file.uri);
    const model = monaco.editor.createModel(file.content, file.language, uri);
    this.models.set(file.uri, model);

    // Sync changes back to VFS
    model.onDidChangeContent(() => {
      const workspaceId = uri.authority;
      const content = model.getValue();
      this.vfs.updateFile(workspaceId, uri.path, content);
    });

    return model;
  }

  public getModel(uri: string): monaco.editor.ITextModel | undefined {
    return this.models.get(uri);
  }

  public disposeModel(uri: string): void {
    const model = this.models.get(uri);
    if (model) {
      model.dispose();
      this.models.delete(uri);
    }
  }

  public disposeAll(): void {
    for (const model of this.models.values()) {
      model.dispose();
    }
    this.models.clear();
  }
}
