export const PROJECT_OPTIONS = [
  { value: 'TV', label: 'TV AI Voice', groupLabel: 'TV AI Voice' },
  { value: 'Projector', label: 'Projector AI Voice', groupLabel: 'Projector AI Voice' },
  { value: 'STB', label: 'STB AI Voice', groupLabel: 'STB AI Voice' },
] as const;

export const PROJECT_GROUP_OPTIONS = [
  { value: '全部', label: '全部' },
  ...PROJECT_OPTIONS.map((option) => ({ value: option.groupLabel, label: option.groupLabel })),
] as const;

export const RISK_LEVEL_OPTIONS = [
  { value: '低', label: '低' },
  { value: '中', label: '中' },
  { value: '高', label: '高' },
] as const;

export const TEST_RESULT_OPTIONS = [
  { value: '未测试', label: '未测试' },
  { value: '通过', label: '通过' },
  { value: '失败', label: '失败' },
] as const;

export const VERSION_STATUS_OPTIONS = [
  { value: '待测试', label: '待测试' },
  { value: '测试中', label: '测试中' },
  { value: '阻塞', label: '阻塞' },
  { value: '待结论', label: '待结论' },
  { value: '可发布', label: '可发布' },
  { value: '已发布', label: '已发布' },
] as const;

export const CUSTOMER_PROBLEM_STATUS_OPTIONS = [
  { value: '开放', label: '开放' },
  { value: '进行中', label: '进行中' },
  { value: '已解决', label: '已解决' },
] as const;

export const VERSION_ISSUE_STATUS_OPTIONS = [
  { value: '待处理', label: '待处理' },
  { value: '处理中', label: '处理中' },
  { value: '已解决', label: '已解决' },
  { value: '已关闭', label: '已关闭' },
] as const;

export const RELEASE_NOTE_CHANGE_TYPE_OPTIONS = [
  { value: '功能', label: '功能' },
  { value: '修复', label: '修复' },
  { value: '优化', label: '优化' },
  { value: '重构', label: '重构' },
  { value: '文档', label: '文档' },
] as const;

export const RELEASE_NOTE_SEVERITY_OPTIONS = [
  { value: '低', label: '低' },
  { value: '中', label: '中' },
  { value: '高', label: '高' },
  { value: '紧急', label: '紧急' },
] as const;

export const MIGRATION_TYPE_OPTIONS = [
  { value: '无', label: '无' },
  { value: '数据迁移', label: '数据迁移' },
  { value: '配置更新', label: '配置更新' },
  { value: '其他', label: '其他' },
] as const;

export const DEFAULT_MODULE_OPTIONS = ['录音', '蓝牙', 'ASR', 'NLU', '服务端', '网络', 'Android', 'UI', '数据库'] as const;
export const DEFAULT_PROBLEM_CLASSIFICATIONS = ['录音', '蓝牙', 'ASR', 'NLU', '服务端', '网络', 'Android'] as const;
export const DEFAULT_FEATURE_OPTIONS = ['语音识别', '语音合成', '自然语言理解', '数据同步', '性能优化', '安全性'] as const;

export const mapProjectGroupToType = (projectGroup?: string) => {
  const matched = PROJECT_OPTIONS.find((option) => option.groupLabel === projectGroup);
  return matched?.value;
};

export const mapProjectTypeToGroup = (projectType?: string) => {
  const matched = PROJECT_OPTIONS.find((option) => option.value === projectType);
  return matched?.groupLabel;
};
