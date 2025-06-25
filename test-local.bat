@echo off
echo ╔═══════════════════════════════════════════════════════════╗
echo ║   두리무역 계산기 - 本地测试启动器                        ║
echo ╚═══════════════════════════════════════════════════════════╝
echo.
echo 正在启动本地测试服务器...
echo.

REM 检查是否安装了 http-server
where npx >nul 2>nul
if %errorlevel% neq 0 (
    echo 错误: 未找到 npx 命令，请确保已安装 Node.js
    pause
    exit /b 1
)

echo 使用 http-server 启动服务器...
echo.
echo 服务器启动后，请在浏览器中访问:
echo   - 主页: http://localhost:8080
echo   - 计算器: http://localhost:8080/calculator/
echo.
echo 按 Ctrl+C 可以停止服务器
echo.

npx http-server -p 8080 -c-1 -o 