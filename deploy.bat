@echo off
REM TV AI Voice 快速部署脚本 (Windows)
REM 使用方法: deploy.bat [命令]
REM 命令: build, start, stop, restart, logs, clean

setlocal enabledelayedexpansion

set PROJECT_NAME=tv-ai-voice
set DOCKER_IMAGE=%PROJECT_NAME%:latest
set CONTAINER_NAME=%PROJECT_NAME%-app

REM 检查 Docker 是否安装
docker --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Docker 未安装，请先安装 Docker Desktop
    exit /b 1
)

echo [INFO] Docker 已安装

REM 处理命令
if "%1"=="" goto help
if /i "%1"=="build" goto build
if /i "%1"=="start" goto start
if /i "%1"=="stop" goto stop
if /i "%1"=="restart" goto restart
if /i "%1"=="logs" goto logs
if /i "%1"=="clean" goto clean
if /i "%1"=="help" goto help

echo [ERROR] 未知命令: %1
goto help

:build
echo [INFO] 开始构建 Docker 镜像...
docker build -t %DOCKER_IMAGE% .
echo [INFO] 镜像构建完成
goto end

:start
echo [INFO] 启动容器...
docker ps -a --format "table {{.Names}}" | findstr /i "%CONTAINER_NAME%" >nul
if not errorlevel 1 (
    echo [WARNING] 容器已存在，先删除旧容器...
    docker rm -f %CONTAINER_NAME%
)
docker run -d ^
    --name %CONTAINER_NAME% ^
    -p 80:80 ^
    --restart always ^
    %DOCKER_IMAGE%
echo [INFO] 容器已启动
echo [INFO] 访问地址: http://localhost
goto end

:stop
echo [INFO] 停止容器...
docker stop %CONTAINER_NAME% 2>nul || echo [WARNING] 容器未运行
echo [INFO] 容器已停止
goto end

:restart
echo [INFO] 重启容器...
docker restart %CONTAINER_NAME%
echo [INFO] 容器已重启
goto end

:logs
echo [INFO] 显示容器日志...
docker logs -f %CONTAINER_NAME%
goto end

:clean
echo [INFO] 清理 Docker 资源...
docker stop %CONTAINER_NAME% 2>nul
docker rm %CONTAINER_NAME% 2>nul
docker rmi %DOCKER_IMAGE% 2>nul
echo [INFO] 清理完成
goto end

:help
echo TV AI Voice 部署脚本 (Windows)
echo.
echo 使用方法: deploy.bat [命令]
echo.
echo 命令:
echo   build       - 构建 Docker 镜像
echo   start       - 启动容器
echo   stop        - 停止容器
echo   restart     - 重启容器
echo   logs        - 查看容器日志
echo   clean       - 清理 Docker 资源
echo   help        - 显示此帮助信息
echo.
echo 快速部署:
echo   deploy.bat build
echo   deploy.bat start
echo.

:end
endlocal
