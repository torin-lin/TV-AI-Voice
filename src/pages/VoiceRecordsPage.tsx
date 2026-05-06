import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '../components/common/Card';
import { Input } from '../components/common/Input';
import { Textarea } from '../components/common/Textarea';
import { Button } from '../components/common/Button';
import { useToast } from '../components/common/ToastProvider';
import {
  apiCancelVoiceAutomationJob,
  apiGetVoiceAutomationJob,
  apiListVoiceAutomationJobs,
  apiStartVoiceAutomation,
  VoiceAutomationExecutionItem,
  VoiceAutomationJob,
} from '../services/VoiceAutomationApiClient';

const DEFAULT_SCRIPT_PATH = 'D:\\PycharmProjects\\AIvoice自动化\\语音自动化exe.py';
const EXECUTION_ROWS_STORAGE_KEY = 'voice_automation_execution_rows';

type ComparisonFieldResult = {
  field: string;
  expected: string;
  actual: string;
  passed: boolean;
};

type ComparedExecutionItem = VoiceAutomationExecutionItem & {
  itemIndex: number;
  resultIndex: number | null;
  actualResult?: Record<string, any>;
  comparisonFields: ComparisonFieldResult[];
  passed: boolean;
};

const createDefaultEndTime = () => {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

const DEFAULT_EXECUTION_ROWS = [
  '打开YouTube|Open YouTube|Open YouTube|Open YouTube|skill|Launcher|YouTube||',
  '等待页面稳定|sleep:2|||||||',
  '打开设置|Open Settings|Open Settings|Open Settings|skill|Launcher|Settings||',
].join('\n');

function normalizeText(value: unknown): string {
  return String(value || '').trim();
}

function isControlStep(stepText: string): boolean {
  return stepText.startsWith('sleep:') || stepText.startsWith('key:');
}

function parseExecutionRows(input: string): VoiceAutomationExecutionItem[] {
  return input
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const parts = line.split('|').map((part) => part.trim());
      const [
        title = '',
        stepText = '',
        expectedQuery = '',
        expectedRecognizedText = '',
        expectedType = '',
        expectedSkill = '',
        expectedApp = '',
        expectedAnswerIncludes = '',
        expectedWeatherText = '',
      ] = parts;

      return {
        title: title || undefined,
        stepText,
        isControlStep: isControlStep(stepText),
        expectedQuery: expectedQuery || undefined,
        expectedRecognizedText: expectedRecognizedText || undefined,
        expectedType: expectedType || undefined,
        expectedSkill: expectedSkill || undefined,
        expectedApp: expectedApp || undefined,
        expectedAnswerIncludes: expectedAnswerIncludes || undefined,
        expectedWeatherText: expectedWeatherText || undefined,
      };
    })
    .filter((item) => item.stepText);
}

function compareJobResults(job: VoiceAutomationJob | null): ComparedExecutionItem[] {
  if (!job?.request.executionItems?.length) {
    return [];
  }

  let resultCursor = 0;

  return job.request.executionItems.map((item, itemIndex) => {
    if (item.isControlStep) {
      return {
        ...item,
        itemIndex,
        resultIndex: null,
        comparisonFields: [],
        passed: true,
      };
    }

    const actualResult = job.results[resultCursor];
    const currentResultIndex = resultCursor;
    resultCursor += 1;

    const fieldChecks: Array<[string, string | undefined, string]> = [
      ['query', item.expectedQuery, normalizeText(actualResult?.query)],
      ['recognized_text', item.expectedRecognizedText, normalizeText(actualResult?.recognized_text)],
      ['type', item.expectedType, normalizeText(actualResult?.type)],
      ['skill', item.expectedSkill, normalizeText(actualResult?.skill)],
      ['app', item.expectedApp, normalizeText(actualResult?.extra?.app)],
      ['answer_includes', item.expectedAnswerIncludes, normalizeText(actualResult?.answer)],
      ['weatherText', item.expectedWeatherText, normalizeText(actualResult?.extra?.weatherText)],
    ];

    const comparisonFields = fieldChecks
      .filter(([, expected]) => Boolean(expected))
      .map(([field, expected, actual]) => ({
        field,
        expected: normalizeText(expected),
        actual,
        passed: field === 'answer_includes'
          ? actual.toLowerCase().includes(normalizeText(expected).toLowerCase())
          : actual.toLowerCase() === normalizeText(expected).toLowerCase(),
      }));

    return {
      ...item,
      itemIndex,
      resultIndex: currentResultIndex,
      actualResult,
      comparisonFields,
      passed: Boolean(actualResult) && comparisonFields.every((field) => field.passed),
    };
  });
}

