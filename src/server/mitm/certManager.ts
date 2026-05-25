/**
 * MITM 证书管理模块
 * - Root CA 自动生成和持久化
 * - 动态域名证书签发（LRU 缓存）
 */

import forge from 'node-forge';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const CERT_DIR = path.join(process.cwd(), 'data', 'mitm-certs');
const CA_CERT_PATH = path.join(CERT_DIR, 'rootCA.crt');
const CA_KEY_PATH = path.join(CERT_DIR, 'rootCA.key');

interface CertKeyPair {
  cert: string;
  key: string;
}

let caCert: forge.pki.Certificate | null = null;
let caKey: forge.pki.rsa.PrivateKey | null = null;

// LRU 缓存域名证书
const certCache = new Map<string, CertKeyPair>();
const CACHE_MAX = 500;

function ensureDir(): void {
  if (!fs.existsSync(CERT_DIR)) {
    fs.mkdirSync(CERT_DIR, { recursive: true });
  }
}

/**
 * 生成 Root CA 证书（RSA 2048, 有效期 10 年）
 */
function generateRootCA(): CertKeyPair {
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();

  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10);

  const attrs = [
    { name: 'commonName', value: 'TV AI Voice Test MITM CA' },
    { name: 'organizationName', value: 'QA Team' },
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);

  cert.setExtensions([
    { name: 'basicConstraints', cA: true },
    { name: 'keyUsage', keyCertSign: true, cRLSign: true },
    { name: 'subjectKeyIdentifier' },
  ]);

  cert.sign(keys.privateKey, forge.md.sha256.create());

  return {
    cert: forge.pki.certificateToPem(cert),
    key: forge.pki.privateKeyToPem(keys.privateKey),
  };
}

/**
 * 初始化 CA 证书（加载已有或生成新的）
 */
export function initCA(): void {
  ensureDir();

  if (fs.existsSync(CA_CERT_PATH) && fs.existsSync(CA_KEY_PATH)) {
    const certPem = fs.readFileSync(CA_CERT_PATH, 'utf-8');
    const keyPem = fs.readFileSync(CA_KEY_PATH, 'utf-8');
    caCert = forge.pki.certificateFromPem(certPem);
    caKey = forge.pki.privateKeyFromPem(keyPem) as forge.pki.rsa.PrivateKey;
    console.log('[MITM] Root CA 已加载');
  } else {
    const ca = generateRootCA();
    fs.writeFileSync(CA_CERT_PATH, ca.cert);
    fs.writeFileSync(CA_KEY_PATH, ca.key);
    caCert = forge.pki.certificateFromPem(ca.cert);
    caKey = forge.pki.privateKeyFromPem(ca.key) as forge.pki.rsa.PrivateKey;
    console.log('[MITM] Root CA 已生成');
  }
}

/**
 * 重新生成 CA 证书
 */
export function regenerateCA(): CertKeyPair {
  ensureDir();
  certCache.clear();
  const ca = generateRootCA();
  fs.writeFileSync(CA_CERT_PATH, ca.cert);
  fs.writeFileSync(CA_KEY_PATH, ca.key);
  caCert = forge.pki.certificateFromPem(ca.cert);
  caKey = forge.pki.privateKeyFromPem(ca.key) as forge.pki.rsa.PrivateKey;
  console.log('[MITM] Root CA 已重新生成');
  return ca;
}

/**
 * 获取 CA 证书 PEM（用于下载/安装）
 */
export function getCACertPem(): string {
  if (!caCert) initCA();
  return forge.pki.certificateToPem(caCert!);
}

/**
 * 获取 CA 证书指纹
 */
export function getCACertFingerprint(): string {
  if (!caCert) initCA();
  const der = forge.asn1.toDer(forge.pki.certificateToAsn1(caCert!)).getBytes();
  return crypto.createHash('sha256').update(Buffer.from(der, 'binary')).digest('hex');
}

/**
 * 获取 CA 证书的 subject_hash_old（Android 系统证书文件名）
 */
export function getCACertHashOld(): string {
  if (!caCert) initCA();
  // Android 使用 OpenSSL subject_hash_old 格式
  const der = forge.asn1.toDer(forge.pki.distinguishedNameToAsn1(caCert!.subject)).getBytes();
  const md = crypto.createHash('md5').update(Buffer.from(der, 'binary')).digest();
  // subject_hash_old = 前 4 字节小端序
  const hash = md.readUInt32LE(0);
  return hash.toString(16).padStart(8, '0');
}

/**
 * 获取 CA 证书文件路径
 */
export function getCACertPath(): string {
  return CA_CERT_PATH;
}

/**
 * 为指定域名动态签发证书
 */
export function getCertForHost(hostname: string): CertKeyPair {
  if (!caCert || !caKey) initCA();

  // 检查缓存
  if (certCache.has(hostname)) {
    return certCache.get(hostname)!;
  }

  // 生成新证书
  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();

  cert.publicKey = keys.publicKey;
  cert.serialNumber = crypto.randomBytes(16).toString('hex');
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

  cert.setSubject([{ name: 'commonName', value: hostname }]);
  cert.setIssuer(caCert!.subject.attributes);

  cert.setExtensions([
    { name: 'basicConstraints', cA: false },
    { name: 'keyUsage', digitalSignature: true, keyEncipherment: true },
    { name: 'extKeyUsage', serverAuth: true },
    { name: 'subjectAltName', altNames: [{ type: 2, value: hostname }] },
  ]);

  cert.sign(caKey!, forge.md.sha256.create());

  const pair: CertKeyPair = {
    cert: forge.pki.certificateToPem(cert),
    key: forge.pki.privateKeyToPem(keys.privateKey),
  };

  // LRU 缓存管理
  if (certCache.size >= CACHE_MAX) {
    const firstKey = certCache.keys().next().value;
    if (firstKey) certCache.delete(firstKey);
  }
  certCache.set(hostname, pair);

  return pair;
}
