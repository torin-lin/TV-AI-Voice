import { CustomerProblem } from '../../../types/database';
import * as XLSX from 'xlsx';
import Papa from 'papaparse';

/**
 * 客户问题/QA问题导出服务
 */

const mapProblemToRow = (p: CustomerProblem) => ({
  类型: p.problemType === 'customer' ? '客户问题' : 'QA问题',
  PR号: p.issueId || '-',
  固件版本: p.firmwareVersion || '-',
  问题描述: p.description,
  分类: p.classification || '未分类',
  状态: p.status,
  项目类型: p.projectType || '-',
  备注: p.notes || '',
  创建时间: new Date(p.createdAt).toLocaleString('zh-CN'),
  更新时间: new Date(p.updatedAt).toLocaleString('zh-CN'),
});

export const exportToExcel = (problems: CustomerProblem[], filename: string) => {
  try {
    const data = problems.map(mapProblemToRow);
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, '问题记录');
    worksheet['!cols'] = [
      { wch: 10 }, { wch: 10 }, { wch: 20 }, { wch: 30 },
      { wch: 10 }, { wch: 10 }, { wch: 12 }, { wch: 20 },
      { wch: 18 }, { wch: 18 },
    ];
    XLSX.writeFile(workbook, filename);
  } catch (error) {
    console.error('导出 Excel 失败:', error);
    throw new Error('导出 Excel 失败');
  }
};

export const exportToCSV = (problems: CustomerProblem[], filename: string) => {
  try {
    const data = problems.map(mapProblemToRow);
    const csv = Papa.unparse(data, { header: true } as any);
    const bom = '\uFEFF';
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.setAttribute('href', URL.createObjectURL(blob));
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
