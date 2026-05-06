import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { AppDispatch, RootState } from '../../../store';
import {
  fetchTestCases, fetchKBStats, fetchCategories,
  addTestCase, bulkImport, deleteTestCase, editTestCase,
  generateRecommendation, clearRecommendation,
} from '../store/recommendationsSlice';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { apiGetReleaseVersions, apiAIAssist, ReleaseVersion } from '../../../services/KnowledgeBaseApiClient';
import RecommendationResult from './RecommendationResult';
import { useI18n } from '../../../i18n/I18nProvider';

type Tab = 'knowledge' | 'recommend' | 'assistant';

const PRIORITY_COLORS: Record<string, string> = {
  L1: 'bg-red-100 text-red-700',
  L2: 'bg-orange-100 text-orange-700',
  L3: 'bg-yellow-100 text-yellow-700',
  L4: 'bg-green-100 text-green-700',
  '高': 'bg-red-100 text-red-700',
  '中': 'bg-yellow-100 text-yellow-700',
  '低': 'bg-green-100 text-green-700',
};
const PRIORITY_OPTIONS = ['L1', 'L2', 'L3', 'L4'];
const PT_COLORS: Record<string, string> = {
  TV: 'bg-yellow-100 text-yellow-800',
  Projector: 'bg-purple-100 text-purple-800',
  STB: 'bg-green-100 text-green-800',
};
const PROJECT_MAP: Record<string, string> = { 'TV AI Voice': 'TV', 'Projector AI Voice': 'Projector', 'STB AI Voice': 'STB' };

