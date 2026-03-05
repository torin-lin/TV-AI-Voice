import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../store';
import {
  fetchCustomerProblems,
  fetchQaProblems,
  deleteProblem,
  setFilters,
  setCustomerPagination,
  setQaPagination,
} from '../store/customerProblemsSlice';
import { CustomerProblem } from '../../../types/database';
import CustomerProblemsTable from './CustomerProblemsTable';
import CustomerProblemFilters from './CustomerProblemFilters';
import CustomerProblemModal from './CustomerProblemModal';
import { Button } from '../../../components/common/Button';
import { exportToExcel } from '../services/CustomerProblemsExportService';

const ZMIND_BASE_URL = 'https://zmind.whaletv.com/issues/';

/**
 * 问题追踪页面
 * 上半屏：客户问题  下半屏：QA问题
 * 客户问题可关联QA问题（追责时间轴）
 */
const CustomerProblemsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const {
    customerItems, qaItems, loading, error, filters,
    customerPagination, qaPagination,
  } = useSelector((state: RootState) => state.customerProblems);
  const currentProject = useSelector((state: RootState) => state.project.currentProject);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'customer' | 'qa'>('customer');
  const [editingProblem, setEditingProblem] = useState<CustomerProblem | null>(null);
  const [timelineTarget, setTimelineTarget] = useState<CustomerProblem | null>(null);

  // 加载数据
  useEffect(() => {
    const params = {
      ...filters,
      projectGroup: currentProject,
    };
    dispatch(fetchCustomerProblems({
      ...params,
      page: customerPagination.page,
      pageSize: customerPagination.pageSize,
    }));
    dispatch(fetchQaProblems({
      ...params,
      page: qaPagination.page,
      pageSize: qaPagination.pageSize,
    }));
  }, [dispatch, filters, customerPagination.page, customerPagination.pageSize,
      qaPagination.page, qaPagination.pageSize, currentProject]);

  const openModal = (type: 'customer' | 'qa', problem?: CustomerProblem) => {
    setModalType(type);
    setEditingProblem(problem || null);
    setModalOpen(true);
  };

  const handleDelete = (id: string, type: 'customer' | 'qa') => {
    if (window.confirm('确定要删除这条记录吗？')) {
      dispatch(deleteProblem({ id, problemType: type }));
    }
  };

  const handleFiltersChange = (newFilters: any) => {
    dispatch(setFilters(newFilters));
    dispatch(setCustomerPagination({ page: 1, pageSize: customerPagination.pageSize }));
    dispatch(setQaPagination({ page: 1, pageSize: qaPagination.pageSize }));
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="w-full mx-auto">
        {/* 页面标题 */}
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-gray-900">问题追踪</h1>
          <p className="text-gray-600 mt-1">管理客户问题和QA问题，支持关联追责</p>
        </div>

        {/* 筛选器（共用） */}
        <CustomerProblemFilters filters={filters} onFiltersChange={handleFiltersChange} />

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>
        )}

        {/* ========== 上半屏：客户问题 ========== */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <span className="w-1 h-5 bg-blue-500 rounded-full inline-block"></span>
              客户问题
              <span className="text-sm font-normal text-gray-500">({customerPagination.total})</span>
            </h2>
            <div className="flex gap-2">
              <Button onClick={() => openModal('customer')} variant="primary" size="sm">
                + 添加客户问题
              </Button>
              <Button onClick={() => exportToExcel(customerItems, '客户问题.xlsx')} variant="secondary" size="sm"
                disabled={customerItems.length === 0}>导出</Button>
            </div>
          </div>
          <CustomerProblemsTable
            problems={customerItems}
            loading={loading}
            pagination={customerPagination}
            onEdit={(p) => openModal('customer', p)}
            onDelete={(id) => handleDelete(id, 'customer')}
            onPaginationChange={(page, pageSize) => dispatch(setCustomerPagination({ page, pageSize }))}
            qaItems={qaItems}
            onViewTimeline={(p) => setTimelineTarget(p)}
          />
        </div>

        {/* ========== 下半屏：QA问题 ========== */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <span className="w-1 h-5 bg-purple-500 rounded-full inline-block"></span>
              QA问题
              <span className="text-sm font-normal text-gray-500">({qaPagination.total})</span>
            </h2>
            <div className="flex gap-2">
              <Button onClick={() => openModal('qa')} variant="primary" size="sm">
                + 添加QA问题
              </Button>
              <Button onClick={() => exportToExcel(qaItems, 'QA问题.xlsx')} variant="secondary" size="sm"
                disabled={qaItems.length === 0}>导出</Button>
            </div>
          </div>
          <CustomerProblemsTable
            problems={qaItems}
            loading={loading}
            pagination={qaPagination}
            onEdit={(p) => openModal('qa', p)}
            onDelete={(id) => handleDelete(id, 'qa')}
            onPaginationChange={(page, pageSize) => dispatch(setQaPagination({ page, pageSize }))}
          />
        </div>

        {/* 追责时间轴弹窗 */}
        {timelineTarget && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-lg max-w-lg w-full mx-4 p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-gray-900">追责时间轴</h3>
                <button onClick={() => setTimelineTarget(null)} className="text-gray-500 hover:text-gray-700 text-2xl">×</button>
              </div>
              <div className="space-y-4">
                {/* 客户问题 */}
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                    <div className="w-0.5 flex-1 bg-gray-200"></div>
                  </div>
                  <div className="pb-4">
                    <p className="text-sm font-medium text-gray-900">客户问题</p>
                    <p className="text-sm text-gray-600">{timelineTarget.description}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(timelineTarget.createdAt).toLocaleString('zh-CN')}
                      {timelineTarget.issueId && (
                        <> · <a href={`${ZMIND_BASE_URL}${timelineTarget.issueId}`} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">PR#{timelineTarget.issueId}</a></>
                      )}
                    </p>
                  </div>
                </div>
                {/* 关联的QA问题 */}
                {(timelineTarget.linkedQaProblems || []).map((qaId) => {
                  const qa = qaItems.find((q) => q.id === qaId);
                  if (!qa) return null;
                  return (
                    <div key={qaId} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                        <div className="w-0.5 flex-1 bg-gray-200"></div>
                      </div>
                      <div className="pb-4">
                        <p className="text-sm font-medium text-gray-900">QA问题</p>
                        <p className="text-sm text-gray-600">{qa.description}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {new Date(qa.createdAt).toLocaleString('zh-CN')}
                          {qa.issueId && (
                            <> · <a href={`${ZMIND_BASE_URL}${qa.issueId}`} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">PR#{qa.issueId}</a></>
                          )}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 模态框 */}
        {modalOpen && (
          <CustomerProblemModal
            problem={editingProblem}
            problemType={modalType}
            onClose={() => { setModalOpen(false); setEditingProblem(null); }}
          />
        )}
      </div>
    </div>
  );
};

export default CustomerProblemsPage;
