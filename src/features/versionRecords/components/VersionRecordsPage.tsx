import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../store';
import {
  fetchVersionRecords,
  deleteVersionRecord,
  setFilters,
  setPagination,
  setSorting,
} from '../store/versionRecordsSlice';
import { VersionRecord } from '../../../types/database';
import VersionRecordsTable from './VersionRecordsTable';
import VersionRecordFilters from './VersionRecordFilters';
import VersionRecordModal from './VersionRecordModal';
import { Button } from '../../../components/common/Button';
import { exportToExcel, exportToCSV } from '../services/VersionRecordsExportService';
import { useI18n } from '../../../i18n/I18nProvider';

/**
 * 版本测试记录页面
 * 主页面容器，管理版本记录的 CRUD 操作
 */
const VersionRecordsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { t } = useI18n();
  const {
    items,
    loading,
    error,
    filters,
    pagination,
    sorting,
  } = useSelector((state: RootState) => state.versionRecords);
  const currentProject = useSelector((state: RootState) => state.project.currentProject);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<VersionRecord | null>(null);

  // 初始化加载数据
  useEffect(() => {
    dispatch(
      fetchVersionRecords({
        filters: { ...filters, projectGroup: currentProject },
        pagination,
      })
    );
  }, [dispatch, filters, pagination, currentProject]);

  // modal 关闭后重新加载
  const closeModalAndRefresh = () => {
    setIsModalOpen(false);
    dispatch(fetchVersionRecords({ filters: { ...filters, projectGroup: currentProject }, pagination }));
  };

  // 处理添加新记录
  const handleAddRecord = () => {
    setEditingRecord(null);
    setIsModalOpen(true);
  };

  // 处理编辑记录
  const handleEditRecord = (record: VersionRecord) => {
    setEditingRecord(record);
    setIsModalOpen(true);
  };

  // 处理删除记录
  const handleDeleteRecord = (id: string) => {
    if (window.confirm(t('确定要删除这条记录吗？'))) {
      dispatch(deleteVersionRecord(id));
    }
  };

  // 处理筛选变化
  const handleFiltersChange = (newFilters: any) => {
    dispatch(setFilters(newFilters));
    dispatch(setPagination({ page: 1, pageSize: pagination.pageSize }));
  };

  // 处理分页变化
  const handlePaginationChange = (page: number, pageSize: number) => {
    dispatch(setPagination({ page, pageSize }));
  };

  // 处理排序变化
  const handleSortingChange = (field: string, order: 'asc' | 'desc') => {
    dispatch(setSorting({ field, order }));
  };

  // 处理导出 Excel
  const handleExportExcel = () => {
    exportToExcel(items, 'QA版本记录.xlsx');
  };

  // 处理导出 CSV
  const handleExportCSV = () => {
    exportToCSV(items, 'QA版本记录.csv');
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="w-full mx-auto">
        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">QA版本记录</h1>
          <p className="text-gray-600 mt-2">管理和追踪所有版本的测试记录</p>
        </div>

        {/* 工具栏 */}
        <div className="mb-6 flex gap-3 flex-wrap">
          <Button
            onClick={handleAddRecord}
            variant="primary"
            className="flex items-center gap-2"
          >
            <span>+</span> 添加新记录
          </Button>
          <Button
            onClick={handleExportExcel}
            variant="secondary"
            disabled={items.length === 0}
          >
            导出 Excel
          </Button>
          <Button
            onClick={handleExportCSV}
            variant="secondary"
            disabled={items.length === 0}
          >
            导出 CSV
          </Button>
        </div>

        {/* 筛选器 */}
        <VersionRecordFilters
          filters={filters}
          onFiltersChange={handleFiltersChange}
        />

        {/* 错误提示 */}
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
            {error}
          </div>
        )}

        {/* 数据表格 */}
        <VersionRecordsTable
          records={items}
          loading={loading}
          pagination={pagination}
          sorting={sorting}
          onEdit={handleEditRecord}
          onDelete={handleDeleteRecord}
          onPaginationChange={handlePaginationChange}
          onSortingChange={handleSortingChange}
        />

        {/* 模态框 */}
        {isModalOpen && (
          <VersionRecordModal
            record={editingRecord}
            onClose={closeModalAndRefresh}
          />
        )}
      </div>
    </div>
  );
};

export default VersionRecordsPage;
