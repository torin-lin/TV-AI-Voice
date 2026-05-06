import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../components/common/Card';
import { Input } from '../components/common/Input';
import { useI18n } from '../i18n/I18nProvider';
import { ReleaseNote } from '../types/database';
import { apiQueryReleaseNotesFlat } from '../services/ReleaseNoteApiClient';
import {
  ApkSignBrand,
  fetchApkSignBrands,
  getApkDownloadUrl,
  getSignedApkDownloadUrl,
} from '../services/ApkUploadService';
import { useSelector } from 'react-redux';
import { RootState } from '../store';

type ApkVersionGroup = {
  groupKey: string;
  projectType: string;
  parentVersion: string;
  records: ReleaseNote[];
  apkRecords: ReleaseNote[];
  latestRecord?: ReleaseNote;
  latestApkRecord?: ReleaseNote;
};

const PROJECT_NAME_MAP: Record<string, string> = {
  TV: 'TV AI Voice',
  Projector: 'Projector AI Voice',
  STB: 'STB AI Voice',
};

const getProjectTypeLabel = (projectType?: string) => {
  if (!projectType) {
    return '未标注项目';
  }
  return PROJECT_NAME_MAP[projectType] || projectType;
};

const getSmokeClass = (status?: string) => {
  if (status === '通过') return 'bg-green-100 text-green-700';
  if (status === '失败') return 'bg-red-100 text-red-700';
  return 'bg-gray-100 text-gray-600';
};

