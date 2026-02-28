/**
 * 数据验证工具
 * 提供数据验证和验证规则定义
 */

import { ValidationRule, ValidationResult } from '../../types/database';

/**
 * 验证数据
 */
export function validateData(data: any, rules: ValidationRule[]): ValidationResult {
  const errors: string[] = [];

  for (const rule of rules) {
    const value = data[rule.field];

    // 检查必填字段
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push(`${rule.field} is required`);
      continue;
    }

    if (value === undefined || value === null || value === '') {
      continue;
    }

    // 检查类型
    const actualType = Array.isArray(value) ? 'array' : typeof value;
    if (actualType !== rule.type) {
      errors.push(`${rule.field} must be ${rule.type}, got ${actualType}`);
      continue;
    }

    // 检查字符串长度
    if (rule.type === 'string' && typeof value === 'string') {
      if (rule.minLength && value.length < rule.minLength) {
        errors.push(`${rule.field} must be at least ${rule.minLength} characters`);
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push(`${rule.field} must be at most ${rule.maxLength} characters`);
      }
      if (rule.pattern && !rule.pattern.test(value)) {
        errors.push(`${rule.field} format is invalid`);
      }
    }

    // 检查数组长度
    if (rule.type === 'array' && Array.isArray(value)) {
      if (rule.minLength && value.length < rule.minLength) {
        errors.push(`${rule.field} must have at least ${rule.minLength} items`);
      }
      if (rule.maxLength && value.length > rule.maxLength) {
        errors.push(`${rule.field} must have at most ${rule.maxLength} items`);
      }
    }

    // 检查枚举值
    if (rule.enum && !rule.enum.includes(value)) {
      errors.push(`${rule.field} must be one of ${rule.enum.join(', ')}`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * 版本记录验证规则
 */
export const versionRecordValidationRules: ValidationRule[] = [
  { field: 'versionNumber', type: 'string', required: true, minLength: 1, maxLength: 50 },
  { field: 'modificationContent', type: 'string', required: true, maxLength: 1000 },
  { field: 'modifiedModules', type: 'array', required: true, minLength: 1 },
  { field: 'riskLevel', type: 'string', required: true, enum: ['low', 'medium', 'high'] },
  { field: 'smokeTestResult', type: 'string', required: true, enum: ['pass', 'fail', 'pending'] },
  { field: 'voiceRegressionResult', type: 'string', required: true, enum: ['pass', 'fail', 'pending'] },
  { field: 'systemRegressionResult', type: 'string', required: true, enum: ['pass', 'fail', 'pending'] },
  { field: 'testConclusion', type: 'string', required: true, maxLength: 500 },
];

/**
 * 客户问题验证规则
 */
export const customerProblemValidationRules: ValidationRule[] = [
  { field: 'tvModel', type: 'string', required: true, minLength: 1, maxLength: 100 },
  { field: 'versionNumber', type: 'string', required: true, minLength: 1, maxLength: 50 },
  { field: 'networkEnvironment', type: 'string', required: true, maxLength: 100 },
  { field: 'bluetoothDistance', type: 'string', required: true, maxLength: 50 },
  { field: 'batteryStatus', type: 'string', required: true, maxLength: 50 },
  { field: 'isReproducible', type: 'boolean', required: true },
  { field: 'frequency', type: 'string', required: true, maxLength: 100 },
  { field: 'originalSpeech', type: 'string', required: true, maxLength: 500 },
  { field: 'recognitionResult', type: 'string', required: true, maxLength: 500 },
  { field: 'category', type: 'string', required: true, maxLength: 100 },
  { field: 'status', type: 'string', required: true, enum: ['open', 'in_progress', 'resolved'] },
];

/**
 * 语音识别记录验证规则
 */
export const voiceRecordValidationRules: ValidationRule[] = [
  { field: 'corpusId', type: 'string', required: true, minLength: 1, maxLength: 100 },
  { field: 'originalText', type: 'string', required: true, maxLength: 500 },
  { field: 'recognizedText', type: 'string', required: true, maxLength: 500 },
  { field: 'isCorrect', type: 'boolean', required: true },
  { field: 'versionNumber', type: 'string', required: true, minLength: 1, maxLength: 50 },
];

/**
 * 验证版本记录
 */
export function validateVersionRecord(data: any): ValidationResult {
  return validateData(data, versionRecordValidationRules);
}

/**
 * 验证客户问题
 */
export function validateCustomerProblem(data: any): ValidationResult {
  return validateData(data, customerProblemValidationRules);
}

/**
 * 验证语音识别记录
 */
export function validateVoiceRecord(data: any): ValidationResult {
  return validateData(data, voiceRecordValidationRules);
}
