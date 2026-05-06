import fs from 'fs';
import os from 'os';
import path from 'path';
import crypto from 'crypto';
import { spawn, spawnSync, ChildProcess } from 'child_process';

type VoiceAutomationJobStatus = 'pending' | 'running' | 'success' | 'failed' | 'cancelled';

type VoiceAutomationRequest = {
  scriptPath: string;
  pythonExecutable?: string;
  adbSerial: string;
  tvSerial: string;
  mihomePackage: string;
  endTime: string;
  lang: string;
  voiceTexts: string[];
  executionItems?: Array<{
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
  }>;
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
};

type VoiceAutomationJob = {
  id: string;
  status: VoiceAutomationJobStatus;
  createdAt: number;
  startedAt?: number;
  finishedAt?: number;
  request: Omit<VoiceAutomationRequest, 'voiceTexts'> & { voiceTextsPreview: string[]; voiceTextCount: number };
  runDir?: string;
  configPath?: string;
  resultFilePath?: string;
  logs: string[];
  results: any[];
  exitCode?: number | null;
  error?: string;
};

type VoiceAutomationJobRuntime = VoiceAutomationJob & {
  child?: ChildProcess;
};

const jobs = new Map<string, VoiceAutomationJobRuntime>();
const MAX_JOB_LOGS = 600;
const MAX_JOB_RESULTS = 500;

const DEFAULT_TTS = {
  default_voice: 'en-US-JennyNeural',
  voices: {
    en: 'en-US-JennyNeural',
    zh: 'zh-CN-XiaoxiaoNeural',
  },
};

function appendJobLog(job: VoiceAutomationJobRuntime, message: string): void {
  const line = `[${new Date().toISOString()}] ${message}`;
  job.logs.push(line);
  if (job.logs.length > MAX_JOB_LOGS) {
    job.logs.splice(0, job.logs.length - MAX_JOB_LOGS);
  }
}

function toPublicJob(job: VoiceAutomationJobRuntime) {
  return {
    id: job.id,
    status: job.status,
    createdAt: job.createdAt,
    startedAt: job.startedAt,
    finishedAt: job.finishedAt,
    request: job.request,
    runDir: job.runDir,
    configPath: job.configPath,
    resultFilePath: job.resultFilePath,
    logs: job.logs,
    results: job.results,
    exitCode: job.exitCode,
    error: job.error,
  };
}

function findRunningJob(): VoiceAutomationJobRuntime | undefined {
  return [...jobs.values()].find((job) => job.status === 'pending' || job.status === 'running');
}

function ensureAbsoluteExistingFile(filePath: string, fieldName: string): string {
  if (!filePath?.trim()) {
    throw new Error(`${fieldName} 不能为空`);
  }

  const resolved = path.resolve(filePath);
  if (!path.isAbsolute(resolved)) {
    throw new Error(`${fieldName} 必须是绝对路径`);
  }
  if (!fs.existsSync(resolved)) {
    throw new Error(`${fieldName} 不存在: ${resolved}`);
  }
  return resolved;
}

function normalizeVoiceTexts(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value
    .map((item) => String(item || '').trim())
    .filter(Boolean);
}

function parseResultFile(resultFilePath: string): any[] {
  if (!fs.existsSync(resultFilePath)) {
    return [];
  }

  return fs
    .readFileSync(resultFilePath, 'utf-8')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(-MAX_JOB_RESULTS)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return { raw: line };
      }
    });
}

function buildConfig(body: VoiceAutomationRequest) {
  return {
    adb_serial: body.adbSerial,
    TV_SERIAL: body.tvSerial,
    mihome_package: body.mihomePackage,
    End_time: body.endTime,
    lang: body.lang,
    voice_texts: body.voiceTexts,
    xpath: {
      bluetooth_loading: body.xpath.bluetooth_loading,
      device_entry: body.xpath.device_entry,
      btn_on: body.xpath.btn_on,
      btn_off: body.xpath.btn_off,
    },
    tts: {
      ...DEFAULT_TTS,
      ...(body.tts || {}),
      voices: {
        ...DEFAULT_TTS.voices,
        ...(body.tts?.voices || {}),
      },
    },
  };
}

function killJobProcess(job: VoiceAutomationJobRuntime): void {
  const pid = job.child?.pid;
  if (!pid) {
    return;
  }

  if (process.platform === 'win32') {
    spawnSync('taskkill', ['/pid', String(pid), '/t', '/f'], { stdio: 'ignore' });
  } else {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      // noop
    }
  }
}

function resolvePythonExecutable(command: string): string {
  const candidates = [command, 'python', 'py'];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }

    const probeArgs = candidate === 'py' ? ['-3', '--version'] : ['--version'];
    const probe = spawnSync(candidate, probeArgs, { stdio: 'ignore', shell: true });
    if (probe.status === 0) {
      return candidate;
    }
  }

  return command || 'python';
}

function buildPythonArgs(executable: string, scriptFileName: string): string[] {
  if (executable === 'py') {
    return ['-3', scriptFileName];
  }
  return [scriptFileName];
}

