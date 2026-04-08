import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../store';
import {
  fetchReleaseNotes,
  deleteReleaseNote,
  setFilters,
  setPagination,
  setSorting,
} from '../store/releaseNotesSlice';
import { ReleaseNote } from '../../../types/database';
import ReleaseNotesTable from './ReleaseNotesTable';
import ReleaseNoteFilters from './ReleaseNoteFilters';
import ReleaseNoteModal from './ReleaseNoteModal';
import { Button } from '../../../components/common/Button';
import { exportToExcel, exportToCSV } from '../services/ReleaseNotesExportService';

/**
 * Release Note 页面
 * 主页面容器，管理 Release Note 的 CRUD 操作
 */
const ReleaseNotesPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    items,
    loading,
    error,
    filters,
    pagination,
    sorting,
  } = useSelector((state: RootState) => state.releaseNotes);
  const currentProject = useSelector((state: RootState) => state.project.currentProject);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ReleaseNote | null>(null);
  const [defaultParentVersion, setDefaultParentVersion] = useState('');
  

  // 初始化加载数据
  useEffect(() => {
    dispatch(
      fetchReleaseNotes({
        filters: { ...filters, projectGroup: currentProject },
        pagination,
      })
    );
  }, [dispatch, filters, pagination, currentProject]);

  // 处理添加新记录
  const handleAddRecord = () => {
    setEditingRecord(null);
    setDefaultParentVersion('');
    setIsModalOpen(true);
  };

  // 处理添加子版本
  const handleAddChild = (parentVersion: string, _projectType?: string) => {
    setEditingRecord(null);
    setDefaultParentVersion(parentVersion);
    setIsModalOpen(true);
  };

  // 处理编辑记录
  const handleEditRecord = (record: ReleaseNote) => {
    setEditingRecord(record);
    setIsModalOpen(true);
  };

  // 处理删除记录
  const handleDeleteRecord = (id: string) => {
    if (window.confirm('确定要删除这条 Release Note 吗？')) {
      dispatch(deleteReleaseNote(id));
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
    exportToExcel(items, 'Release Notes.xlsx');
  };

  // 处理导出 CSV
  const handleExportCSV = () => {
    exportToCSV(items, 'Release Notes.csv');
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="w-full mx-auto">
        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Release Note (RD)</h1>
          <p className="text-gray-600 mt-2">研发代码修改记录管理</p>
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
        <ReleaseNoteFilters
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
        <ReleaseNotesTable
          records={items}
          loading={loading}
          pagination={pagination}
          sorting={sorting}
          onEdit={handleEditRecord}
          onDelete={handleDeleteRecord}
          onPaginationChange={handlePaginationChange}
          onSortingChange={handleSortingChange}
          onAddChild={handleAddChild}
        />

        {/* 模态框 */}
        {isModalOpen && (
          <ReleaseNoteModal
            record={editingRecord}
            defaultParentVersion={defaultParentVersion}
            onClose={() => { setIsModalOpen(false); setDefaultParentVersion(''); }}
          />
        )}
      </div>
    </div>
  );
};

export default ReleaseNotesPage;
