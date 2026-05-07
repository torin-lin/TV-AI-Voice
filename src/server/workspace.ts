export const DEFAULT_WORKSPACE_ID = 'AI Voice';

export function getWorkspaceId(req: any): string {
  return String(req.query?.workspaceId || req.body?.workspaceId || DEFAULT_WORKSPACE_ID).trim() || DEFAULT_WORKSPACE_ID;
}

export function recordInWorkspace(record: any, workspaceId: string): boolean {
  return String(record?.workspaceId || DEFAULT_WORKSPACE_ID) === workspaceId;
}
