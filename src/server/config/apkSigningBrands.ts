import path from 'path';

export type ApkSigningBrandKey =
  | 'ctv'
  | 'cvte'
  | 'stm'
  | 'toptech'
  | 'hikeen'
  | 'whaletv';

export interface ApkSigningBrandConfig {
  key: ApkSigningBrandKey;
  label: string;
  signerDir: string;
  certFileName: string;
  keyFileName: string;
  signerJarFileName: string;
}

const DEFAULT_RESIGN_ROOT_DIR = process.env.APK_RESIGN_ROOT_DIR || 'D:\\Desktop\\【AOSP】\\reSign';

function resolveBrandDir(brandDirName: string, fallbackRootDir?: string): string {
  const preferredRootDir = fallbackRootDir || DEFAULT_RESIGN_ROOT_DIR;
  const preferredDir = path.join(preferredRootDir, brandDirName);
  if (path.isAbsolute(brandDirName)) {
    return brandDirName;
  }
  return preferredDir;
}

export const APK_SIGNING_BRANDS: ApkSigningBrandConfig[] = [
  {
    key: 'ctv',
    label: 'CTV',
    signerDir: resolveBrandDir('ctv'),
    certFileName: 'platform.x509.pem',
    keyFileName: 'platform.pk8',
    signerJarFileName: 'apksigner.jar',
  },
  {
    key: 'cvte',
    label: 'CVTE',
    signerDir: resolveBrandDir('cvte'),
    certFileName: 'platform.x509.pem',
    keyFileName: 'platform.pk8',
    signerJarFileName: 'apksigner.jar',
  },
  {
    key: 'stm',
    label: 'STM',
    signerDir: resolveBrandDir('stm'),
    certFileName: 'platform.x509.pem',
    keyFileName: 'platform.pk8',
    signerJarFileName: 'apksigner.jar',
  },
  {
    key: 'toptech',
    label: 'TOPTECH',
    signerDir: resolveBrandDir('toptech'),
    certFileName: 'platform.x509.pem',
    keyFileName: 'platform.pk8',
    signerJarFileName: 'apksigner.jar',
  },
  {
    key: 'hikeen',
    label: 'HIKEEN',
    signerDir: resolveBrandDir('D:\\Desktop\\reSign\\hikeen'),
    certFileName: 'platform.x509.pem',
    keyFileName: 'platform.pk8',
    signerJarFileName: 'apksigner.jar',
  },
  {
    key: 'whaletv',
    label: 'WHALETV',
    signerDir: resolveBrandDir('D:\\Desktop\\reSign\\whaletv'),
    certFileName: 'platform.x509.pem',
    keyFileName: 'platform.pk8',
    signerJarFileName: 'apksigner.jar',
  },
];

export function getApkSigningBrandConfig(brandKey: string): ApkSigningBrandConfig | undefined {
  return APK_SIGNING_BRANDS.find((brand) => brand.key === brandKey);
}
