import { VirtualFile, Workspace } from '../shared/types';

export class VirtualFileSystem {
  private workspaces: Map<string, Workspace> = new Map();
  private currentWorkspaceId: string | null = null;

  public createWorkspace(name: string): Workspace {
    const id = `workspace-${Date.now()}`;
    const workspace: Workspace = {
      id,
      name,
      files: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    this.workspaces.set(id, workspace);
    return workspace;
  }

  public getWorkspace(id: string): Workspace | undefined {
    return this.workspaces.get(id);
  }

  public setCurrentWorkspace(id: string): void {
    if (this.workspaces.has(id)) {
      this.currentWorkspaceId = id;
    }
  }

  public getCurrentWorkspace(): Workspace | null {
    if (!this.currentWorkspaceId) {
      return null;
    }
    return this.workspaces.get(this.currentWorkspaceId) || null;
  }

  public createFile(
    workspaceId: string,
    uri: string,
    content: string = '',
    language: string = 'javascript'
  ): VirtualFile {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      throw new Error(`Workspace ${workspaceId} not found`);
    }

    const file: VirtualFile = {
      uri: this.normalizeUri(uri, workspaceId),
      content,
      language,
      modified: false,
    };

    workspace.files.push(file);
    workspace.updatedAt = Date.now();
    return file;
  }

  public getFile(workspaceId: string, uri: string): VirtualFile | undefined {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      return undefined;
    }

    const normalizedUri = this.normalizeUri(uri, workspaceId);
    return workspace.files.find((f) => f.uri === normalizedUri);
  }

  public updateFile(workspaceId: string, uri: string, content: string): void {
    const file = this.getFile(workspaceId, uri);
    if (file) {
      file.content = content;
      file.modified = true;
      const workspace = this.workspaces.get(workspaceId);
      if (workspace) {
        workspace.updatedAt = Date.now();
      }
    }
  }

  public deleteFile(workspaceId: string, uri: string): void {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      return;
    }

    const normalizedUri = this.normalizeUri(uri, workspaceId);
    workspace.files = workspace.files.filter((f) => f.uri !== normalizedUri);
    workspace.updatedAt = Date.now();
  }

  public listFiles(workspaceId: string): VirtualFile[] {
    const workspace = this.workspaces.get(workspaceId);
    if (!workspace) {
      return [];
    }
    return [...workspace.files];
  }

  private normalizeUri(uri: string, workspaceId: string): string {
    if (uri.startsWith('inmemory://')) {
      return uri;
    }
    return `inmemory://${workspaceId}/${uri}`;
  }

  public getAllWorkspaces(): Workspace[] {
    return Array.from(this.workspaces.values());
  }
}
