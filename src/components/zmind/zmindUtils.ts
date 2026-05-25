/**
 * zmind 共享工具函数
 * 提取自 VersionIssueList.tsx，供两个入口复用
 */

import { ZmindProject } from '../../services/ZmindApiService';

/**
 * 将扁平项目列表构建为带层级的树形选项
 * 支持文本搜索过滤（匹配 name / identifier / parent.name）
 */
export function buildProjectTreeOptions(
  projects: ZmindProject[],
  searchText: string
): Array<ZmindProject & { depth: number }> {
  const normalizedSearch = searchText.trim().toLowerCase();
  const byParent = new Map<number | 'root', ZmindProject[]>();
  const byId = new Map(projects.map(project => [project.id, project]));

  for (const project of projects) {
    const parentId = project.parent?.id;
    const key = parentId && byId.has(parentId) ? parentId : 'root';
    const siblings = byParent.get(key) || [];
    siblings.push(project);
    byParent.set(key, siblings);
  }

  for (const siblings of byParent.values()) {
    siblings.sort((a, b) => a.name.localeCompare(b.name));
  }

  const flattened: Array<ZmindProject & { depth: number }> = [];
  const visit = (items: ZmindProject[], depth: number) => {
    for (const project of items) {
      const text = `${project.name} ${project.identifier || ''} ${project.parent?.name || ''}`.toLowerCase();
      if (!normalizedSearch || text.includes(normalizedSearch)) {
        flattened.push({ ...project, depth });
      }
      visit(byParent.get(project.id) || [], depth + 1);
    }
  };

  visit(byParent.get('root') || [], 0);
  return flattened;
}
