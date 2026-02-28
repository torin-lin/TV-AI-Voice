import { CustomerProblem } from '../../../types/database';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

/**
 * 客户问题导出服务
 * 提供导出为 Excel 和 CSV 的功能
 */

/**
 * 导出为 Excel 文件
 */
export const exportToExcel = (problems: CustomerProblem[], filename: string) => {
  try {
    // 准备数据
    const data = problems.map((problem) => ({
      问题描述: problem.description,
      分类: problem.classification || '未分类',
      置信度: problem.confidence ? `${(problem.confidence * 100).toFixed(0)}%` : '-',
      状态: problem.status,
      备注: problem.notes || '',
      创建时间: new Date(problem.createdAt).toLocaleString('zh-CN'),
      更新时间: new Date(problem.updatedAt).toLocaleString('zh-CN'),
    }));

    // 创建工作簿
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '问题记录');

    // 设置列宽
    const columnWidths = [
      { wch: 30 }, // 问题描述
      { wch: 12 }, // 分类
      { wch: 10 }, // 置信度
      { wch: 10 }, // 状态
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
export const exportToCSV = (problems: CustomerProblem[], filename: string) => {
  try {
    // 准备数据
    const data = problems.map((problem) => ({
      问题描述: problem.description,
      分类: problem.classification || '未分类',
      置信度: problem.confidence ? `${(problem.confidence * 100).toFixed(0)}%` : '-',
      状态: problem.status,
      备注: problem.notes || '',
      创建时间: new Date(problem.createdAt).toLocaleString('zh-CN'),
      更新时间: new Date(problem.updatedAt).toLocaleString('zh-CN'),
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
