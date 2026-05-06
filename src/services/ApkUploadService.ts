/**
 * APK 上传服务
 * 前端调用，将 APK 文件上传到服务端本地存储
 */

/** 自动获取服务端地址 */
function getApiBaseUrl(): string {
  return `${window.location.protocol}//${window.location.host}`;
}

export interface ApkSignBrand {
  key: string;
  label: string;
}

/** APK 上传结果 */
export interface ApkUploadResult {
  success: boolean;
  message: string;
  data?: {
    fileName: string;
    savedFileName: string;
    filePath: string;
    fileSize: number;
    fileSizeFormatted: string;
    uploadedAt: string;
  };
  error?: string;
}

/**
 * 上传 APK 文件到服务端
 */
export async function uploadApk(
  file: File,
  onProgress?: (percent: number) => void
): Promise<ApkUploadResult> {
  const baseUrl = getApiBaseUrl();

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${baseUrl}/api/apk/upload`);
    xhr.setRequestHeader('x-file-name', encodeURIComponent(file.name));
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    };

    xhr.onload = () => {
      try {
        const result = JSON.parse(xhr.responseText);
        resolve(result);
      } catch {
        resolve({ success: false, message: '解析响应失败' });
      }
    };

    xhr.onerror = () => {
      reject(new Error('网络错误，请检查服务端是否运行'));
    };

    xhr.send(file);
  });
}

/**
 * 获取 APK 下载链接
 */
export function getApkDownloadUrl(filePath: string): string {
  return `${getApiBaseUrl()}${filePath}`;
}

export function getSignedApkDownloadUrl(filePath: string, brandKey: string): string {
  const fileName = filePath.split('/').pop();
  if (!fileName) {
    throw new Error('无效的 APK 下载路径');
  }
  return `${getApiBaseUrl()}/api/apk/download-signed/${encodeURIComponent(brandKey)}/${encodeURIComponent(fileName)}`;
}

export async function fetchApkSignBrands(): Promise<ApkSignBrand[]> {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/apk/sign-brands`);
  const result = await res.json();

  if (!res.ok || !result.success) {
    throw new Error(result.message || '获取品牌签名列表失败');
  }

  return result.data || [];
}

/**
 * 删除服务端 APK 文件
 */
export async function deleteApk(fileName: string): Promise<{ success: boolean; message: string }> {
  const baseUrl = getApiBaseUrl();
  const res = await fetch(`${baseUrl}/api/apk/delete/${encodeURIComponent(fileName)}`, {
    method: 'DELETE',
  });
  return res.json();
}

/**
 * 格式化文件大小
 */
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
