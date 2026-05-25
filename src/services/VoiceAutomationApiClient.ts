export type VoiceAutomationJobStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled';

export interface VoiceAutomationExecutionItem {
  title?: string;
  stepText: string;
  isControlStep?: boolean;
  expectedQuery?: string;
  expectedRecognizedText?: string;
  expectedType?: string;
  expectedSkill?: string;
  expectedAnswerIncludes?: string;
  expectedApp?: string;
  expectedWeatherText?: string;
}

export interface VoiceAutomationRequestPayload {
  scriptPath: string;
  pythonExecutable?: string;
  adbSerial: string;
  tvSerial: string;
  mihomePackage: string;
  endTime: string;
  lang: string;
  voiceTexts: string[];
  executionItems?: VoiceAutomationExecutionItem[];
  xpath: {
    bluetooth_loading: string;
    device_entry: string;
    btn_on: string;
    btn_off: string;
  };
  tts?: {
    default_voice?: string;
    voices?: Record<string, string>;
  };
}

export interface VoiceAutomationJob {
  id: string;
  status: VoiceAutomationJobStatus;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  request: {
    scriptPath: string;
    pythonExecutable?: string;
    adbSerial: string;
    tvSerial: string;
    mihomePackage: string;
    endTime: string;
    lang: string;
    xpath: VoiceAutomationRequestPayload['xpath'];
    tts?: VoiceAutomationRequestPayload['tts'];
    voiceTextsPreview: string[];
    voiceTextCount: number;
    executionItems?: VoiceAutomationExecutionItem[];
  };
  runDir?: string;
  configPath?: string;
  resultFilePath?: string;
  logs: string[];
  results: Array<Record<string, any>>;
  exitCode?: number | null;
  error?: string;
}

function getBaseUrl(): string {
  return `${window.location.protocol}//${window.location.host}`;
}

import { authFetch } from './authFetch';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await authFetch(`${getBaseUrl()}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || json.success === false) {
    throw new Error(json.message || `请求失败: ${res.status}`);
  }
  return json.data as T;
}

export async function apiStartVoiceAutomation(payload: VoiceAutomationRequestPayload): Promise<VoiceAutomationJob> {
  return apiFetch<VoiceAutomationJob>('/api/voice-automation/jobs', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function apiGetVoiceAutomationJob(id: string): Promise<VoiceAutomationJob> {
  return apiFetch<VoiceAutomationJob>(`/api/voice-automation/jobs/${id}`);
}

export async function apiListVoiceAutomationJobs(): Promise<VoiceAutomationJob[]> {
  return apiFetch<VoiceAutomationJob[]>('/api/voice-automation/jobs');
}

export async function apiCancelVoiceAutomationJob(id: string): Promise<VoiceAutomationJob> {
  return apiFetch<VoiceAutomationJob>(`/api/voice-automation/jobs/${id}/cancel`, {
    method: 'POST',
  });
}
