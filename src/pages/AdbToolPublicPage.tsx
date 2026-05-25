import React from 'react';

const AdbToolPublicPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 text-gray-900">
      <div className="max-w-3xl mx-auto px-6 py-12">
        <div className="mb-8">
          <p className="text-sm font-medium text-blue-600">项目交付管理平台</p>
          <h1 className="mt-2 text-3xl font-bold">ADB 本机代理下载</h1>
          <p className="mt-3 text-gray-600 leading-7">
            远程访问抓包代理时，浏览器无法直接读取你电脑上的 ADB。安装并运行这个本机代理后，网页就可以显示和操作你自己电脑连接的 TV 设备。
          </p>
        </div>

        <div className="bg-white border border-gray-200 rounded-lg p-5 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">Windows 版本</h2>
              <p className="text-sm text-gray-500 mt-1">下载后双击运行，按提示允许管理员权限，代理会作为后台服务开机自启。</p>
            </div>
            <a
              href="/downloads/adb-agent-windows.exe"
              className="inline-flex justify-center px-4 py-2 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
            >
              下载 adb-agent-windows.exe
            </a>
          </div>
        </div>

        <div className="mt-8 grid gap-3 text-sm">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="font-medium">使用步骤</p>
            <p className="mt-2 text-gray-600">1. 下载并双击运行 adb-agent-windows.exe</p>
            <p className="text-gray-600">2. 确认命令行能执行 adb devices，并且 TV 已连接到这台电脑</p>
            <p className="text-gray-600">3. 允许管理员权限后，ADB 代理会安装为 Windows 服务并自动启动</p>
            <p className="text-gray-600">4. 打开服务器网页的「抓包代理」，右上角选择「本机 ADB」并刷新设备</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <p className="font-medium">安全说明</p>
            <p className="mt-2 text-gray-600">代理只监听 127.0.0.1，不会把本机 ADB 控制接口暴露到局域网。服务名为 AI Voice ADB Agent。</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdbToolPublicPage;
