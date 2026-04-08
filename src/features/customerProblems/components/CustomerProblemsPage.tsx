import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useSearchParams } from 'react-router-dom';
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
import { useI18n } from '../../../i18n/I18nProvider';

const ZMIND_BASE_URL = 'https://zmind.whaletv.com/issues/';

/**
 * 问题追踪页面
 * 上半屏：客户问题  下半屏：QA问题
 * 客户问题可关联QA问题（追责时间轴）
 */
const CustomerProblemsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { formatDateTime, t } = useI18n();
  const [searchParams] = useSearchParams();
  const {
    customerItems, qaItems, loading, error, filters,
    customerPagination, qaPagination,
  } = useSelector((state: RootState) => state.customerProblems);
  const currentProject = useSelector((state: RootState) => state.project.currentProject);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'customer' | 'qa'>('customer');
  const [editingProblem, setEditingProblem] = useState<CustomerProblem | null>(null);
  const [timelineTarget, setTimelineTarget] = useState<CustomerProblem | null>(null);
  const keywordFromUrl = searchParams.get('keyword') || undefined;

  // 加载数据
  useEffect(() => {
    if (keywordFromUrl && filters.keyword !== keywordFromUrl) {
      dispatch(setFilters({ ...filters, keyword: keywordFromUrl }));
      dispatch(setCustomerPagination({ page: 1, pageSize: customerPagination.pageSize }));
      dispatch(setQaPagination({ page: 1, pageSize: qaPagination.pageSize }));
    }
  }, [customerPagination.pageSize, dispatch, filters, keywordFromUrl, qaPagination.pageSize]);

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
    if (window.confirm(t('确定要删除这条记录吗？'))) {
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
                {(() => {
                  // 收集所有时间轴节点并按时间排序
                  const getTime = (item: any) => {
                    if (item.issueCreatedAt) return new Date(item.issueCreatedAt).getTime();
                    return item.createdAt;
                  };
                  const formatTime = (item: any) => {
                    if (item.issueCreatedAt) return formatDateTime(item.issueCreatedAt);
                    return formatDateTime(item.createdAt);
                  };
                  const nodes: { type: string; item: any; time: number; color: string }[] = [];
                  nodes.push({ type: '客户问题', item: timelineTarget, time: getTime(timelineTarget), color: 'bg-blue-500' });
                  (timelineTarget.linkedQaProblems || []).forEach((qaId: string) => {
                    const qa = qaItems.find((q) => q.id === qaId);
                    if (qa) nodes.push({ type: 'QA问题', item: qa, time: getTime(qa), color: 'bg-purple-500' });
                  });
                  nodes.sort((a, b) => a.time - b.time);

                  return nodes.map((node, idx) => (
                    <div key={node.item.id || idx} className="flex gap-3">
                      <div className="flex flex-col items-center">
                        <div className={`w-3 h-3 ${node.color} rounded-full`}></div>
                        {idx < nodes.length - 1 && <div className="w-0.5 flex-1 bg-gray-200"></div>}
                      </div>
                      <div className="pb-4">
                        <p className="text-sm font-medium text-gray-900">{node.type}</p>
                        <p className="text-sm text-gray-600">{node.item.description}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          {formatTime(node.item)}
                          {node.item.issueCreatedAt && <span className="ml-1 text-cyan-600">PR时间</span>}
                          {node.item.issueId && (
                            <> · <a href={`${ZMIND_BASE_URL}${node.item.issueId}`} target="_blank" rel="noopener noreferrer" className="text-blue-700 hover:underline">PR#{node.item.issueId}</a></>
                          )}
                        </p>
                      </div>
                    </div>
                  ));
                })()}
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
