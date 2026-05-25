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
import { usePermission } from '../../../auth/usePermission';
import CustomerProblemModal from './CustomerProblemModal';
import { Button } from '../../../components/common/Button';
import { exportToExcel } from '../services/CustomerProblemsExportService';
import { useI18n } from '../../../i18n/I18nProvider';

const ZMIND_BASE_URL = 'https://zmind.whaletv.com/issues/';

const getStatusColor = (s: string) => {
  const m: Record<string, string> = { '开放': 'bg-red-100 text-red-800', '进行中': 'bg-yellow-100 text-yellow-800', '已解决': 'bg-green-100 text-green-800' };
  return m[s] || 'bg-gray-100 text-gray-800';
};

/**
 * 问题追踪页面
 * 上半屏：客户问题  下半屏：QA问题
 * 客户问题可关联QA问题（追责时间轴）
 */
const CustomerProblemsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { formatDateTime, t } = useI18n();
  const [searchParams] = useSearchParams();
  const permission = usePermission();
  const {
    customerItems, qaItems, loading, error, filters,
    customerPagination, qaPagination,
  } = useSelector((state: RootState) => state.customerProblems);
  const currentProject = useSelector((state: RootState) => state.project.currentProject);
  const currentWorkspace = useSelector((state: RootState) => state.project.currentWorkspace);

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
      workspaceId: currentWorkspace,
    }));
    dispatch(fetchQaProblems({
      ...params,
      page: qaPagination.page,
      pageSize: qaPagination.pageSize,
      workspaceId: currentWorkspace,
    }));
  }, [dispatch, filters, customerPagination.page, customerPagination.pageSize,
      qaPagination.page, qaPagination.pageSize, currentProject, currentWorkspace]);

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

  const handleBatchStatusChange = async (ids: string[], status: string) => {
    for (const id of ids) {
      try {
        dispatch({ type: 'customerProblems/updateProblemLocal', payload: { id, status } });
      } catch { /* ignore */ }
    }
    // Call API for each
    const { apiUpdateProblem } = await import('../../../services/CustomerProblemApiClient');
    for (const id of ids) {
      try { await apiUpdateProblem(id, { status } as any); } catch { /* ignore */ }
    }
    // Reload
    const params = { ...filters, projectGroup: currentProject };
    dispatch(fetchCustomerProblems({ ...params, page: customerPagination.page, pageSize: customerPagination.pageSize, workspaceId: currentWorkspace }));
    dispatch(fetchQaProblems({ ...params, page: qaPagination.page, pageSize: qaPagination.pageSize, workspaceId: currentWorkspace }));
  };

  // 统计数据
  const allProblems = [...customerItems, ...qaItems];
  const statsOpen = allProblems.filter((p) => p.status === '开放').length;
  const statsInProgress = allProblems.filter((p) => p.status === '进行中').length;
  const statsResolved = allProblems.filter((p) => p.status === '已解决').length;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="w-full mx-auto">
        {/* 页面标题 */}
        <div className="mb-4">
          <h1 className="text-3xl font-bold text-gray-900">问题追踪</h1>
          <p className="text-gray-600 mt-1">管理客户问题和QA问题，支持关联追责</p>
        </div>

        {/* 统计摘要 */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          <div className="bg-white rounded-lg border border-gray-200 px-4 py-3">
            <p className="text-xs text-gray-500">总问题数</p>
            <p className="text-2xl font-bold text-gray-900 mt-0.5">{customerPagination.total + qaPagination.total}</p>
          </div>
          <div className="bg-white rounded-lg border border-red-100 px-4 py-3">
            <p className="text-xs text-gray-500">开放</p>
            <p className="text-2xl font-bold text-red-600 mt-0.5">{statsOpen}</p>
          </div>
          <div className="bg-white rounded-lg border border-yellow-100 px-4 py-3">
            <p className="text-xs text-gray-500">进行中</p>
            <p className="text-2xl font-bold text-yellow-600 mt-0.5">{statsInProgress}</p>
          </div>
          <div className="bg-white rounded-lg border border-green-100 px-4 py-3">
            <p className="text-xs text-gray-500">已解决</p>
            <p className="text-2xl font-bold text-green-600 mt-0.5">{statsResolved}</p>
          </div>
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
              <Button onClick={() => openModal('customer')} variant="primary" size="sm"
                disabled={!permission.canEditProblems}
                title={!permission.canEditProblems ? '无权限，请登录或联系管理员' : undefined}>
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
            onBatchStatusChange={handleBatchStatusChange}
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
              <Button onClick={() => openModal('qa')} variant="primary" size="sm"
                disabled={!permission.canEditProblems}
                title={!permission.canEditProblems ? '无权限，请登录或联系管理员' : undefined}>
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
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 p-6 animate-in">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-bold text-gray-900">追责时间轴</h3>
                  <p className="text-xs text-gray-500 mt-0.5">问题关联链路和时间节点</p>
                </div>
                <button onClick={() => setTimelineTarget(null)} className="text-gray-400 hover:text-gray-600 transition">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="space-y-0 relative">
                <div className="absolute left-[11px] top-3 bottom-3 w-0.5 bg-gray-200"></div>
                {(() => {
                  const getTime = (item: any) => item.issueCreatedAt ? new Date(item.issueCreatedAt).getTime() : item.createdAt;
                  const formatTime = (item: any) => item.issueCreatedAt ? formatDateTime(item.issueCreatedAt) : formatDateTime(item.createdAt);
                  const nodes: { type: string; item: any; time: number; color: string; icon: string }[] = [];
                  nodes.push({ type: '客户问题', item: timelineTarget, time: getTime(timelineTarget), color: 'bg-blue-500', icon: '🐛' });
                  (timelineTarget.linkedQaProblems || []).forEach((qaId: string) => {
                    const qa = qaItems.find((q) => q.id === qaId);
                    if (qa) nodes.push({ type: 'QA问题', item: qa, time: getTime(qa), color: 'bg-purple-500', icon: '🔍' });
                  });
                  nodes.sort((a, b) => a.time - b.time);

                  return nodes.map((node, idx) => (
                    <div key={node.item.id || idx} className="flex gap-3 relative pl-1 pb-5 last:pb-0">
                      <div className="flex-shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs z-10 bg-white border-2 border-gray-200">
                        {node.icon}
                      </div>
                      <div className="flex-1 min-w-0 bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium text-white ${node.color}`}>{node.type}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(node.item.status)}`}>{node.item.status}</span>
                        </div>
                        <p className="text-sm text-gray-900 break-words">{node.item.description}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                          <span>{formatTime(node.item)}</span>
                          {node.item.issueCreatedAt && <span className="text-cyan-600">PR时间</span>}
                          {node.item.issueId && (
                            <a href={`${ZMIND_BASE_URL}${node.item.issueId}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">PR#{node.item.issueId}</a>
                          )}
                          {node.item.classification && <span>{node.item.classification}</span>}
                        </div>
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
