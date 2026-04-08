import { VersionStatus } from '../../types/database';

export const VERSION_STATUS_FLOW: Record<VersionStatus, VersionStatus[]> = {
  '待测试': ['待测试', '测试中', '阻塞'],
  '测试中': ['测试中', '阻塞', '待结论'],
  '阻塞': ['阻塞', '测试中', '待结论'],
  '待结论': ['待结论', '阻塞', '可发布'],
  '可发布': ['可发布', '已发布', '阻塞'],
  '已发布': ['已发布'],
};

export const getAllowedVersionStatuses = (currentStatus?: VersionStatus): VersionStatus[] => {
  return VERSION_STATUS_FLOW[currentStatus || '待测试'];
};

export const getVersionStatusClass = (status?: string) => {
  const mapping: Record<string, string> = {
    '待测试': 'bg-gray-100 text-gray-700',
    '测试中': 'bg-blue-100 text-blue-800',
    '阻塞': 'bg-red-100 text-red-800',
    '待结论': 'bg-amber-100 text-amber-800',
    '可发布': 'bg-emerald-100 text-emerald-800',
    '已发布': 'bg-violet-100 text-violet-800',
  };

  return mapping[status || ''] || 'bg-gray-100 text-gray-600';
};