const ProjectApkManagementPage: React.FC = () => {
  const { formatDateTime } = useI18n();
  const currentProject = useSelector((state: RootState) => state.project.currentProject);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [keyword, setKeyword] = useState('');
  const [records, setRecords] = useState<ReleaseNote[]>([]);
  const [brandOptions, setBrandOptions] = useState<ApkSignBrand[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<Record<string, string>>({});

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError('');
      try {
        const projectGroup = currentProject !== '全部' ? currentProject : undefined;
        const [result, brands] = await Promise.all([
          apiQueryReleaseNotesFlat(projectGroup ? { projectGroup } : {}, { page: 1, pageSize: 1000 }),
          fetchApkSignBrands(),
        ]);
        setRecords(result.data);
        setBrandOptions(brands);
      } catch (err) {
        setError((err as Error).message || '加载 APK 管理数据失败');
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [currentProject]);

  const handleBrandChange = (recordKey: string, brandKey: string) => {
    setSelectedBrands((prev) => ({
      ...prev,
      [recordKey]: brandKey,
    }));
  };

  const filteredRecords = useMemo(() => {
    const normalizedKeyword = keyword.trim().toLowerCase();
    if (!normalizedKeyword) {
      return records;
    }

    return records.filter((record) => {
      const searchText = [
        record.version,
        record.parentVersion,
        record.branch,
        record.author,
        record.changeDescription,
        record.apkFileName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return searchText.includes(normalizedKeyword);
    });
  }, [keyword, records]);

  const groups = useMemo<ApkVersionGroup[]>(() => {
    const groupMap = new Map<string, ApkVersionGroup>();

    filteredRecords.forEach((record) => {
      const parentVersion = record.parentVersion || record.version;
      const projectType = record.projectType || 'unknown';
      const groupKey = `${projectType}::${parentVersion}`;
      const currentGroup = groupMap.get(groupKey);

      if (!currentGroup) {
        groupMap.set(groupKey, {
          groupKey,
          projectType,
          parentVersion,
          records: [record],
          apkRecords: record.apkFilePath ? [record] : [],
          latestRecord: record,
          latestApkRecord: record.apkFilePath ? record : undefined,
        });
        return;
      }

      currentGroup.records.push(record);
      if (!currentGroup.latestRecord || record.updatedAt > currentGroup.latestRecord.updatedAt) {
        currentGroup.latestRecord = record;
      }
      if (record.apkFilePath) {
        currentGroup.apkRecords.push(record);
        if (!currentGroup.latestApkRecord || record.updatedAt > currentGroup.latestApkRecord.updatedAt) {
          currentGroup.latestApkRecord = record;
        }
      }
    });

    return [...groupMap.values()]
      .map((group) => ({
        ...group,
        records: [...group.records].sort((a, b) => b.updatedAt - a.updatedAt),
        apkRecords: [...group.apkRecords].sort((a, b) => b.updatedAt - a.updatedAt),
      }))
      .sort((a, b) => (b.latestRecord?.updatedAt || 0) - (a.latestRecord?.updatedAt || 0));
  }, [filteredRecords]);

  const stats = useMemo(() => {
    const apkCount = filteredRecords.filter((record) => Boolean(record.apkFilePath)).length;
    const missingApkCount = filteredRecords.filter((record) => !record.apkFilePath).length;
    const latestUpdatedAt = [...filteredRecords].sort((a, b) => b.updatedAt - a.updatedAt)[0]?.updatedAt;

    return {
      totalVersions: filteredRecords.length,
      totalGroups: groups.length,
      apkCount,
      missingApkCount,
      latestUpdatedAt,
    };
  }, [filteredRecords, groups.length]);

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto w-full space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">项目 APK 管理</h1>
            <p className="mt-2 text-gray-600">
              按项目和主版本聚合 APK，适合单个项目查看当前包覆盖、缺口和最新交付。
            </p>
            <p className="mt-2 text-sm text-gray-500">
              当前视角：{currentProject === '全部' ? '全部项目' : currentProject}
            </p>
          </div>
          <div className="w-full max-w-md">
            <Input
              type="text"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="搜索版本号、APK 文件名、作者或分支"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Card>
            <p className="text-sm text-gray-500">版本记录数</p>
            <p className="mt-3 text-3xl font-bold text-gray-900">{stats.totalVersions}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">主版本分组</p>
            <p className="mt-3 text-3xl font-bold text-blue-600">{stats.totalGroups}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">已上传 APK</p>
            <p className="mt-3 text-3xl font-bold text-green-600">{stats.apkCount}</p>
          </Card>
          <Card>
            <p className="text-sm text-gray-500">缺少 APK</p>
            <p className="mt-3 text-3xl font-bold text-amber-600">{stats.missingApkCount}</p>
            <p className="mt-2 text-xs text-gray-400">
              最近更新：{stats.latestUpdatedAt ? formatDateTime(stats.latestUpdatedAt) : '-'}
            </p>
          </Card>
        </div>

        <Card className="border border-blue-100 bg-blue-50">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-sm font-semibold text-blue-900">管理建议</p>
              <p className="mt-1 text-sm text-blue-800">
                现在这页已经能做“单项目 APK 台账”。后续最适合继续补的是 APK 状态流转、默认推荐包、自动清理旧包和发布前核包提醒。
              </p>
            </div>
            <Link
              to="/release-notes"
              className="inline-flex rounded-lg border border-gray-200 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              去补 Release Note / APK
            </Link>
          </div>
        </Card>

        {loading && (
          <Card>
            <p className="text-sm text-gray-500">加载 APK 管理数据中...</p>
          </Card>
        )}

        {error && (
          <Card className="border border-red-200 bg-red-50">
            <p className="text-sm text-red-700">{error}</p>
          </Card>
        )}

        {!loading && !error && groups.length === 0 && (
          <Card>
            <p className="text-sm text-gray-500">当前筛选条件下没有版本记录。</p>
          </Card>
        )}

        {!loading && !error && groups.length > 0 && (
          <div className="space-y-4">
            {groups.map((group) => {
              const missingCount = group.records.length - group.apkRecords.length;
              const latestApk = group.latestApkRecord;

              return (
                <Card key={group.groupKey} className="overflow-hidden">
                  <div className="border-b border-gray-100 bg-gray-50 px-5 py-4">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="text-xl font-bold text-gray-900">{group.parentVersion}</h2>
                          <span className="rounded-full bg-gray-900 px-2 py-1 text-xs font-semibold text-white">
                            {getProjectTypeLabel(group.projectType)}
                          </span>
                          <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                            APK {group.apkRecords.length}
                          </span>
                          {missingCount > 0 && (
                            <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                              待补 {missingCount}
                            </span>
                          )}
                        </div>
                        <p className="mt-2 text-sm text-gray-500">
                          最近版本更新：{group.latestRecord ? formatDateTime(group.latestRecord.updatedAt) : '-'}
                        </p>
                      </div>
                      <div className="text-right text-sm text-gray-500">
                        <p>子版本数：{group.records.length}</p>
                        <p>最新 APK：{latestApk ? latestApk.version : '暂无'}</p>
                      </div>
                    </div>
                  </div>

                  <div className="divide-y divide-gray-100">
                    {group.records.map((record) => {
                      const workbenchVersion = record.parentVersion || record.version;
                      const recordKey = record.id || `${record.version}-${record.createdAt}`;
                      const selectedBrand = selectedBrands[recordKey] || brandOptions[0]?.key || '';
                      return (
                        <div key={recordKey} className="px-5 py-4">
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-gray-900 break-all">{record.version}</p>
                                <span className={`rounded-full px-2 py-1 text-xs font-semibold ${getSmokeClass(record.rdSmokeStatus)}`}>
                                  RD 冒烟 {record.rdSmokeStatus || '未测试'}
                                </span>
                                {record.apkFilePath ? (
                                  <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
                                    已挂 APK
                                  </span>
                                ) : (
                                  <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                                    缺少 APK
                                  </span>
                                )}
                              </div>
                              <p className="mt-2 text-sm text-gray-600 break-words">{record.changeDescription}</p>
                              <p className="mt-2 text-xs text-gray-500 break-words">
                                分支 {record.branch} · 作者 {record.author} · 更新时间 {formatDateTime(record.updatedAt)}
                              </p>
                              {record.apkFileName ? (
                                <p className="mt-2 text-xs text-gray-500 break-all">
                                  文件 {record.apkFileName}
                                  {record.apkFileSize ? ` · ${(record.apkFileSize / (1024 * 1024)).toFixed(1)} MB` : ''}
                                </p>
                              ) : (
                                <p className="mt-2 text-xs text-amber-700">
                                  当前版本还没有上传 APK，建议补齐后再作为交付候选。
                                </p>
                              )}
                            </div>

                            <div className="flex flex-wrap gap-2">
                              {record.apkFilePath && (
                                <>
                                  <a
                                    href={getApkDownloadUrl(record.apkFilePath)}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                                  >
                                    原包下载
                                  </a>
                                  <select
                                    value={selectedBrand}
                                    onChange={(e) => handleBrandChange(recordKey, e.target.value)}
                                    className="min-w-[120px] rounded-lg border border-green-200 bg-white px-3 py-2 text-sm text-gray-700 focus:border-green-400 focus:outline-none"
                                  >
                                    {brandOptions.map((brand) => (
                                      <option key={brand.key} value={brand.key}>
                                        {brand.label}
                                      </option>
                                    ))}
                                  </select>
                                  <a
                                    href={selectedBrand ? getSignedApkDownloadUrl(record.apkFilePath, selectedBrand) : undefined}
                                    target="_blank"
                                    rel="noreferrer"
                                    className={`inline-flex rounded-lg px-3 py-2 text-sm ${
                                      selectedBrand
                                        ? 'border border-green-200 bg-green-50 text-green-700 hover:bg-green-100'
                                        : 'cursor-not-allowed border border-gray-200 bg-gray-100 text-gray-400'
                                    }`}
                                    aria-disabled={!selectedBrand}
                                    onClick={(event) => {
                                      if (!selectedBrand) {
                                        event.preventDefault();
                                      }
                                    }}
                                  >
                                    下载签名 APK
                                  </a>
                                </>
                              )}
                              <Link
                                to={`/release-notes?keyword=${encodeURIComponent(record.version)}`}
                                className="inline-flex rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                              >
                                查看 RD
                              </Link>
                              <Link
                                to={`/version-workbench/${encodeURIComponent(workbenchVersion)}${record.projectType ? `?projectType=${encodeURIComponent(record.projectType)}` : ''}`}
                                className="inline-flex rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-700 hover:bg-blue-100"
                              >
                                进入工作台
                              </Link>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ProjectApkManagementPage;
