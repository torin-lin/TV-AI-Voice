import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../store';
import {
  fetchCustomerProblems,
  deleteCustomerProblem,
  setFilters,
  setPagination,
  setSorting,
} from '../store/customerProblemsSlice';
import { CustomerProblem } from '../../../types/database';
import CustomerProblemsTable from './CustomerProblemsTable';
import CustomerProblemFilters from './CustomerProblemFilters';
import CustomerProblemModal from './CustomerProblemModal';
import { Button } from '../../../components/common/Button';
import { exportToExcel, exportToCSV } from '../services/CustomerProblemsExportService';

/**
 * 客户问题追踪页面
 * 主页面容器，管理客户问题的 CRUD 操作
 */
const CustomerProblemsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    items,
    loading,
    error,
    filters,
    pagination,
    sorting,
  } = useSelector((state: RootState) => state.customerProblems);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProblem, setEditingProblem] = useState<CustomerProblem | null>(null);

  // 初始化加载数据
  useEffect(() => {
    dispatch(
      fetchCustomerProblems({
        filters,
        pagination,
        sorting,
      })
    );
  }, [dispatch, filters, pagination, sorting]);

  // 处理添加新问题
  const handleAddProblem = () => {
    setEditingProblem(null);
    setIsModalOpen(true);
  };

  // 处理编辑问题
  const handleEditProblem = (problem: CustomerProblem) => {
    setEditingProblem(problem);
    setIsModalOpen(true);
  };

  // 处理删除问题
  const handleDeleteProblem = (id: string) => {
    if (window.confirm('确定要删除这条问题记录吗？')) {
      dispatch(deleteCustomerProblem(id));
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
    exportToExcel(items, '客户问题记录.xlsx');
  };

  // 处理导出 CSV
  const handleExportCSV = () => {
    exportToCSV(items, '客户问题记录.csv');
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">客户问题追踪</h1>
          <p className="text-gray-600 mt-2">管理和追踪所有客户报告的问题</p>
        </div>

        {/* 工具栏 */}
        <div className="mb-6 flex gap-3 flex-wrap">
          <Button
            onClick={handleAddProblem}
            variant="primary"
            className="flex items-center gap-2"
          >
            <span>+</span> 添加新问题
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
        <CustomerProblemFilters
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
        <CustomerProblemsTable
          problems={items}
          loading={loading}
          pagination={pagination}
          sorting={sorting}
          onEdit={handleEditProblem}
          onDelete={handleDeleteProblem}
          onPaginationChange={handlePaginationChange}
          onSortingChange={handleSortingChange}
        />

        {/* 模态框 */}
        {isModalOpen && (
          <CustomerProblemModal
            problem={editingProblem}
            onClose={() => setIsModalOpen(false)}
          />
        )}
      </div>
    </div>
  );
};

export default CustomerProblemsPage;
