/**
 * 版本问题列表组件 - 支持附件上传（日志、视频、图片）
 */
import React, { useState, useEffect, useRef } from 'react';
import { VersionIssue, IssueAttachment } from '../../../types/database';
import { fetchVersionIssues, createVersionIssue, updateVersionIssue, deleteVersionIssue, uploadIssueAttachment, deleteIssueAttachment, getAttachmentUrl } from '../../../services/VersionIssueApiClient';

const ZMIND_BASE = 'https://zmind.whaletv.com/issues/';
const SEV_CLS: Record<string, string> = { '低': 'bg-green-100 text-green-800', '中': 'bg-yellow-100 text-yellow-800', '高': 'bg-red-100 text-red-800', '紧急': 'bg-red-200 text-red-900' };
const STA_CLS: Record<string, string> = { '待处理': 'bg-gray-100 text-gray-800', '处理中': 'bg-blue-100 text-blue-800', '已解决': 'bg-green-100 text-green-800', '已关闭': 'bg-gray-200 text-gray-500' };
const FT_ICON: Record<string, string> = { image: '🖼️', video: '🎬', log: '📄', other: '📎' };
function fmtSz(b: number) { if (b < 1024) return b + ' B'; if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'; return (b / 1048576).toFixed(1) + ' MB'; }
const STATUSES: VersionIssue['status'][] = ['待处理', '处理中', '已解决', '已关闭'];

const VersionIssueList: React.FC<{ versionRecordId: string; versionNumber: string }> = ({ versionRecordId }) => {
  const [issues, setIssues] = useState<VersionIssue[]>([]);
  const [loading, setLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ title: '', description: '', severity: '中', linkedPR: '', reporter: '' });
  const load = async () => { setLoading(true); try { setIssues(await fetchVersionIssues(versionRecordId)); } catch {} setLoading(false); };
  useEffect(() => { load(); }, [versionRecordId]);
  const onCreate = async () => {
    if (!form.title.trim() || !form.reporter.trim()) return;
    await createVersionIssue({ versionRecordId, ...form }); setForm({ ...form, title: '', description: '', linkedPR: '' }); setShowForm(false); load();
  };
  const onStatus = async (iss: VersionIssue, s: string) => { await updateVersionIssue(iss.id!, { status: s as any }); load(); };
  const onResolution = async (id: string, r: string) => { await updateVersionIssue(id, { resolution: r }); setEditingId(null); load(); };
  const onDel = async (id: string) => { if (!confirm('确定删除此问题？')) return; await deleteVersionIssue(id); load(); };
  return (
    <div className="mt-4 border-t border-gray-200 pt-4">
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-sm font-semibold text-gray-900">📋 问题列表 <span className="ml-2 text-xs font-normal text-gray-500">({issues.length} 条)</span></h4>
        <button type="button" onClick={() => setShowForm(!showForm)} className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700">{showForm ? '取消' : '+ 提问题'}</button>
      </div>
      {showForm && <CreateForm form={form} setForm={setForm} onCreate={onCreate} />}
      {loading ? <p className="text-sm text-gray-500 py-2">加载中...</p> : issues.length === 0 ? <p className="text-sm text-gray-400 py-2">暂无问题记录</p> : (
        <div className="space-y-2">{issues.map(iss => <IssueCard key={iss.id} issue={iss} editingId={editingId} onStatus={onStatus} onEdit={setEditingId} onResolution={onResolution} onDel={onDel} onRefresh={load} />)}</div>
      )}
    </div>
  );
};
export default VersionIssueList;

const CreateForm: React.FC<{ form: any; setForm: (f: any) => void; onCreate: () => void }> = ({ form, setForm, onCreate }) => (
  <div className="bg-gray-50 rounded-lg p-3 mb-3 space-y-2">
    <div className="grid grid-cols-2 gap-2">
      <input type="text" placeholder="问题标题 *" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <input type="text" placeholder="提交人 *" value={form.reporter} onChange={e => setForm({ ...form, reporter: e.target.value })} className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
    </div>
    <textarea placeholder="问题描述（可选）" value={form.description} rows={2} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
    <div className="grid grid-cols-3 gap-2">
      <select value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })} className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
        <option value="低">低</option><option value="中">中</option><option value="高">高</option><option value="紧急">紧急</option>
      </select>
      <input type="text" placeholder="关联 PR 号（可选）" value={form.linkedPR} onChange={e => setForm({ ...form, linkedPR: e.target.value })} className="px-3 py-1.5 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
      <button type="button" onClick={onCreate} disabled={!form.title.trim() || !form.reporter.trim()} className="px-3 py-1.5 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed">提交</button>
    </div>
  </div>
);

