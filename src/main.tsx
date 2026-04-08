import React from 'react';
import ReactDOM from 'react-dom/client';
import { Provider } from 'react-redux';
import { store } from './store';
import App from './App';
import { I18nProvider } from './i18n/I18nProvider';
import { ToastProvider } from './components/common/ToastProvider';
import './styles/globals.css';

/**
 * 应用入口
 * 数据存储已迁移到服务端 SQLite，前端无需初始化本地数据库
 */
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Provider store={store}>
      <I18nProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </I18nProvider>
    </Provider>
  </React.StrictMode>
);
