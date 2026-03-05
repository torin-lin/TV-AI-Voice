/**
 * 文档上传服务（前端）
 */

function getApiBaseUrl(): string {
  return `${window.location.protocol}//${window.location.host}`;
}

export interface DocUploadResult {
  success: boolean;
  message: string;
  data?: {
    fileName: string;
    savedFileName: string;
    filePath: string;
    fileSize: number;
    fileSizeFormatted: string;
  };
}

/** 上传文档到服务端 */
export async function uploadDoc(
  file: File,
  onProgress?: (percent: number) => void
): Promise<DocUploadResult> {
  const baseUrl = getApiBaseUrl();
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${baseUrl}/api/docs/upload`);
    xhr.setRequestHeader('x-file-name', encodeURIComponent(file.name));
    xhr.setRequestHeader('Content-Type', 'application/octet-stream');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable && onProgress) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      try { resolve(JSON.parse(xhr.responseText)); } catch { resolve({ success: false, message: '解析响应失败' }); }
    };
    xhr.onerror = () => reject(new Error('网络错误，请检查服务端是否运行'));
    xhr.send(file);
  });
}

/** 获取文档下载链接 */
export function getDocDownloadUrl(filePath: string): string {
  return `${getApiBaseUrl()}${filePath}`;
}