const RecommendationsPage: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const { formatDate } = useI18n();
  const { testCases, stats, categories, currentRecommendation, loading, importLoading, recommendLoading, error } = useSelector((s: RootState) => s.recommendations);
  const currentProject = useSelector((s: RootState) => s.project.currentProject);
  const currentPT = currentProject === '全部' ? undefined : PROJECT_MAP[currentProject];

  const [tab, setTab] = useState<Tab>('knowledge');
  const [searchKeyword, setSearchKeyword] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterProject, setFilterProject] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [editingCase, setEditingCase] = useState<any>(null);

  const [releaseVersions, setReleaseVersions] = useState<ReleaseVersion[]>([]);
  const [selectedVersion, setSelectedVersion] = useState<ReleaseVersion | null>(null);
  const [recForm, setRecForm] = useState({ versionNumber: '', changeDescription: '', riskLevel: '中', modules: '' });
  const [useAI, setUseAI] = useState(false);
  const [assistQuery, setAssistQuery] = useState('');
  const [assistResult, setAssistResult] = useState('');
  const [assistLoading, setAssistLoading] = useState(false);
  const [assistFile, setAssistFile] = useState<{ name: string; content: string } | null>(null);

  useEffect(() => {
    dispatch(fetchKBStats());
    dispatch(fetchCategories());
  }, [dispatch]);

  // 项目切换时重新加载用例和版本
  useEffect(() => {
    const pt = filterProject || currentPT;
    dispatch(fetchTestCases({ keyword: searchKeyword, category: filterCategory, projectType: pt }));
    loadReleaseVersions();
  }, [currentProject, filterProject]);

  const loadReleaseVersions = async () => {
    try {
      const versions = await apiGetReleaseVersions(currentPT);
      setReleaseVersions(versions);
    } catch { /* ignore */ }
  };

  const handleSelectVersion = (ver: ReleaseVersion) => {
    setSelectedVersion(ver);
    setRecForm({
      versionNumber: ver.version,
      changeDescription: ver.changeDescription,
      modules: ver.modules.join('、'),
      riskLevel: ver.regressionRisk || ver.severity || '中',
    });
  };

  const handleSearch = (overrideCategory?: string) => {
    const pt = filterProject || currentPT;
    dispatch(fetchTestCases({ keyword: searchKeyword, category: overrideCategory ?? filterCategory, projectType: pt }));
  };

  const handleDelete = (id: string) => {
    if (window.confirm('确定删除该用例？')) dispatch(deleteTestCase(id));
  };

  const handleEdit = (tc: any) => {
    setEditingCase(tc);
  };

  const handleSaveEdit = (data: any) => {
    if (editingCase?.id) {
      dispatch(editTestCase({ id: editingCase.id, data }));
      setEditingCase(null);
    }
  };

  const handleRecommend = () => {
    if (!recForm.versionNumber) return;
    const pt = selectedVersion?.projectType || currentPT;
    dispatch(generateRecommendation({
      versionNumber: recForm.versionNumber,
      changeDescription: recForm.changeDescription,
      modules: recForm.modules.split(/[,，、\s]+/).filter(Boolean),
      riskLevel: recForm.riskLevel,
      projectType: pt,
      useAI,
      apiKey: useAI ? localStorage.getItem('azure_openai_api_key') || '' : undefined,
      endpoint: useAI ? localStorage.getItem('azure_openai_endpoint') || '' : undefined,
      modelName: useAI ? localStorage.getItem('azure_openai_model') || '' : undefined,
    }));
  };

  const handleAssist = async () => {
    if (!assistQuery.trim() && !assistFile) return;
    const apiKey = localStorage.getItem('azure_openai_api_key') || '';
    const endpoint = localStorage.getItem('azure_openai_endpoint') || '';
    const modelName = localStorage.getItem('azure_openai_model') || '';
    if (!apiKey || !endpoint) { setAssistResult('❌ 请先在设置页面配置 Azure OpenAI'); return; }
    setAssistLoading(true);
    setAssistResult('正在分析中，请稍候...');
    try {
      // 拼接用户输入 + 文件内容
      let fullQuery = assistQuery.trim();
      if (assistFile) {
        // 截断文件内容，防止超出 token 限制（约 6000 字符 ≈ 3000 token）
        const maxFileChars = 6000;
        const fileContent = assistFile.content.length > maxFileChars
          ? assistFile.content.slice(0, maxFileChars) + `\n...(文件内容过长，已截取前 ${maxFileChars} 字符)`
          : assistFile.content;
        fullQuery = `${fullQuery}\n\n--- 附件: ${assistFile.name} ---\n${fileContent}`;
      }
      const res = await apiAIAssist({ query: fullQuery, apiKey, endpoint, modelName, projectType: currentPT });
      setAssistResult(res.response || '⚠️ AI 返回了空内容');
    } catch (e: any) {
      setAssistResult(`❌ ${e.message || '请求失败，请检查网络和 Azure OpenAI 配置'}`);
    } finally {
      setAssistLoading(false);
    }
  };

  const showPTCol = !filterProject && currentProject === '全部';

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">知识库</h1>
          <p className="text-gray-500 mt-1">管理测试用例，智能推荐测试计划和复测问题</p>
        </div>

        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}

        {stats && (
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: '测试用例', value: stats.totalCases, icon: '📋', color: 'from-blue-500 to-cyan-400' },
              { label: 'Release Note', value: stats.totalReleaseNotes || 0, icon: '📝', color: 'from-purple-500 to-pink-400' },
              { label: '版本问题', value: stats.totalIssues, icon: '🐛', color: 'from-orange-500 to-yellow-400' },
              { label: '问题追踪', value: stats.totalProblems, icon: '📊', color: 'from-green-500 to-emerald-400' },
            ].map((s) => (
              <div key={s.label} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${s.color} flex items-center justify-center text-white text-lg`}>{s.icon}</div>
                <div>
                  <div className="text-2xl font-bold text-gray-900">{s.value}</div>
                  <div className="text-xs text-gray-500">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="flex gap-1 mb-6 bg-white rounded-lg p-1 shadow-sm w-fit">
          {([['knowledge', '📋 测试用例库'], ['recommend', '🤖 智能推荐'], ['assistant', '💬 AI 测试助手']] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-5 py-2 rounded-md text-sm font-medium transition-all ${tab === key ? 'bg-gradient-to-r from-blue-600 to-cyan-500 text-white shadow' : 'text-gray-600 hover:bg-gray-100'}`}>
              {label}
            </button>
          ))}
        </div>

        {/* 测试用例库 Tab */}
        {tab === 'knowledge' && (
          <KnowledgeTab
            testCases={testCases} categories={categories} loading={loading} importLoading={importLoading}
            showPTCol={showPTCol} searchKeyword={searchKeyword} filterCategory={filterCategory}
            filterProject={filterProject} currentPT={currentPT}
            onSearchKeywordChange={setSearchKeyword} onFilterCategoryChange={setFilterCategory}
            onFilterProjectChange={setFilterProject}
            onSearch={handleSearch} onDelete={handleDelete} onEdit={handleEdit}
            onShowAddForm={() => setShowAddForm(true)} onShowImport={() => setShowImport(true)}
            showAddForm={showAddForm} showImport={showImport}
            editingCase={editingCase}
            onCloseAddForm={() => setShowAddForm(false)} onCloseImport={() => setShowImport(false)}
            onCloseEdit={() => setEditingCase(null)}
            onAddCase={(data: any) => { dispatch(addTestCase(data)); setShowAddForm(false); }}
            onImport={(cases: any[]) => { dispatch(bulkImport(cases)); setShowImport(false); }}
            onSaveEdit={handleSaveEdit}
            dispatch={dispatch} fetchTestCases={fetchTestCases}
          />
        )}

        {/* 智能推荐 Tab */}
        {tab === 'recommend' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <div className="bg-white rounded-xl shadow-sm p-5">
                <h3 className="text-lg font-bold text-gray-900 mb-4">生成测试推荐</h3>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">选择版本（Release Note）*</label>
                    <select value={recForm.versionNumber}
                      onChange={(e) => {
                        const ver = releaseVersions.find((v) => v.version === e.target.value);
                        if (ver) handleSelectVersion(ver);
                        else { setSelectedVersion(null); setRecForm((p) => ({ ...p, versionNumber: e.target.value })); }
                      }}
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm">
                      <option value="">请选择版本...</option>
                      {releaseVersions.map((v) => (
                        <option key={v.version} value={v.version}>
                          {v.version}{v.projectType ? ` (${v.projectType})` : ''} — {formatDate(v.latestDate)}
                        </option>
                      ))}
                    </select>
                    {releaseVersions.length === 0 && <p className="text-xs text-gray-400 mt-1">暂无 Release Note 数据</p>}
                  </div>
                  {selectedVersion && (
                    <div className="bg-blue-50 rounded-lg p-3 border border-blue-200 text-xs space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-blue-800">{selectedVersion.version}</span>
                        {selectedVersion.projectType && <span className={`px-1.5 py-0.5 rounded ${PT_COLORS[selectedVersion.projectType] || 'bg-gray-100 text-gray-600'}`}>{selectedVersion.projectType}</span>}
                        {selectedVersion.regressionRisk && (
                          <span className={`px-1.5 py-0.5 rounded ${selectedVersion.regressionRisk === '高' ? 'bg-red-100 text-red-700' : selectedVersion.regressionRisk === '中' ? 'bg-yellow-100 text-yellow-700' : 'bg-green-100 text-green-700'}`}>
                            风险: {selectedVersion.regressionRisk}
                          </span>
                        )}
                      </div>
                      <div className="text-gray-600">包含 {selectedVersion.noteIds.length} 条修改记录</div>
                      {selectedVersion.modules.length > 0 && (
                        <div className="flex gap-1 flex-wrap">{selectedVersion.modules.map((m) => <span key={m} className="px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">{m}</span>)}</div>
                      )}
                    </div>
                  )}
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">修改内容（自动填充，可编辑）</label>
                    <textarea value={recForm.changeDescription} onChange={(e) => setRecForm((p) => ({ ...p, changeDescription: e.target.value }))}
                      placeholder="描述本次版本的主要修改..." rows={3} className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">涉及模块（自动填充，可编辑）</label>
                    <Input value={recForm.modules} onChange={(e) => setRecForm((p) => ({ ...p, modules: e.target.value }))} placeholder="语音、蓝牙、系统" />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">风险等级</label>
                    <div className="flex gap-2">
                      {['低', '中', '高'].map((lv) => (
                        <button key={lv} onClick={() => setRecForm((p) => ({ ...p, riskLevel: lv }))}
                          className={`flex-1 py-1.5 rounded-lg text-sm font-medium transition-all ${recForm.riskLevel === lv
                            ? lv === '高' ? 'bg-red-500 text-white' : lv === '中' ? 'bg-yellow-500 text-white' : 'bg-green-500 text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                          {lv}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <input type="checkbox" id="useAI" checked={useAI} onChange={(e) => setUseAI(e.target.checked)} className="rounded" />
                    <label htmlFor="useAI" className="text-xs text-gray-600">使用 AI 增强推荐（需在设置中配置 Azure OpenAI）</label>
                  </div>
                  <Button onClick={handleRecommend} variant="primary" className="w-full" disabled={recommendLoading || !recForm.versionNumber}>
                    {recommendLoading ? '分析中...' : '🤖 生成推荐'}
                  </Button>
                </div>
              </div>
              <div className="bg-white rounded-xl shadow-sm p-5">
                <h3 className="text-sm font-bold text-gray-700 mb-3">知识库概览</h3>
                <div className="space-y-2 text-xs text-gray-500">
                  <div className="flex justify-between"><span>测试用例</span><span className="font-bold text-gray-900">{stats?.totalCases || 0}</span></div>
                  <div className="flex justify-between"><span>用例分类</span><span className="font-bold text-gray-900">{stats?.totalCategories || 0}</span></div>
                  <div className="flex justify-between"><span>Release Note</span><span className="font-bold text-gray-900">{stats?.totalReleaseNotes || 0}</span></div>
                  <div className="flex justify-between"><span>版本数</span><span className="font-bold text-gray-900">{stats?.totalVersions || 0}</span></div>
                  <div className="flex justify-between"><span>版本问题</span><span className="font-bold text-gray-900">{stats?.totalIssues || 0}</span></div>
                  <div className="flex justify-between"><span>问题追踪</span><span className="font-bold text-gray-900">{stats?.totalProblems || 0}</span></div>
                </div>
                <p className="text-xs text-gray-400 mt-3">推荐引擎综合分析以上数据源</p>
              </div>
            </div>
            <div className="lg:col-span-2">
              {currentRecommendation ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-bold text-gray-900">推荐结果</h3>
                    <Button onClick={() => dispatch(clearRecommendation())} variant="secondary" size="sm">清除</Button>
                  </div>
                  <RecommendationResult recommendation={currentRecommendation} />
                </div>
              ) : (
                <div className="bg-white rounded-xl shadow-sm p-16 text-center">
                  <div className="text-5xl mb-4">🤖</div>
                  <p className="text-gray-400 text-lg">选择 Release Note 版本，生成智能测试推荐</p>
                  <p className="text-gray-300 text-sm mt-2">系统将综合分析知识库用例、版本问题和问题追踪数据</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* AI 测试助手 Tab */}
        {tab === 'assistant' && (
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="bg-white rounded-xl shadow-sm p-5">
              <h3 className="text-lg font-bold text-gray-900 mb-1">💬 AI 测试助手</h3>
              <p className="text-xs text-gray-400 mb-4">输入功能描述、测试场景或问题，也可上传文件（需求文档、变更说明等），AI 会结合知识库给出测试建议</p>
              <div className="space-y-3">
                <textarea value={assistQuery} onChange={(e) => setAssistQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && e.ctrlKey) handleAssist(); }}
                  placeholder="例如：&#10;• 蓝牙遥控器配对后语音唤醒功能怎么测？&#10;• 帮我扩展一下 ASR 语种切换的测试点&#10;• 分析上传的需求文档，给出测试方案"
                  rows={4} className="w-full border border-gray-300 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none" />

                {/* 文件上传区域 */}
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600 cursor-pointer hover:bg-gray-100 transition-colors">
                    📎 上传文件
                    <input type="file" accept=".txt,.csv,.md,.json,.log,.xml,.html,.xlsx,.xls" className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        // xlsx 需要特殊处理，暂时只支持文本文件
                        if (file.name.endsWith('.xlsx') || file.name.endsWith('.xls')) {
                          setAssistFile({ name: file.name, content: `[Excel 文件: ${file.name}，请在文本框中描述文件内容或导出为 CSV 后上传]` });
                          e.target.value = '';
                          return;
                        }
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          const content = ev.target?.result as string;
                          setAssistFile({ name: file.name, content });
                        };
                        reader.readAsText(file);
                        e.target.value = '';
                      }} />
                  </label>
                  {assistFile && (
                    <div className="flex items-center gap-2 px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-lg text-xs">
                      <span className="text-blue-700">📄 {assistFile.name}</span>
                      <span className="text-blue-400">({assistFile.content.length > 1000 ? `${(assistFile.content.length / 1000).toFixed(1)}k 字符` : `${assistFile.content.length} 字符`})</span>
                      <button onClick={() => setAssistFile(null)} className="text-blue-400 hover:text-red-500 ml-1" title="移除">✕</button>
                    </div>
                  )}
                  <span className="text-xs text-gray-300">支持 txt、csv、md、json、log 等文本文件</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Ctrl+Enter 发送</span>
                  <Button onClick={handleAssist} variant="primary" size="sm" disabled={assistLoading || (!assistQuery.trim() && !assistFile)}>
                    {assistLoading ? '🤖 思考中...' : '🚀 发送'}
                  </Button>
                </div>
              </div>
            </div>

            {assistResult && (
              <div className="bg-white rounded-xl shadow-sm p-5">
                <div className="flex items-center gap-2 mb-3">
                  <span className="text-lg">🤖</span>
                  <h4 className="font-bold text-gray-900 text-sm">AI 回复</h4>
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">AI</span>
                </div>
                <div className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{assistResult}</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/** 知识库用例 Tab */
const KnowledgeTab: React.FC<{
  testCases: any[]; categories: string[]; loading: boolean; importLoading: boolean;
  showPTCol: boolean; searchKeyword: string; filterCategory: string; filterProject: string; currentPT?: string;
  onSearchKeywordChange: (v: string) => void; onFilterCategoryChange: (v: string) => void;
  onFilterProjectChange: (v: string) => void;
  onSearch: (overrideCategory?: string) => void; onDelete: (id: string) => void; onEdit: (tc: any) => void;
  onShowAddForm: () => void; onShowImport: () => void;
  showAddForm: boolean; showImport: boolean; editingCase: any;
  onCloseAddForm: () => void; onCloseImport: () => void; onCloseEdit: () => void;
  onAddCase: (data: any) => void; onImport: (cases: any[]) => void; onSaveEdit: (data: any) => void;
  dispatch: any; fetchTestCases: any;
}> = ({
  testCases, categories, loading, importLoading, showPTCol,
  searchKeyword, filterCategory, filterProject, currentPT,
  onSearchKeywordChange, onFilterCategoryChange, onFilterProjectChange,
  onSearch, onDelete, onEdit,
  onShowAddForm, onShowImport, showAddForm, showImport, editingCase,
  onCloseAddForm, onCloseImport, onCloseEdit, onAddCase, onImport, onSaveEdit,
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const totalPages = Math.max(1, Math.ceil(testCases.length / pageSize));
  const pagedCases = testCases.slice((page - 1) * pageSize, page * pageSize);

  // 重置页码当筛选变化
  useEffect(() => { setPage(1); }, [testCases.length, filterCategory, searchKeyword]);

  return (
    <div className="space-y-4">
      {/* 工具栏 */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-[200px] max-w-sm">
            <input value={searchKeyword} onChange={(e) => onSearchKeywordChange(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
              placeholder="搜索用例名称、描述..."
              className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
          </div>
          <select value={filterCategory} onChange={(e) => { onFilterCategoryChange(e.target.value); onSearch(e.target.value); }}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
            <option value="">全部分类</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterProject} onChange={(e) => onFilterProjectChange(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm">
            <option value="">全部项目</option>
            {['TV', 'Projector', 'STB'].map((pt) => <option key={pt} value={pt}>{pt}</option>)}
          </select>
          <Button onClick={() => onSearch()} variant="secondary" size="sm">🔍 搜索</Button>
          <div className="flex-1" />
          <Button onClick={onShowAddForm} variant="primary" size="sm">+ 添加用例</Button>
          <Button onClick={onShowImport} variant="secondary" size="sm">📥 批量导入</Button>
        </div>
      </div>

      {/* 添加/导入面板 */}
      {showAddForm && <AddCaseForm onClose={onCloseAddForm} onSubmit={onAddCase} categories={categories} defaultPT={currentPT} />}
      {showImport && <ImportPanel onClose={onCloseImport} loading={importLoading} defaultPT={currentPT} onImport={onImport} />}
      {editingCase && <EditCaseForm tc={editingCase} onClose={onCloseEdit} onSubmit={onSaveEdit} categories={categories} />}

      {/* 用例表格 */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <span className="text-sm text-gray-500">共 <span className="font-bold text-gray-900">{testCases.length}</span> 条用例</span>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>第 {page}/{totalPages} 页</span>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-gray-400">加载中...</div>
        ) : pagedCases.length === 0 ? (
          <div className="p-12 text-center text-gray-400">暂无用例数据</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs text-gray-500 uppercase">
                <th className="px-4 py-2 w-8"></th>
                <th className="px-3 py-2 w-24">编号</th>
                <th className="px-3 py-2">名称</th>
                <th className="px-3 py-2 w-28">分类</th>
                {showPTCol && <th className="px-3 py-2 w-24">项目</th>}
                <th className="px-3 py-2 w-20">优先级</th>
                <th className="px-3 py-2 w-24">模块</th>
                <th className="px-3 py-2 w-20 text-center">操作</th>
              </tr>
            </thead>
            <tbody>
              {pagedCases.map((tc: any) => {
                const isExpanded = expandedId === tc.id;
                return (
                  <React.Fragment key={tc.id}>
                    <tr className={`border-b border-gray-50 hover:bg-blue-50/30 cursor-pointer transition-colors ${isExpanded ? 'bg-blue-50/40' : ''}`}
                      onClick={() => setExpandedId(isExpanded ? null : tc.id)}>
                      <td className="px-4 py-2 text-gray-400 text-xs">{isExpanded ? '▼' : '▶'}</td>
                      <td className="px-3 py-2 font-mono text-xs text-gray-500">{tc.caseId || '-'}</td>
                      <td className="px-3 py-2 font-medium text-gray-900 truncate max-w-[300px]">{tc.caseName}</td>
                      <td className="px-3 py-2"><span className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">{tc.category || '-'}</span></td>
                      {showPTCol && (
                        <td className="px-3 py-2">
                          {tc.projectType ? <span className={`px-2 py-0.5 rounded text-xs ${PT_COLORS[tc.projectType] || 'bg-gray-100 text-gray-600'}`}>{tc.projectType}</span> : '-'}
                        </td>
                      )}
                      <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded text-xs ${PRIORITY_COLORS[tc.priority] || 'bg-gray-100 text-gray-600'}`}>{tc.priority}</span></td>
                      <td className="px-3 py-2 text-xs text-gray-500">{tc.module || '-'}</td>
                      <td className="px-3 py-2 text-center">
                        <button onClick={(e) => { e.stopPropagation(); onEdit(tc); }}
                          className="text-blue-400 hover:text-blue-600 text-xs mr-2" title="编辑">✏️</button>
                        <button onClick={(e) => { e.stopPropagation(); onDelete(tc.id); }}
                          className="text-red-400 hover:text-red-600 text-xs" title="删除">🗑</button>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-blue-50/20">
                        <td colSpan={showPTCol ? 9 : 8} className="px-6 py-3">
                          <div className="space-y-2 text-xs">
                            <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
                              {tc.precondition && (
                                <>
                                  <span className="text-orange-600 font-semibold whitespace-nowrap">⚠ 前置条件</span>
                                  <div className="text-gray-700 bg-orange-50 rounded px-2 py-1 border border-orange-100">
                                    {tc.precondition.split('\n').map((line: string, i: number) => <div key={i}>{line}</div>)}
                                  </div>
                                </>
                              )}
                              {tc.description && (
                                <>
                                  <span className="text-blue-600 font-semibold whitespace-nowrap">📋 操作步骤</span>
                                  <div className="text-gray-700 bg-blue-50 rounded px-2 py-1 border border-blue-100">
                                    {tc.description.split('\n').map((line: string, i: number) => <div key={i}>{line}</div>)}
                                  </div>
                                </>
                              )}
                              {tc.expectedResult && (
                                <>
                                  <span className="text-green-600 font-semibold whitespace-nowrap">✅ 预期结果</span>
                                  <div className="text-gray-700 bg-green-50 rounded px-2 py-1 border border-green-100">
                                    {tc.expectedResult.split('\n').filter(Boolean).map((line: string, i: number) => <div key={i}>{line}</div>)}
                                  </div>
                                </>
                              )}
                            </div>
                            {tc.tags && tc.tags.length > 0 && (
                              <div className="flex items-center gap-1">
                                <span className="text-gray-500 font-medium">标签：</span>
                                {tc.tags.map((t: string) => <span key={t} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{t}</span>)}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        )}

        {/* 分页 */}
        {totalPages >= 1 && (
          <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <span>显示 {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, testCases.length)} / {testCases.length}</span>
              <select value={pageSize} onChange={(e) => { setPageSize(Number(e.target.value)); setPage(1); }}
                className="border border-gray-200 rounded px-1.5 py-0.5 text-xs text-gray-600">
                {[20, 50, 100, 200].map((n) => <option key={n} value={n}>{n} 条/页</option>)}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setPage(1)} disabled={page === 1}
                className="px-2 py-1 rounded text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30">首页</button>
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-2 py-1 rounded text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30">‹ 上一页</button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum: number;
                if (totalPages <= 5) pageNum = i + 1;
                else if (page <= 3) pageNum = i + 1;
                else if (page >= totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = page - 2 + i;
                return (
                  <button key={pageNum} onClick={() => setPage(pageNum)}
                    className={`w-7 h-7 rounded text-xs ${page === pageNum ? 'bg-blue-500 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>
                    {pageNum}
                  </button>
                );
              })}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-2 py-1 rounded text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30">下一页 ›</button>
              <button onClick={() => setPage(totalPages)} disabled={page === totalPages}
                className="px-2 py-1 rounded text-xs text-gray-500 hover:bg-gray-100 disabled:opacity-30">末页</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/** 添加用例表单 */
const AddCaseForm: React.FC<{ onClose: () => void; onSubmit: (data: any) => void; categories: string[]; defaultPT?: string }> = ({ onClose, onSubmit, categories, defaultPT }) => {
  const [form, setForm] = useState({ caseId: '', caseName: '', precondition: '', description: '', expectedResult: '', category: '', module: '', priority: 'L3', tags: '', projectType: defaultPT || '' });
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 border-2 border-blue-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900">添加测试用例</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">用例编号</label>
          <input value={form.caseId} onChange={(e) => setForm((p) => ({ ...p, caseId: e.target.value }))} className="w-full border rounded-lg px-3 py-1.5 text-sm" placeholder="TC-001" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">名称 *</label>
          <input value={form.caseName} onChange={(e) => setForm((p) => ({ ...p, caseName: e.target.value }))} className="w-full border rounded-lg px-3 py-1.5 text-sm" placeholder="用例名称" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">项目组</label>
          <div className="flex gap-2">
            {['TV', 'Projector', 'STB'].map((pt) => (
              <button key={pt} onClick={() => setForm((p) => ({ ...p, projectType: p.projectType === pt ? '' : pt }))}
                className={`flex-1 py-1 rounded text-xs font-medium ${form.projectType === pt ? PT_COLORS[pt] + ' ring-1 ring-current' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{pt}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">分类</label>
          <div className="flex gap-1 flex-wrap mb-1">
            {categories.map((c) => (
              <button key={c} onClick={() => setForm((p) => ({ ...p, category: c }))}
                className={`px-2 py-0.5 rounded text-xs ${form.category === c ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{c}</button>
            ))}
          </div>
          <input value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} className="w-full border rounded-lg px-3 py-1.5 text-sm" placeholder="自定义分类" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-orange-600 mb-1 font-medium">⚠ 前置条件</label>
          <textarea value={form.precondition} onChange={(e) => setForm((p) => ({ ...p, precondition: e.target.value }))} className="w-full border border-orange-200 bg-orange-50 rounded-lg px-3 py-1.5 text-sm" rows={2} placeholder="如：设备无网络、已连接蓝牙等" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-blue-600 mb-1 font-medium">📋 操作步骤</label>
          <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className="w-full border border-blue-200 bg-blue-50 rounded-lg px-3 py-1.5 text-sm" rows={2} placeholder="1. 第一步&#10;2. 第二步" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-green-600 mb-1 font-medium">✅ 预期结果</label>
          <textarea value={form.expectedResult} onChange={(e) => setForm((p) => ({ ...p, expectedResult: e.target.value }))} className="w-full border border-green-200 bg-green-50 rounded-lg px-3 py-1.5 text-sm" rows={2} placeholder="预期的测试结果" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">模块</label>
          <input value={form.module} onChange={(e) => setForm((p) => ({ ...p, module: e.target.value }))} className="w-full border rounded-lg px-3 py-1.5 text-sm" placeholder="语音模块" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">优先级</label>
          <div className="flex gap-2">
            {PRIORITY_OPTIONS.map((lv) => (
              <button key={lv} onClick={() => setForm((p) => ({ ...p, priority: lv }))}
                className={`flex-1 py-1 rounded text-xs font-medium ${form.priority === lv ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-600'}`}>{lv}</button>
            ))}
          </div>
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">标签（逗号分隔）</label>
          <input value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} className="w-full border rounded-lg px-3 py-1.5 text-sm" placeholder="蓝牙, 连接, 配对" />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Button onClick={onClose} variant="secondary" size="sm">取消</Button>
        <Button onClick={() => { if (!form.caseName) return; onSubmit({ ...form, tags: form.tags.split(/[,，、\s]+/).filter(Boolean), projectType: form.projectType || undefined }); }} variant="primary" size="sm">保存</Button>
      </div>
    </div>
  );
};

/** 编辑用例表单 */
const EditCaseForm: React.FC<{ tc: any; onClose: () => void; onSubmit: (data: any) => void; categories: string[] }> = ({ tc, onClose, onSubmit, categories }) => {
  const [form, setForm] = useState({
    caseId: tc.caseId || '', caseName: tc.caseName || '', precondition: tc.precondition || '',
    description: tc.description || '', expectedResult: tc.expectedResult || '',
    category: tc.category || '', module: tc.module || '',
    priority: tc.priority || 'L3', tags: (tc.tags || []).join(', '), projectType: tc.projectType || '',
  });
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 border-2 border-green-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900">✏️ 编辑测试用例</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">用例编号</label>
          <input value={form.caseId} onChange={(e) => setForm((p) => ({ ...p, caseId: e.target.value }))} className="w-full border rounded-lg px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">名称 *</label>
          <input value={form.caseName} onChange={(e) => setForm((p) => ({ ...p, caseName: e.target.value }))} className="w-full border rounded-lg px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">项目组</label>
          <div className="flex gap-2">
            {['TV', 'Projector', 'STB'].map((pt) => (
              <button key={pt} onClick={() => setForm((p) => ({ ...p, projectType: p.projectType === pt ? '' : pt }))}
                className={`flex-1 py-1 rounded text-xs font-medium ${form.projectType === pt ? PT_COLORS[pt] + ' ring-1 ring-current' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>{pt}</button>
            ))}
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">分类</label>
          <select value={form.category} onChange={(e) => setForm((p) => ({ ...p, category: e.target.value }))} className="w-full border rounded-lg px-3 py-1.5 text-sm">
            <option value="">选择分类</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-orange-600 mb-1 font-medium">⚠ 前置条件</label>
          <textarea value={form.precondition} onChange={(e) => setForm((p) => ({ ...p, precondition: e.target.value }))} className="w-full border border-orange-200 bg-orange-50 rounded-lg px-3 py-1.5 text-sm" rows={2} placeholder="如：设备无网络、已连接蓝牙等" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-blue-600 mb-1 font-medium">📋 操作步骤</label>
          <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} className="w-full border border-blue-200 bg-blue-50 rounded-lg px-3 py-1.5 text-sm" rows={3} placeholder="1. 第一步&#10;2. 第二步" />
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-green-600 mb-1 font-medium">✅ 预期结果</label>
          <textarea value={form.expectedResult} onChange={(e) => setForm((p) => ({ ...p, expectedResult: e.target.value }))} className="w-full border border-green-200 bg-green-50 rounded-lg px-3 py-1.5 text-sm" rows={2} placeholder="预期的测试结果" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">模块</label>
          <input value={form.module} onChange={(e) => setForm((p) => ({ ...p, module: e.target.value }))} className="w-full border rounded-lg px-3 py-1.5 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">优先级</label>
          <div className="flex gap-2">
            {PRIORITY_OPTIONS.map((lv) => (
              <button key={lv} onClick={() => setForm((p) => ({ ...p, priority: lv }))}
                className={`flex-1 py-1 rounded text-xs font-medium ${form.priority === lv ? PRIORITY_COLORS[lv] + ' ring-1 ring-current' : 'bg-gray-100 text-gray-600'}`}>{lv}</button>
            ))}
          </div>
        </div>
        <div className="col-span-2">
          <label className="block text-xs text-gray-500 mb-1">标签（逗号分隔）</label>
          <input value={form.tags} onChange={(e) => setForm((p) => ({ ...p, tags: e.target.value }))} className="w-full border rounded-lg px-3 py-1.5 text-sm" />
        </div>
      </div>
      <div className="flex justify-end gap-2 mt-4">
        <Button onClick={onClose} variant="secondary" size="sm">取消</Button>
        <Button onClick={() => { if (!form.caseName) return; onSubmit({ ...form, tags: form.tags.split(/[,，、\s]+/).filter(Boolean), projectType: form.projectType || undefined }); }} variant="primary" size="sm">保存修改</Button>
      </div>
    </div>
  );
};

/** CSV 模板内容 */
const CSV_TEMPLATE = `编号,名称,描述,预期结果,分类,模块,优先级,项目,标签
TC-001,语音唤醒测试,测试"你好小维"唤醒词,设备成功唤醒并进入语音交互,语音,语音模块,L1,TV,语音;唤醒;小维
TC-002,蓝牙遥控器配对,测试蓝牙遥控器首次配对流程,配对成功且遥控器可正常使用,蓝牙,蓝牙模块,L1,TV,蓝牙;遥控器;配对
TC-003,音量调节语音指令,说"大声一点"或"小声一点",音量正确调节,语音,语音模块,L2,TV,语音;音量
TC-004,投影仪对焦测试,测试自动对焦功能,画面清晰对焦,系统,投影模块,L1,Projector,投影;对焦
TC-005,STB开机引导,测试首次开机引导流程,引导流程完整且可正常完成,系统,系统模块,L2,STB,开机;引导`;

/** 批量导入面板 */
const ImportPanel: React.FC<{ onClose: () => void; loading: boolean; defaultPT?: string; onImport: (cases: any[]) => void }> = ({ onClose, loading, defaultPT, onImport }) => {
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<any[]>([]);

  const parseCSV = (csv: string) => {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(/[,\t]/).map((h) => h.trim());
    return lines.slice(1).map((line) => {
      const vals = line.split(/[,\t]/).map((v) => v.trim());
      const obj: any = {};
      headers.forEach((h, i) => {
        const key = { '编号': 'caseId', '名称': 'caseName', '描述': 'description', '预期结果': 'expectedResult', '分类': 'category', '模块': 'module', '优先级': 'priority', '项目': 'projectType', '标签': 'tags' }[h] || h;
        obj[key] = vals[i] || '';
      });
      if (typeof obj.tags === 'string') obj.tags = obj.tags.split(/[;；、]/).filter(Boolean);
      // 如果没有指定项目，用当前项目组
      if (!obj.projectType && defaultPT) obj.projectType = defaultPT;
      return obj;
    }).filter((o: any) => o.caseName);
  };

  const handleParse = () => { setPreview(parseCSV(text)); };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { const content = ev.target?.result as string; setText(content); setPreview(parseCSV(content)); };
    reader.readAsText(file);
  };

  const downloadTemplate = () => {
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + CSV_TEMPLATE], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = '测试用例导入模板.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-white rounded-xl shadow-sm p-5 border-2 border-purple-200">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900">📥 批量导入测试用例</h3>
        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
      </div>
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <button onClick={downloadTemplate} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-medium hover:bg-blue-100 transition-colors">
            📄 下载 CSV 模板
          </button>
          <span className="text-xs text-gray-400">模板包含示例数据，可直接修改后导入</span>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">上传 CSV/TSV 文件</label>
          <input type="file" accept=".csv,.tsv,.txt" onChange={handleFileUpload} className="text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">或粘贴 CSV 内容（表头: 编号,名称,描述,预期结果,分类,模块,优先级,项目,标签）</label>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={5} className="w-full border rounded-lg px-3 py-2 text-xs font-mono"
            placeholder="编号,名称,描述,预期结果,分类,模块,优先级,项目,标签&#10;TC-001,语音唤醒测试,测试语音唤醒功能,成功唤醒,语音,语音模块,高,TV,语音;唤醒" />
        </div>
        <div className="flex gap-2">
          <Button onClick={handleParse} variant="secondary" size="sm">解析预览</Button>
          {preview.length > 0 && (
            <Button onClick={() => onImport(preview)} variant="primary" size="sm" disabled={loading}>
              {loading ? '导入中...' : `导入 ${preview.length} 条用例`}
            </Button>
          )}
        </div>
        {preview.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-3 text-xs">
            <div className="text-gray-600 mb-2">预览 ({preview.length} 条):</div>
            <div className="space-y-1">
              {preview.slice(0, 5).map((p, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-gray-400 font-mono">{p.caseId || '-'}</span>
                  <span className="font-medium text-gray-900">{p.caseName}</span>
                  {p.projectType && <span className={`px-1.5 py-0.5 rounded ${PT_COLORS[p.projectType] || 'bg-gray-100 text-gray-600'}`}>{p.projectType}</span>}
                  {p.category && <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded">{p.category}</span>}
                </div>
              ))}
              {preview.length > 5 && <div className="text-gray-400">... 还有 {preview.length - 5} 条</div>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecommendationsPage;