export function setupVoiceAutomationRoutes(app: any): void {
  app.get('/api/voice-automation/jobs', (_req: any, res: any) => {
    const data = [...jobs.values()]
      .sort((a, b) => b.createdAt - a.createdAt)
      .map(toPublicJob);
    res.json({ success: true, data });
  });

  app.get('/api/voice-automation/jobs/:id', (req: any, res: any) => {
    const job = jobs.get(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: '任务不存在' });
    }
    res.json({ success: true, data: toPublicJob(job) });
  });

  app.post('/api/voice-automation/jobs', (req: any, res: any) => {
    try {
      const runningJob = findRunningJob();
      if (runningJob) {
        return res.status(409).json({
          success: false,
          message: `当前已有执行中的任务：${runningJob.id}，请先等待完成或取消`,
        });
      }

      const body = req.body as VoiceAutomationRequest;
      const scriptPath = ensureAbsoluteExistingFile(body.scriptPath, 'scriptPath');
      const pythonExecutable = resolvePythonExecutable(String(body.pythonExecutable || 'python').trim());
      const voiceTexts = normalizeVoiceTexts(body.voiceTexts);

      if (voiceTexts.length === 0) {
        return res.status(400).json({ success: false, message: '至少需要 1 条语音指令' });
      }
      if (!body.adbSerial?.trim()) {
        return res.status(400).json({ success: false, message: 'adbSerial 不能为空' });
      }
      if (!body.tvSerial?.trim()) {
        return res.status(400).json({ success: false, message: 'tvSerial 不能为空' });
      }
      if (!body.mihomePackage?.trim()) {
        return res.status(400).json({ success: false, message: 'mihomePackage 不能为空' });
      }
      if (!body.endTime?.trim()) {
        return res.status(400).json({ success: false, message: 'endTime 不能为空' });
      }
      if (!body.xpath?.bluetooth_loading || !body.xpath?.device_entry || !body.xpath?.btn_on || !body.xpath?.btn_off) {
        return res.status(400).json({ success: false, message: 'xpath 参数不完整' });
      }

      const id = `voice_job_${crypto.randomBytes(4).toString('hex')}`;
      const runDir = path.join(os.tmpdir(), 'tv-ai-voice-automation', id);
      fs.mkdirSync(runDir, { recursive: true });

      const scriptFileName = path.basename(scriptPath);
      const copiedScriptPath = path.join(runDir, scriptFileName);
      fs.copyFileSync(scriptPath, copiedScriptPath);

      const configPath = path.join(runDir, 'config.json');
      fs.writeFileSync(
        configPath,
        JSON.stringify(buildConfig({ ...body, scriptPath, pythonExecutable, voiceTexts }), null, 2),
        'utf-8'
      );

      const resultFilePath = path.join(runDir, 'ai_voice_result.jsonl');

      const job: VoiceAutomationJobRuntime = {
        id,
        status: 'pending',
        createdAt: Date.now(),
        request: {
          scriptPath,
          pythonExecutable,
          adbSerial: body.adbSerial,
          tvSerial: body.tvSerial,
          mihomePackage: body.mihomePackage,
          endTime: body.endTime,
          lang: body.lang,
          xpath: body.xpath,
          tts: buildConfig({ ...body, scriptPath, pythonExecutable, voiceTexts }).tts,
          voiceTextsPreview: voiceTexts.slice(0, 10),
          voiceTextCount: voiceTexts.length,
          executionItems: Array.isArray(body.executionItems) ? body.executionItems : [],
        },
        runDir,
        configPath,
        resultFilePath,
        logs: [],
        results: [],
      };

      jobs.set(id, job);
      appendJobLog(job, `任务已创建，运行目录: ${runDir}`);
      appendJobLog(job, `准备执行脚本: ${scriptPath}`);
      appendJobLog(job, `Python: ${pythonExecutable}`);

      const child = spawn(
        pythonExecutable,
        buildPythonArgs(pythonExecutable, scriptFileName),
        {
          cwd: runDir,
          shell: true,
          stdio: ['ignore', 'pipe', 'pipe'],
        }
      );

      job.child = child;
      job.status = 'running';
      job.startedAt = Date.now();

      child.stdout.on('data', (chunk) => {
        const text = chunk.toString('utf-8');
        text
          .split(/\r?\n/)
          .map((line: string) => line.trim())
          .filter(Boolean)
          .forEach((line: string) => appendJobLog(job, line));
      });

      child.stderr.on('data', (chunk) => {
        const text = chunk.toString('utf-8');
        text
          .split(/\r?\n/)
          .map((line: string) => line.trim())
          .filter(Boolean)
          .forEach((line: string) => appendJobLog(job, `[stderr] ${line}`));
      });

      child.on('error', (error) => {
        job.status = 'failed';
        job.finishedAt = Date.now();
        job.error = error.message;
        appendJobLog(job, `任务启动失败: ${error.message}`);
      });

      child.on('close', (code) => {
        job.child = undefined;
        job.finishedAt = Date.now();
        job.exitCode = code;
        job.results = parseResultFile(resultFilePath);

        if (job.status === 'cancelled') {
          appendJobLog(job, '任务已取消');
          return;
        }

        if (code === 0) {
          job.status = 'success';
          appendJobLog(job, `任务完成，共产出 ${job.results.length} 条结果`);
        } else {
          job.status = 'failed';
          job.error = `脚本退出码 ${code}`;
          appendJobLog(job, `任务失败，退出码 ${code}`);
        }
      });

      res.json({ success: true, data: toPublicJob(job) });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : '创建语音自动化任务失败',
      });
    }
  });

  app.post('/api/voice-automation/jobs/:id/cancel', (req: any, res: any) => {
    const job = jobs.get(req.params.id);
    if (!job) {
      return res.status(404).json({ success: false, message: '任务不存在' });
    }
    if (job.status !== 'pending' && job.status !== 'running') {
      return res.status(400).json({ success: false, message: '当前任务不可取消' });
    }

    job.status = 'cancelled';
    job.finishedAt = Date.now();
    appendJobLog(job, '收到取消请求，正在终止子进程');
    killJobProcess(job);
    job.child = undefined;

    res.json({ success: true, data: toPublicJob(job) });
  });
}
