#!/bin/bash

# TV AI Voice 快速部署脚本
# 使用方法: bash deploy.sh [选项]
# 选项: build, start, stop, restart, logs, clean

set -e

PROJECT_NAME="tv-ai-voice"
DOCKER_IMAGE="$PROJECT_NAME:latest"
CONTAINER_NAME="$PROJECT_NAME-app"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# 打印信息
print_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# 检查 Docker 是否安装
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker 未安装，请先安装 Docker"
        exit 1
    fi
    print_info "Docker 已安装"
}

# 构建镜像
build() {
    print_info "开始构建 Docker 镜像..."
    docker build -t $DOCKER_IMAGE .
    print_info "镜像构建完成"
}

# 启动容器
start() {
    print_info "启动容器..."
    
    # 检查容器是否已存在
    if docker ps -a --format '{{.Names}}' | grep -q "^$CONTAINER_NAME$"; then
        print_warning "容器已存在，先删除旧容器..."
        docker rm -f $CONTAINER_NAME
    fi
    
    docker run -d \
        --name $CONTAINER_NAME \
        -p 80:80 \
        --restart always \
        $DOCKER_IMAGE
    
    print_info "容器已启动"
    print_info "访问地址: http://localhost"
}

# 停止容器
stop() {
    print_info "停止容器..."
    docker stop $CONTAINER_NAME || print_warning "容器未运行"
    print_info "容器已停止"
}

# 重启容器
restart() {
    print_info "重启容器..."
    docker restart $CONTAINER_NAME
    print_info "容器已重启"
}

# 查看日志
logs() {
    print_info "显示容器日志..."
    docker logs -f $CONTAINER_NAME
}

# 清理
clean() {
    print_info "清理 Docker 资源..."
    
    # 停止容器
    docker stop $CONTAINER_NAME 2>/dev/null || true
    
    # 删除容器
    docker rm $CONTAINER_NAME 2>/dev/null || true
    
    # 删除镜像
    docker rmi $DOCKER_IMAGE 2>/dev/null || true
    
    print_info "清理完成"
}

# 显示帮助
show_help() {
    echo "TV AI Voice 部署脚本"
    echo ""
    echo "使用方法: bash deploy.sh [命令]"
    echo ""
    echo "命令:"
    echo "  build       - 构建 Docker 镜像"
    echo "  start       - 启动容器"
    echo "  stop        - 停止容器"
    echo "  restart     - 重启容器"
    echo "  logs        - 查看容器日志"
    echo "  clean       - 清理 Docker 资源"
    echo "  help        - 显示此帮助信息"
    echo ""
    echo "快速部署:"
    echo "  bash deploy.sh build && bash deploy.sh start"
    echo ""
}

# 主函数
main() {
    case "${1:-help}" in
        build)
            check_docker
            build
            ;;
        start)
            check_docker
            start
            ;;
        stop)
            check_docker
            stop
            ;;
        restart)
            check_docker
            restart
            ;;
        logs)
            check_docker
            logs
            ;;
        clean)
            check_docker
            clean
            ;;
        help)
            show_help
            ;;
        *)
            print_error "未知命令: $1"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
