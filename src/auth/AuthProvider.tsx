/**
 * 认证上下文 Provider
 * 管理登录状态、token 存储、用户信息、会话过期检测
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import axios from 'axios';
import { getCurrentWorkspaceId } from '../services/WorkspaceContext';

export type SystemRole = 'admin' | 'member';
export type ProjectRole = 'owner' | 'qa' | 'rd' | 'pm' | 'viewer';

export interface AuthUser {
  id: string;
  username: string;
  displayName: string;
  systemRole: SystemRole;
  status?: 'active' | 'disabled';
  lastLoginAt?: number;
  projectRoles: { workspaceId: string; projectRole: ProjectRole }[];
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoggedIn: boolean;
  isAdmin: boolean;
  loading: boolean;
  sessionExpired: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  getProjectRole: (workspaceId: string) => ProjectRole | null;
  canWrite: (workspaceId?: string) => boolean;
  canManageProject: (workspaceId?: string) => boolean;
  dismissSessionExpired: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = 'auth_token';

// 全局事件：通知会话过期（供 authFetch 使用）
export const SESSION_EXPIRED_EVENT = 'auth-session-expired';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(true);
  const [sessionExpired, setSessionExpired] = useState(false);
  const interceptorRef = useRef<number | null>(null);
  const requestInterceptorRef = useRef<number | null>(null);

  // 配置 axios 默认 header
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  useEffect(() => {
    if (requestInterceptorRef.current !== null) {
      axios.interceptors.request.eject(requestInterceptorRef.current);
    }

    requestInterceptorRef.current = axios.interceptors.request.use((config) => {
      config.headers = config.headers || {};
      config.headers['x-workspace-id'] = getCurrentWorkspaceId();
      return config;
    });

    return () => {
      if (requestInterceptorRef.current !== null) {
        axios.interceptors.request.eject(requestInterceptorRef.current);
      }
    };
  }, []);

  // axios 响应拦截器：检测 401
  useEffect(() => {
    if (interceptorRef.current !== null) {
      axios.interceptors.response.eject(interceptorRef.current);
    }

    interceptorRef.current = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401 && token) {
          // 会话过期
          setSessionExpired(true);
          setUser(null);
          setToken(null);
          localStorage.removeItem(TOKEN_KEY);
          delete axios.defaults.headers.common['Authorization'];
        }
        return Promise.reject(error);
      }
    );

    return () => {
      if (interceptorRef.current !== null) {
        axios.interceptors.response.eject(interceptorRef.current);
      }
    };
  }, [token]);

  // 监听 authFetch 发出的会话过期事件
  useEffect(() => {
    const handler = () => {
      if (token) {
        setSessionExpired(true);
        setUser(null);
        setToken(null);
        localStorage.removeItem(TOKEN_KEY);
        delete axios.defaults.headers.common['Authorization'];
      }
    };
    window.addEventListener(SESSION_EXPIRED_EVENT, handler);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, handler);
  }, [token]);

  // 获取当前用户信息
  const refreshUser = useCallback(async () => {
    if (!token) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await axios.get('/api/auth/me');
      if (res.data.success && res.data.data) {
        setUser(res.data.data);
      } else {
        setUser(null);
        setToken(null);
        localStorage.removeItem(TOKEN_KEY);
      }
    } catch {
      setUser(null);
      setToken(null);
      localStorage.removeItem(TOKEN_KEY);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (username: string, password: string) => {
    try {
      const res = await axios.post('/api/auth/login', { username, password });
      if (res.data.success) {
        const { token: newToken, user: userData } = res.data.data;
        setToken(newToken);
        localStorage.setItem(TOKEN_KEY, newToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
        setSessionExpired(false);
        const meRes = await axios.get('/api/auth/me');
        if (meRes.data.success && meRes.data.data) {
          setUser(meRes.data.data);
        } else {
          setUser({ ...userData, projectRoles: [] });
        }
        return { success: true };
      }
      return { success: false, message: res.data.message };
    } catch (err: any) {
      return { success: false, message: err.response?.data?.message || '登录失败' };
    }
  };

  const logout = async () => {
    try {
      await axios.post('/api/auth/logout');
    } catch { /* ignore */ }
    setUser(null);
    setToken(null);
    setSessionExpired(false);
    localStorage.removeItem(TOKEN_KEY);
    delete axios.defaults.headers.common['Authorization'];
  };

  const dismissSessionExpired = () => {
    setSessionExpired(false);
  };

  const getProjectRole = (workspaceId: string): ProjectRole | null => {
    if (!user) return null;
    const membership = user.projectRoles.find((r) => r.workspaceId === workspaceId);
    return membership?.projectRole || null;
  };

  const canWrite = (workspaceId?: string): boolean => {
    if (!user) return false;
    if (user.systemRole === 'admin') return true;
    if (!workspaceId) return true;
    const role = getProjectRole(workspaceId);
    return !!role && role !== 'viewer';
  };

  const canManageProject = (workspaceId?: string): boolean => {
    if (!user) return false;
    if (user.systemRole === 'admin') return true;
    if (!workspaceId) return false;
    const role = getProjectRole(workspaceId);
    return role === 'owner';
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isLoggedIn: !!user,
        isAdmin: user?.systemRole === 'admin',
        loading,
        sessionExpired,
        login,
        logout,
        refreshUser,
        getProjectRole,
        canWrite,
        canManageProject,
        dismissSessionExpired,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
