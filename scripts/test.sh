#!/bin/bash

# ============================================
# WebRTC + FreeSWITCH + FFmpeg Demo 测试脚本
# ============================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 项目根目录
PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$PROJECT_ROOT"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  WebRTC Demo 测试脚本${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# 检测操作系统
detect_os() {
    case "$(uname -s)" in
        Darwin*)    echo "macos";;
        Linux*)     echo "linux";;
        CYGWIN*)    echo "windows";;
        MINGW*)     echo "windows";;
        *)          echo "unknown";;
    esac
}

OS_TYPE=$(detect_os)
echo -e "${YELLOW}检测到操作系统: $OS_TYPE${NC}"

# ============================================
# 检查依赖
# ============================================
check_dependencies() {
    echo -e "\n${BLUE}[1/6] 检查依赖...${NC}"

    # Node.js 检查
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node -v)
        echo -e "${GREEN}✓${NC} Node.js: $NODE_VERSION"
    else
        echo -e "${RED}✗${NC} Node.js 未安装"
        exit 1
    fi

    # npm 检查
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm -v)
        echo -e "${GREEN}✓${NC} npm: $NPM_VERSION"
    else
        echo -e "${RED}✗${NC} npm 未安装"
        exit 1
    fi

    # FFmpeg 检查
    if command -v ffmpeg &> /dev/null; then
        FFMPEG_VERSION=$(ffmpeg -version 2>&1 | head -n 1)
        echo -e "${GREEN}✓${NC} FFmpeg: $FFMPEG_VERSION"
    else
        echo -e "${RED}✗${NC} FFmpeg 未安装"
        echo -e "${YELLOW}  macOS: brew install ffmpeg${NC}"
        echo -e "${YELLOW}  Ubuntu: sudo apt-get install ffmpeg${NC}"
        exit 1
    fi
}

# ============================================
# 安装依赖
# ============================================
install_dependencies() {
    echo -e "\n${BLUE}[2/6] 安装依赖...${NC}"

    if [ -d "node_modules" ]; then
        echo -e "${YELLOW}node_modules 已存在，跳过安装${NC}"
    else
        echo -e "正在安装 npm 依赖..."
        npm install
    fi

    echo -e "${GREEN}✓${NC} 依赖安装完成"
}

# ============================================
# 类型检查 (TypeScript)
# ============================================
type_check() {
    echo -e "\n${BLUE}[3/6] TypeScript 类型检查...${NC}"

    if [ ! -f "tsconfig.json" ]; then
        echo -e "${YELLOW}跳过 TypeScript 检查（无 tsconfig.json）${NC}"
        return
    fi

    npx tsc --noEmit
    echo -e "${GREEN}✓${NC} TypeScript 类型检查通过"
}

# ============================================
# 启动服务器
# ============================================
start_server() {
    echo -e "\n${BLUE}[4/6] 启动服务器...${NC}"

    # 检查端口是否被占用
    if lsof -i :3000 &> /dev/null; then
        echo -e "${YELLOW}端口 3000 已被占用，尝试停止现有进程...${NC}"
        lsof -ti :3000 | xargs kill -9 2>/dev/null || true
        sleep 1
    fi

    # 根据环境选择运行方式
    if [ "$1" == "dev" ]; then
        echo -e "启动开发模式（ts-node）..."
        npm run dev &
    else
        echo -e "编译并启动生产模式..."
        npm run build
        npm start &
    fi

    SERVER_PID=$!

    # 等待服务器启动
    echo -e "等待服务器启动..."
    for i in {1..30}; do
        if curl -s http://localhost:3000/api/health > /dev/null 2>&1; then
            echo -e "${GREEN}✓${NC} 服务器已启动 (PID: $SERVER_PID)"
            return 0
        fi
        sleep 1
    done

    echo -e "${RED}✗${NC} 服务器启动失败"
    return 1
}

