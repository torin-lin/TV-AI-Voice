import { VersionRecord } from '../../../types/database';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

/**
 * 版本记录导出服务
 * 提供导出为 Excel 和 CSV 的功能
 */

/**
 * 导出为 Excel 文件
 */
export const exportToExcel = (records: VersionRecord[], filename: string) => {
  try {
    // 准备数据
    const data = records.map((record) => ({
      版本号: record.versionNumber,
      修改内容: record.changeDescription,
      修改模块: record.modifiedModules?.join(', ') || '',
      风险等级: record.riskLevel,
      冒烟测试: record.smokeTestResult,
      语音回归: record.voiceRegressionResult,
      系统回归: record.systemRegressionResult,
      备注: record.notes || '',
      创建时间: new Date(record.createdAt).toLocaleString('zh-CN'),
      更新时间: new Date(record.updatedAt).toLocaleString('zh-CN'),
    }));

    // 创建工作簿
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '版本记录');

    // 设置列宽
    const columnWidths = [
      { wch: 12 }, // 版本号
      { wch: 20 }, // 修改内容
      { wch: 20 }, // 修改模块
      { wch: 10 }, // 风险等级
      { wch: 12 }, // 冒烟测试
      { wch: 12 }, // 语音回归
      { wch: 12 }, // 系统回归
      { wch: 20 }, // 备注
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
export const exportToCSV = (records: VersionRecord[], filename: string) => {
  try {
    // 准备数据
    const data = records.map((record) => ({
      版本号: record.versionNumber,
      修改内容: record.changeDescription,
      修改模块: record.modifiedModules?.join('; ') || '',
      风险等级: record.riskLevel,
      冒烟测试: record.smokeTestResult,
      语音回归: record.voiceRegressionResult,
      系统回归: record.systemRegressionResult,
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
