/**
 * 错误处理工具
 * 提供统一的错误处理和错误类定义
 */

import { DatabaseErrorType } from '../../types/database';

/**
 * 数据库错误类
 */
export class DatabaseError extends Error {
  constructor(
    public type: DatabaseErrorType,
    message: string,
    public originalError?: Error
  ) {
    super(message);
    this.name = 'DatabaseError';
    Object.setPrototypeOf(this, DatabaseError.prototype);
  }

  /**
   * 转换为 JSON
   */
  toJSON(): Record<string, any> {
    return {
      name: this.name,
      type: this.type,
      message: this.message,
      originalError: this.originalError?.message,
    };
  }

  /**
   * 转换为字符串
   */
  toString(): string {
    return `${this.name} [${this.type}]: ${this.message}`;
  }
}

/**
 * 创建数据库错误
 */
export function createDatabaseError(
  type: DatabaseErrorType,
  message: string,
  originalError?: Error
): DatabaseError {
  return new DatabaseError(type, message, originalError);
}

/**
 * 处理数据库错误
 */
export function handleDatabaseError(error: any): DatabaseError {
  if (error instanceof DatabaseError) {
    return error;
  }

  if (error instanceof Error) {
    const message = error.message || 'Unknown error';

    // 根据错误消息推断错误类型
    if (message.includes('quota')) {
      return createDatabaseError(
        DatabaseErrorType.STORAGE_QUOTA_EXCEEDED,
        'Storage quota exceeded',
        error
      );
    }

    if (message.includes('transaction')) {
      return createDatabaseError(
        DatabaseErrorType.TRANSACTION_FAILED,
        'Transaction failed',
        error
      );
    }

    return createDatabaseError(
      DatabaseErrorType.QUERY_FAILED,
      message,
      error
    );
  }

  return createDatabaseError(
    DatabaseErrorType.QUERY_FAILED,
    'Unknown error occurred'
  );
}

/**
 * 是否是数据库错误
 */
export function isDatabaseError(error: any): error is DatabaseError {
  return error instanceof DatabaseError;
}

/**
 * 获取错误消息
 */
export function getErrorMessage(error: any): string {
  if (error instanceof DatabaseError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return String(error);
}

/**
 * 记录错误
 */
export function logError(error: any, context?: string): void {
  const timestamp = new Date().toISOString();
  const message = getErrorMessage(error);
  const contextStr = context ? ` [${context}]` : '';

  console.error(`[${timestamp}]${contextStr} Error: ${message}`);

  if (isDatabaseError(error)) {
    console.error(`  Type: ${error.type}`);
    if (error.originalError) {
      console.error(`  Original: ${error.originalError.message}`);
    }
  }
}