# ============================================
# 运行测试
# ============================================
run_tests() {
    echo -e "\n${BLUE}[5/6] 运行测试...${NC}"

    # 基础连通性测试
    echo -e "测试 API 连通性..."

    # 健康检查
    HEALTH=$(curl -s http://localhost:3000/api/health)
    if echo "$HEALTH" | grep -q "healthy"; then
        echo -e "${GREEN}✓${NC} 健康检查通过"
    else
        echo -e "${RED}✗${NC} 健康检查失败"
        echo "$HEALTH"
    fi

    # 录制列表 API
    RECORDINGS=$(curl -s http://localhost:3000/api/recordings)
    if echo "$RECORDINGS" | grep -q "success"; then
        echo -e "${GREEN}✓${NC} 录制列表 API 正常"
    else
        echo -e "${RED}✗${NC} 录制列表 API 异常"
    fi

    # WebSocket 连接测试
    echo -e "测试 WebSocket 连接..."
    if command -v websocat &> /dev/null; then
        timeout 3 websocat ws://localhost:3000 || echo -e "${YELLOW}  WebSocket 测试跳过（需要 websocat）${NC}"
    else
        echo -e "${YELLOW}  WebSocket 测试跳过（未安装 websocat）${NC}"
        echo -e "  安装方式: brew install websocat"
    fi

    # 页面可访问性
    HTML=$(curl -s http://localhost:3000/)
    if echo "$HTML" | grep -q "WebRTC"; then
        echo -e "${GREEN}✓${NC} 主页可访问"
    else
        echo -e "${RED}✗${NC} 主页访问失败"
    fi

    echo -e "${GREEN}✓${NC} 测试完成"
}

# ============================================
# 清理
# ============================================
cleanup() {
    echo -e "\n${BLUE}[6/6] 清理...${NC}"

    # 停止服务器
    if [ ! -z "$SERVER_PID" ]; then
        echo -e "停止服务器 (PID: $SERVER_PID)..."
        kill $SERVER_PID 2>/dev/null || true
    fi

    # 停止所有 node 进程
    pkill -f "node.*server" 2>/dev/null || true
    pkill -f "ts-node" 2>/dev/null || true

    echo -e "${GREEN}✓${NC} 清理完成"
}

# ============================================
# 显示帮助
# ============================================
show_help() {
    echo "用法: $0 [选项]"

    echo -e "\n选项:"
    echo -e "  ${GREEN}dev${NC}       使用开发模式启动（ts-node）"
    echo -e "  ${GREEN}build${NC}      仅编译 TypeScript"
    echo -e "  ${GREEN}test${NC}       仅运行测试"
    echo -e "  ${GREEN}install${NC}     仅安装依赖"
    echo -e "  ${GREEN}help${NC}       显示此帮助信息"

    echo -e "\n示例:"
    echo -e "  $0              # 完整测试流程"
    echo -e "  $0 dev          # 开发模式启动"
    echo -e "  $0 build        # 编译项目"
    echo -e "  $0 test         # 仅运行测试"
}

# ============================================
# 主函数
# ============================================
main() {
    case "${1:-}" in
        dev)
            check_dependencies
            install_dependencies
            type_check
            start_server "dev"
            echo -e "\n${GREEN}========================================${NC}"
            echo -e "${GREEN}  服务器运行中，按 Ctrl+C 停止${NC}"
            echo -e "${GREEN}========================================${NC}"
            wait
            ;;
        build)
            check_dependencies
            install_dependencies
            type_check
            npm run build
            echo -e "${GREEN}✓ 编译完成${NC}"
            ;;
        test)
            check_dependencies
            install_dependencies
            type_check
            start_server
            run_tests
            cleanup
            ;;
        install)
            check_dependencies
            install_dependencies
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            # 完整测试流程
            check_dependencies
            install_dependencies
            type_check
            start_server
            run_tests
            cleanup
            ;;
    esac
}

# 捕获中断信号
trap cleanup EXIT INT TERM

# 运行主函数
main "$@"
