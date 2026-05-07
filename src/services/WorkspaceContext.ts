export const DEFAULT_WORKSPACE_ID = 'AI Voice';

export function getCurrentWorkspaceId(): string {
  if (typeof window === 'undefined') return DEFAULT_WORKSPACE_ID;
  return localStorage.getItem('current_workspace_id') || DEFAULT_WORKSPACE_ID;
}

export function appendWorkspaceParam(params: URLSearchParams): void {
  params.set('workspaceId', getCurrentWorkspaceId());
}

export function withWorkspaceBody<T extends Record<string, any>>(data: T): T & { workspaceId: string } {
  return {
    ...data,
    workspaceId: data.workspaceId || getCurrentWorkspaceId(),
  };
}
