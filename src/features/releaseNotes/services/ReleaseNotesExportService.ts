import { ReleaseNote } from '../../../types/database';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

/**
 * Release Note 导出服务
 * 提供导出为 Excel 和 CSV 的功能
 */

// 获取修改类型的显示名称
const getChangeTypeLabel = (type: string): string => {
  return type || '未指定';
};

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
export const exportToExcel = (records: ReleaseNote[], filename: string) => {
  try {
    // 准备数据
    const data = records.map((record) => ({
      版本号: record.version,
      分支: record.branch,
      作者: record.author,
      项目类型: getProjectTypeLabel(record.projectType),
      修改类型: getChangeTypeLabel(record.changeType),
      严重程度: record.severity,
      RD冒烟测试: record.rdSmokeStatus || '未测试',
      回归风险: record.regressionRisk,
      破坏性变更: record.breakingChanges ? '是' : '否',
      迁移类型: record.migrationType || '无',
      修改内容: record.changeDescription,
      受影响的模块: record.affectedModules?.join('; ') || '',
      受影响的功能: record.affectedFeatures?.join('; ') || '',
      测试备注: record.testingNotes || '',
      APK文件: record.apkFileName || '',
      创建时间: new Date(record.createdAt).toLocaleString('zh-CN'),
      更新时间: new Date(record.updatedAt).toLocaleString('zh-CN'),
    }));

    // 创建工作簿
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Release Notes');

    // 设置列宽
    const columnWidths = [
      { wch: 12 }, // 版本号
      { wch: 15 }, // 分支
      { wch: 12 }, // 作者
      { wch: 15 }, // 项目类型
      { wch: 10 }, // 修改类型
      { wch: 10 }, // 严重程度
      { wch: 12 }, // RD冒烟测试
      { wch: 10 }, // 回归风险
      { wch: 10 }, // 破坏性变更
      { wch: 12 }, // 迁移类型
      { wch: 25 }, // 修改内容
      { wch: 20 }, // 受影响的模块
      { wch: 20 }, // 受影响的功能
      { wch: 25 }, // 测试备注
      { wch: 20 }, // APK文件
      { wch: 18 }, // 创建时间
      { wch: 18 }, // 更新时间
    ];
    worksheet['!cols'] = columnWidths;

    // 导出文件
    XLSX.writeFile(workbook, filename);
  } catch (error) {
    console.error('导出 Excel 失败:', error);
    throw new Error('导出 Excel 失败');
  }
};

/**
 * 导出为 CSV 文件
 */
export const exportToCSV = (records: ReleaseNote[], filename: string) => {
  try {
    // 准备数据
    const data = records.map((record) => ({
      版本号: record.version,
      分支: record.branch,
      作者: record.author,
      项目类型: getProjectTypeLabel(record.projectType),
      修改类型: getChangeTypeLabel(record.changeType),
      严重程度: record.severity,
      RD冒烟测试: record.rdSmokeStatus || '未测试',
      回归风险: record.regressionRisk,
      破坏性变更: record.breakingChanges ? '是' : '否',
      迁移类型: record.migrationType || '无',
      修改内容: record.changeDescription,
      受影响的模块: record.affectedModules?.join('; ') || '',
      受影响的功能: record.affectedFeatures?.join('; ') || '',
      测试备注: record.testingNotes || '',
      APK文件: record.apkFileName || '',
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
