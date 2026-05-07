export const DEFAULT_WORKSPACE_ID = 'AI Voice';

export function getWorkspaceId(req: any): string {
  return String(req.query?.workspaceId || req.body?.workspaceId || DEFAULT_WORKSPACE_ID).trim() || DEFAULT_WORKSPACE_ID;
}

export function recordInWorkspace(record: any, workspaceId: string): boolean {
  return String(record?.workspaceId || DEFAULT_WORKSPACE_ID) === workspaceId;
}

export function recordInProjectGroup(record: any, projectGroup?: string): boolean {
  if (!projectGroup || projectGroup === '全部') return true;
  const projectTypeMap: Record<string, string> = {
    'TV AI Voice': 'TV',
    'Projector AI Voice': 'Projector',
    'STB AI Voice': 'STB',
  };
  const expectedProjectType = projectTypeMap[projectGroup] || projectGroup;
  return String(record?.projectType || '') === expectedProjectType;
}
