/**
 * 版本记录导出服务
 * 提供导出为 Excel 和 CSV 的功能
 */

import Papa from 'papaparse';
import { VersionRecord } from '../../../types/database';
import { exportRowsToExcel } from '../../../services/ExcelWorkbookService';

// 获取项目类型的显示名称
const getProjectTypeLabel = (type?: string): string => {
  switch (type) {
    case 'TV':
      return 'TV AI Voice';
    case 'Projector':
      return 'Projector AI Voice';
    case 'STB':
      return 'STB AI Voice';
    default:
      return '未指定';
  }
};

/**
 * 导出为 Excel 文件
 */
export const exportToExcel = async (records: VersionRecord[], filename: string) => {
  try {
    // 准备数据
    const data = records.map((record) => ({
      关联RD版本: record.versionNumber,
      版本号: record.versionNumber,
      固件版本号: record.firmwareVersion || '',
      关联PR_CR: record.linkedIssues?.join('; ') || '',
      修改内容: record.changeDescription,
      项目类型: getProjectTypeLabel(record.projectType),
      修改模块: record.modifiedModules?.join(', ') || '',
      风险等级: record.riskLevel,
      语音功能回归: record.voiceRegressionResult,
      系统集成回归: record.systemRegressionResult,
      测试周期: record.testCycle || '',
      原型来源: record.prototypeSource || '',
      测试结果Excel: record.testResultFileName || '',
      提前介入原因: record.qaEarlyInterventionReason || '',
      介入责任人: record.qaEarlyInterventionOwner || '',
      备注: record.notes || '',
      创建时间: new Date(record.createdAt).toLocaleString('zh-CN'),
      更新时间: new Date(record.updatedAt).toLocaleString('zh-CN'),
    }));

    await exportRowsToExcel(data, filename, 'QA版本记录', [14, 12, 18, 15, 20, 10, 20, 10, 14, 16, 20, 25, 24, 28, 14, 20, 18, 18]);
  } catch (error) {
    console.error('导出 Excel 失败:', error);
    throw new Error('导出 Excel 失败');
  }
};

/**
 * 导出为 CSV 文件
 */
export const exportToCSV = (records: VersionRecord[], filename: string) => {
  try {
    // 准备数据
    const data = records.map((record) => ({
      关联RD版本: record.versionNumber,
      版本号: record.versionNumber,
      固件版本号: record.firmwareVersion || '',
      关联PR_CR: record.linkedIssues?.join('; ') || '',
      修改内容: record.changeDescription,
      项目类型: getProjectTypeLabel(record.projectType),
      修改模块: record.modifiedModules?.join('; ') || '',
      风险等级: record.riskLevel,
      语音功能回归: record.voiceRegressionResult,
      系统集成回归: record.systemRegressionResult,
      测试周期: record.testCycle || '',
      原型来源: record.prototypeSource || '',
      测试结果Excel: record.testResultFileName || '',
      提前介入原因: record.qaEarlyInterventionReason || '',
      介入责任人: record.qaEarlyInterventionOwner || '',
      备注: record.notes || '',
      创建时间: new Date(record.createdAt).toLocaleString('zh-CN'),
      更新时间: new Date(record.updatedAt).toLocaleString('zh-CN'),
    }));

    // 转换为 CSV
    const csv = Papa.unparse(data, {
      header: true,
      encoding: 'UTF-8',
    } as any);

    // 添加 BOM 以支持中文
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });

    // 创建下载链接
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('导出 CSV 失败:', error);
    throw new Error('导出 CSV 失败');
  }
};