const IssueCard: React.FC<{
  issue: VersionIssue; editingId: string | null;
  onStatus: (iss: VersionIssue, s: string) => void; onEdit: (id: string | null) => void;
  onResolution: (id: string, r: string) => void; onDel: (id: string) => void; onRefresh: () => void;
}> = ({ issue, editingId, onStatus, onEdit, onResolution, onDel, onRefresh }) => {
  const [res, setRes] = useState(issue.resolution || '');
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const atts = issue.attachments || [];
  const doUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files; if (!files?.length) return;
    setUploading(true);
    try { for (let i = 0; i < files.length; i++) { setProgress(0); await uploadIssueAttachment(issue.id!, files[i], setProgress); } onRefresh(); }
    catch (err) { alert('上传失败: ' + (err as Error).message); }
    setUploading(false); if (fileRef.current) fileRef.current.value = '';
  };
  const doDelAtt = async (a: IssueAttachment) => {
    if (!confirm(`确定删除附件 "${a.fileName}"？`)) return;
    try { await deleteIssueAttachment(issue.id!, a.savedFileName); onRefresh(); } catch (err) { alert('删除失败: ' + (err as Error).message); }
  };
  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 hover:shadow-sm transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-sm text-gray-900">{issue.title}</span>
            <span className={`px-2 py-0.5 rounded text-xs ${SEV_CLS[issue.severity] || ''}`}>{issue.severity}</span>
            <span className={`px-2 py-0.5 rounded text-xs ${STA_CLS[issue.status] || ''}`}>{issue.status}</span>
            {issue.linkedPR && <a href={`${ZMIND_BASE}${issue.linkedPR}`} target="_blank" rel="noopener noreferrer" className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded text-xs hover:underline">PR#{issue.linkedPR}</a>}
          </div>
          {issue.description && <p className="text-xs text-gray-600 mt-1 line-clamp-2">{issue.description}</p>}
          <div className="flex items-center gap-3 mt-1.5 text-xs text-gray-400">
            <span>提交人: {issue.reporter}</span>{issue.assignee && <span>处理人: {issue.assignee}</span>}
            <span>{new Date(issue.createdAt).toLocaleString('zh-CN')}</span>
          </div>
          {issue.resolution && editingId !== issue.id && <div className="mt-1.5 px-2 py-1 bg-green-50 border border-green-200 rounded text-xs text-green-800">💡 解决备注: {issue.resolution}</div>}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <select value={issue.status} onChange={e => onStatus(issue, e.target.value)} className="px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500">
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <label className="px-2 py-1 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded cursor-pointer" title="上传附件（日志/视频/图片）">
            📎<input ref={fileRef} type="file" multiple className="hidden" accept="image/*,video/*,.log,.txt,.csv,.json,.xml,.zip,.rar,.7z" onChange={doUpload} />
          </label>
          <button type="button" onClick={() => onEdit(editingId === issue.id ? null : issue.id!)} className="px-2 py-1 text-xs text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded" title="解决备注">📝</button>
          <button type="button" onClick={() => onDel(issue.id!)} className="px-2 py-1 text-xs text-gray-400 hover:text-red-600 hover:bg-red-50 rounded" title="删除">🗑</button>
        </div>
      </div>
      {uploading && <div className="mt-2 flex items-center gap-2 text-xs text-blue-600"><div className="flex-1 bg-gray-200 rounded-full h-1.5"><div className="bg-blue-600 h-1.5 rounded-full transition-all" style={{ width: `${progress}%` }} /></div><span>{progress}%</span></div>}
      {editingId === issue.id && <div className="mt-2 flex gap-2"><input type="text" value={res} placeholder="输入解决备注..." onChange={e => setRes(e.target.value)} className="flex-1 px-2 py-1 border border-gray-300 rounded text-xs focus:outline-none focus:ring-1 focus:ring-blue-500" /><button type="button" onClick={() => onResolution(issue.id!, res)} className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">保存</button></div>}
      {atts.length > 0 && <div className="mt-2 border-t border-gray-100 pt-2"><p className="text-xs text-gray-500 mb-1.5">📎 附件 ({atts.length})</p><div className="flex flex-wrap gap-2">{atts.map((a, i) => <AttItem key={i} att={a} onDel={() => doDelAtt(a)} onPrev={url => setPreview(url)} />)}</div></div>}
      {preview && <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-8" onClick={() => setPreview(null)}><div className="relative max-w-4xl max-h-full" onClick={e => e.stopPropagation()}>{preview.match(/\.(mp4|webm|mov)/) ? <video src={preview} controls autoPlay className="max-h-[80vh] rounded-lg" /> : <img src={preview} alt="预览" className="max-h-[80vh] rounded-lg" />}<button type="button" onClick={() => setPreview(null)} className="absolute top-2 right-2 w-8 h-8 bg-black/50 text-white rounded-full flex items-center justify-center hover:bg-black/70 text-lg">✕</button></div></div>}
    </div>
  );
};

const AttItem: React.FC<{ att: IssueAttachment; onDel: () => void; onPrev: (url: string) => void }> = ({ att, onDel, onPrev }) => {
  const url = getAttachmentUrl(att.filePath);
  const icon = FT_ICON[att.fileType] || '📎';
  const canPrev = att.fileType === 'image' || att.fileType === 'video';
  return (
    <div className="group flex items-center gap-1.5 px-2 py-1 bg-gray-50 border border-gray-200 rounded text-xs hover:bg-gray-100">
      <span>{icon}</span>
      {canPrev ? <button type="button" onClick={() => onPrev(url)} className="text-blue-600 hover:underline truncate max-w-[140px]" title={att.fileName}>{att.fileName}</button>
        : <a href={url} download className="text-blue-600 hover:underline truncate max-w-[140px]" title={att.fileName}>{att.fileName}</a>}
      <span className="text-gray-400">{fmtSz(att.fileSize)}</span>
      {canPrev && <a href={url} download title="下载" className="text-gray-400 hover:text-blue-600">⬇</a>}
      <button type="button" onClick={onDel} title="删除附件" className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
    </div>
  );
};