const VoiceRecordsPage: React.FC = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(true);
  const [currentJob, setCurrentJob] = useState<VoiceAutomationJob | null>(null);
  const [jobs, setJobs] = useState<VoiceAutomationJob[]>([]);
  const [formData, setFormData] = useState({
    scriptPath: localStorage.getItem('voice_automation_script_path') || DEFAULT_SCRIPT_PATH,
    pythonExecutable: localStorage.getItem('voice_automation_python') || 'python',
    adbSerial: localStorage.getItem('voice_automation_adb_serial') || '',
    tvSerial: localStorage.getItem('voice_automation_tv_serial') || '',
    mihomePackage: localStorage.getItem('voice_automation_mihome_package') || 'com.xiaomi.smarthome',
    endTime: createDefaultEndTime(),
    lang: localStorage.getItem('voice_automation_lang') || 'en',
    executionRows: localStorage.getItem(EXECUTION_ROWS_STORAGE_KEY) || DEFAULT_EXECUTION_ROWS,
    bluetooth_loading: localStorage.getItem('voice_automation_xpath_bluetooth') || '',
    device_entry: localStorage.getItem('voice_automation_xpath_device') || '',
    btn_on: localStorage.getItem('voice_automation_xpath_on') || '',
    btn_off: localStorage.getItem('voice_automation_xpath_off') || '',
  });

  const parsedExecutionItems = useMemo(() => parseExecutionRows(formData.executionRows), [formData.executionRows]);
  const comparedItems = useMemo(() => compareJobResults(currentJob), [currentJob]);

  const loadJobs = async (focusJobId?: string) => {
    setHistoryLoading(true);
    try {
      const jobList = await apiListVoiceAutomationJobs();
      setJobs(jobList);
      const targetJob = focusJobId
        ? jobList.find((job) => job.id === focusJobId) || null
        : jobList[0] || null;
      setCurrentJob(targetJob);
    } catch (error) {
      showToast((error as Error).message || '加载任务失败', 'error');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    void loadJobs();
  }, []);

  useEffect(() => {
    if (!currentJob || (currentJob.status !== 'running' && currentJob.status !== 'pending')) {
      return;
    }

    const timer = window.setInterval(async () => {
      try {
        const latest = await apiGetVoiceAutomationJob(currentJob.id);
        setCurrentJob(latest);
        setJobs((prev) => {
          const next = prev.filter((item) => item.id !== latest.id);
          return [latest, ...next].sort((a, b) => b.createdAt - a.createdAt);
        });
      } catch {
        // ignore poll error
      }
    }, 3000);

    return () => window.clearInterval(timer);
  }, [currentJob]);

  const stats = useMemo(() => {
    const executableItems = parsedExecutionItems.filter((item) => !item.isControlStep);
    const comparableItems = comparedItems.filter((item) => !item.isControlStep && item.comparisonFields.length > 0);
    const passedComparableItems = comparableItems.filter((item) => item.passed).length;
    const passRate = comparableItems.length > 0 ? Math.round((passedComparableItems / comparableItems.length) * 100) : 0;

    return {
      totalJobs: jobs.length,
      totalSteps: parsedExecutionItems.length,
      executableSteps: executableItems.length,
      comparableItems: comparableItems.length,
      passedComparableItems,
      passRate,
    };
  }, [comparedItems, jobs.length, parsedExecutionItems]);

  const persistDraft = () => {
    localStorage.setItem('voice_automation_script_path', formData.scriptPath);
    localStorage.setItem('voice_automation_python', formData.pythonExecutable);
    localStorage.setItem('voice_automation_adb_serial', formData.adbSerial);
    localStorage.setItem('voice_automation_tv_serial', formData.tvSerial);
    localStorage.setItem('voice_automation_mihome_package', formData.mihomePackage);
    localStorage.setItem('voice_automation_lang', formData.lang);
    localStorage.setItem(EXECUTION_ROWS_STORAGE_KEY, formData.executionRows);
    localStorage.setItem('voice_automation_xpath_bluetooth', formData.bluetooth_loading);
    localStorage.setItem('voice_automation_xpath_device', formData.device_entry);
    localStorage.setItem('voice_automation_xpath_on', formData.btn_on);
    localStorage.setItem('voice_automation_xpath_off', formData.btn_off);
  };

  const handleStart = async () => {
    const voiceTexts = parsedExecutionItems.map((item) => item.stepText);

    if (!formData.scriptPath.trim()) {
      showToast('请先填写脚本路径', 'error');
      return;
    }
    if (!formData.adbSerial.trim() || !formData.tvSerial.trim()) {
      showToast('请先填写 adbSerial 和 tvSerial', 'error');
      return;
    }
    if (!formData.bluetooth_loading.trim() || !formData.device_entry.trim() || !formData.btn_on.trim() || !formData.btn_off.trim()) {
      showToast('请先补齐 4 个 xpath', 'error');
      return;
    }
    if (parsedExecutionItems.length === 0) {
      showToast('请至少输入 1 条执行项', 'error');
      return;
    }
    if (parsedExecutionItems.some((item) => !item.stepText)) {
      showToast('存在空步骤，请检查执行项输入', 'error');
      return;
    }

    setLoading(true);
    persistDraft();
    try {
      const job = await apiStartVoiceAutomation({
        scriptPath: formData.scriptPath.trim(),
        pythonExecutable: formData.pythonExecutable.trim() || 'python',
        adbSerial: formData.adbSerial.trim(),
        tvSerial: formData.tvSerial.trim(),
        mihomePackage: formData.mihomePackage.trim(),
        endTime: formData.endTime.trim(),
        lang: formData.lang.trim() || 'en',
        voiceTexts,
        executionItems: parsedExecutionItems,
        xpath: {
          bluetooth_loading: formData.bluetooth_loading.trim(),
          device_entry: formData.device_entry.trim(),
          btn_on: formData.btn_on.trim(),
          btn_off: formData.btn_off.trim(),
        },
      });
      setCurrentJob(job);
      setJobs((prev) => [job, ...prev.filter((item) => item.id !== job.id)]);
      showToast('用例执行任务已启动', 'success');
    } catch (error) {
      showToast((error as Error).message || '启动任务失败', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async () => {
    if (!currentJob) {
      return;
    }
    try {
      const job = await apiCancelVoiceAutomationJob(currentJob.id);
      setCurrentJob(job);
      setJobs((prev) => [job, ...prev.filter((item) => item.id !== job.id)]);
      showToast('任务已取消', 'success');
    } catch (error) {
      showToast((error as Error).message || '取消任务失败', 'error');
    }
  };

  const currentRunning = currentJob?.status === 'running' || currentJob?.status === 'pending';

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">语音用例执行台</h1>
            <p className="mt-2 text-gray-600">
              输入执行步骤和期望结果，网页触发自动化后自动解析 TV 日志结果，并逐项比对是否符合预期。
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => void loadJobs(currentJob?.id)}>
              {historyLoading ? '刷新中...' : '刷新任务'}
            </Button>
            <Button onClick={handleStart} disabled={loading || currentRunning}>
              {loading ? '启动中...' : currentRunning ? '已有任务执行中' : '执行用例'}
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
          <Card>
            <p className="text-sm text-gray-500">任务数</p>
            <p className="mt-3 text-3xl font-bold text-gray-900">{stats.totalJobs}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">步骤数</p>
            <p className="mt-3 text-3xl font-bold text-blue-600">{stats.totalSteps}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">真实语音步骤</p>
            <p className="mt-3 text-3xl font-bold text-cyan-600">{stats.executableSteps}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">可比对断言</p>
            <p className="mt-3 text-3xl font-bold text-amber-600">{stats.comparableItems}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">断言通过率</p>
            <p className="mt-3 text-3xl font-bold text-green-600">{stats.passRate}%</p>
            <p className="mt-2 text-xs text-gray-400">
              {stats.passedComparableItems}/{stats.comparableItems}
            </p>
          </Card>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <div className="xl:col-span-2">
            <Card>
              <h2 className="mb-4 text-xl font-bold text-gray-900">执行环境</h2>
              <div className="space-y-4">
                <Input
                  label="脚本路径"
                  value={formData.scriptPath}
                  onChange={(e) => setFormData((prev) => ({ ...prev, scriptPath: e.target.value }))}
                  placeholder={DEFAULT_SCRIPT_PATH}
                />
                <Input
                  label="Python 可执行命令"
                  value={formData.pythonExecutable}
                  onChange={(e) => setFormData((prev) => ({ ...prev, pythonExecutable: e.target.value }))}
                  placeholder="python"
                />
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input
                    label="ADB_SERIAL"
                    value={formData.adbSerial}
                    onChange={(e) => setFormData((prev) => ({ ...prev, adbSerial: e.target.value }))}
                    placeholder="米家控制端串号"
                  />
                  <Input
                    label="TV_SERIAL"
                    value={formData.tvSerial}
                    onChange={(e) => setFormData((prev) => ({ ...prev, tvSerial: e.target.value }))}
                    placeholder="TV 串号或 IP:PORT"
                  />
                </div>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <Input
                    label="米家包名"
                    value={formData.mihomePackage}
                    onChange={(e) => setFormData((prev) => ({ ...prev, mihomePackage: e.target.value }))}
                  />
                  <Input
                    label="语言"
                    value={formData.lang}
                    onChange={(e) => setFormData((prev) => ({ ...prev, lang: e.target.value }))}
                    placeholder="en / zh"
                  />
                </div>
                <Input
                  label="结束时间"
                  value={formData.endTime}
                  onChange={(e) => setFormData((prev) => ({ ...prev, endTime: e.target.value }))}
                  placeholder="YYYY-MM-DD HH:mm:ss"
                />
                <div className="rounded-lg border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
                  服务端会复制外部 Python 脚本到临时目录，并生成独立 `config.json`。你在页面里维护的是“用例定义”，不是直接改脚本内容。
                </div>
              </div>
            </Card>
          </div>

          <div className="xl:col-span-3 space-y-6">
            <Card>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-gray-900">执行项定义</h2>
                {currentRunning && (
                  <Button variant="danger" onClick={handleCancel}>
                    取消当前任务
                  </Button>
                )}
              </div>
              <Textarea
                rows={10}
                value={formData.executionRows}
                onChange={(e) => setFormData((prev) => ({ ...prev, executionRows: e.target.value }))}
                placeholder={'格式：标题|步骤|期望query|期望识别|期望type|期望skill|期望app|期望answer包含|期望weatherText\n打开YouTube|Open YouTube|Open YouTube|Open YouTube|skill|Launcher|YouTube||\n等待|sleep:2|||||||'}
              />
              <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700">
                <p className="font-semibold text-gray-900">输入规则</p>
                <p className="mt-2">每一行就是一个执行项，使用 `|` 分隔字段。</p>
                <p className="mt-1">第 2 列是实际下发给自动化脚本的步骤，可写语音文本，也可写 `sleep:2` / `key:3`。</p>
                <p className="mt-1">控制步骤不会拿结果比对；语音步骤会按顺序和 TV 日志解析结果自动对齐。</p>
              </div>
            </Card>

            <Card>
              <h2 className="mb-4 text-xl font-bold text-gray-900">执行项预览</h2>
              {parsedExecutionItems.length === 0 ? (
                <p className="text-sm text-gray-500">当前还没有可执行步骤。</p>
              ) : (
                <div className="space-y-3">
                  {parsedExecutionItems.map((item, index) => (
                    <div key={`${item.stepText}-${index}`} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-gray-900 px-2 py-1 text-xs font-semibold text-white">
                          Step {index + 1}
                        </span>
                        {item.isControlStep ? (
                          <span className="rounded-full bg-gray-200 px-2 py-1 text-xs font-semibold text-gray-700">控制步骤</span>
                        ) : (
                          <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">语音步骤</span>
                        )}
                        {item.title && (
                          <span className="text-sm font-semibold text-gray-900">{item.title}</span>
                        )}
                      </div>
                      <p className="mt-2 text-sm text-gray-900 break-words">
                        <span className="font-semibold">执行:</span> {item.stepText}
                      </p>
                      {!item.isControlStep && (
                        <p className="mt-1 text-xs text-gray-500 break-words">
                          期望: {[
                            item.expectedQuery && `query=${item.expectedQuery}`,
                            item.expectedRecognizedText && `recognized=${item.expectedRecognizedText}`,
                            item.expectedType && `type=${item.expectedType}`,
                            item.expectedSkill && `skill=${item.expectedSkill}`,
                            item.expectedApp && `app=${item.expectedApp}`,
                            item.expectedAnswerIncludes && `answer~=${item.expectedAnswerIncludes}`,
                            item.expectedWeatherText && `weather=${item.expectedWeatherText}`,
                          ].filter(Boolean).join(' / ') || '未设置断言'}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>

            <Card>
              <h2 className="mb-4 text-xl font-bold text-gray-900">XPath 参数</h2>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <Input
                  label="bluetooth_loading"
                  value={formData.bluetooth_loading}
                  onChange={(e) => setFormData((prev) => ({ ...prev, bluetooth_loading: e.target.value }))}
                />
                <Input
                  label="device_entry"
                  value={formData.device_entry}
                  onChange={(e) => setFormData((prev) => ({ ...prev, device_entry: e.target.value }))}
                />
                <Input
                  label="btn_on"
                  value={formData.btn_on}
                  onChange={(e) => setFormData((prev) => ({ ...prev, btn_on: e.target.value }))}
                />
                <Input
                  label="btn_off"
                  value={formData.btn_off}
                  onChange={(e) => setFormData((prev) => ({ ...prev, btn_off: e.target.value }))}
                />
              </div>
            </Card>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-5">
          <div className="xl:col-span-3">
            <Card>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">执行结果与断言</h2>
                  <p className="mt-1 text-sm text-gray-500">
                    {currentJob ? `${currentJob.id} · ${currentJob.status}` : '暂无任务'}
                  </p>
                </div>
                {currentJob?.resultFilePath && (
                  <p className="text-xs text-gray-400 break-all">结果文件：{currentJob.resultFilePath}</p>
                )}
              </div>

              {!currentJob ? (
                <p className="text-sm text-gray-500">还没有执行记录，先启动一轮用例执行。</p>
              ) : comparedItems.length === 0 ? (
                <p className="text-sm text-gray-500">当前任务没有携带执行项定义，暂时无法做断言比对。</p>
              ) : (
                <div className="space-y-3">
                  {comparedItems.map((item) => (
                    <div key={`${item.itemIndex}-${item.stepText}`} className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full bg-gray-900 px-2 py-1 text-xs font-semibold text-white">
                          Step {item.itemIndex + 1}
                        </span>
                        <span className={`rounded-full px-2 py-1 text-xs font-semibold ${
                          item.isControlStep
                            ? 'bg-gray-200 text-gray-700'
                            : item.passed
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                        }`}>
                          {item.isControlStep ? '控制步骤' : item.passed ? '断言通过' : '断言失败'}
                        </span>
                        {item.title && <span className="text-sm font-semibold text-gray-900">{item.title}</span>}
                      </div>
                      <p className="mt-2 text-sm text-gray-900 break-words">
                        <span className="font-semibold">执行:</span> {item.stepText}
                      </p>

                      {item.isControlStep ? (
                        <p className="mt-2 text-xs text-gray-500">该步骤只控制流程，不参与结果比对。</p>
                      ) : (
                        <>
                          <div className="mt-3 space-y-2">
                            {item.comparisonFields.length === 0 ? (
                              <p className="text-xs text-amber-700">当前步骤没有配置断言字段，已执行但未参与自动判断。</p>
                            ) : (
                              item.comparisonFields.map((field) => (
                                <div key={field.field} className={`rounded-lg border p-3 text-sm ${
                                  field.passed ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                                }`}>
                                  <p className="font-semibold text-gray-900">{field.field}</p>
                                  <p className="mt-1 break-words">期望：{field.expected}</p>
                                  <p className="mt-1 break-words">实际：{field.actual || '-'}</p>
                                </div>
                              ))
                            )}
                          </div>

                          <div className="mt-3 rounded-lg bg-white p-3 text-sm text-gray-700">
                            <p className="font-semibold text-gray-900">TV 日志解析结果</p>
                            <p className="mt-2 break-words">query: {normalizeText(item.actualResult?.query) || '-'}</p>
                            <p className="mt-1 break-words">recognized_text: {normalizeText(item.actualResult?.recognized_text) || '-'}</p>
                            <p className="mt-1 break-words">type / skill: {normalizeText(item.actualResult?.type) || '-'} / {normalizeText(item.actualResult?.skill) || '-'}</p>
                            <p className="mt-1 break-words">app: {normalizeText(item.actualResult?.extra?.app) || '-'}</p>
                            <p className="mt-1 break-words">answer: {normalizeText(item.actualResult?.answer) || '-'}</p>
                            <p className="mt-1 break-words">weatherText: {normalizeText(item.actualResult?.extra?.weatherText) || '-'}</p>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>

          <div className="xl:col-span-2 space-y-6">
            <Card>
              <h2 className="mb-4 text-xl font-bold text-gray-900">执行日志</h2>
              <div className="max-h-96 overflow-auto rounded-lg bg-gray-950 p-4 font-mono text-xs text-green-300">
                {!currentJob || currentJob.logs.length === 0 ? (
                  <p>暂无日志</p>
                ) : (
                  currentJob.logs.map((line, index) => (
                    <p key={`${line}-${index}`} className="whitespace-pre-wrap break-words">
                      {line}
                    </p>
                  ))
                )}
              </div>
            </Card>

            <Card>
              <div className="mb-4 flex items-center justify-between gap-3">
                <h2 className="text-xl font-bold text-gray-900">任务历史</h2>
                <span className="text-sm text-gray-500">{jobs.length} 条</span>
              </div>
              <div className="space-y-3">
                {jobs.length === 0 ? (
                  <p className="text-sm text-gray-500">暂无历史任务</p>
                ) : (
                  jobs.map((job) => (
                    <button
                      key={job.id}
                      type="button"
                      onClick={() => setCurrentJob(job)}
                      className={`w-full rounded-lg border p-4 text-left ${
                        currentJob?.id === job.id
                          ? 'border-blue-300 bg-blue-50'
                          : 'border-gray-200 bg-white hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="font-semibold text-gray-900">{job.id}</p>
                        <span className="text-xs text-gray-500">{job.status}</span>
                      </div>
                      <p className="mt-2 text-xs text-gray-500 break-all">{job.request.scriptPath}</p>
                      <p className="mt-2 text-xs text-gray-400">
                        执行项 {job.request.voiceTextCount} 条
                      </p>
                    </button>
                  ))
                )}
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoiceRecordsPage;
