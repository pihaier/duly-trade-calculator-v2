# 두리무역 计算器 - 本地测试启动脚本

Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   두리무역 계산기 - 本地测试服务器启动中...              ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# 检查 Node.js 是否安装
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 错误: Node.js 未安装！" -ForegroundColor Red
    Write-Host "请先安装 Node.js: https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "按回车键退出"
    exit
}

Write-Host "✅ Node.js 版本: $nodeVersion" -ForegroundColor Green
Write-Host ""

# 启动 http-server
Write-Host "🚀 正在启动 HTTP 服务器..." -ForegroundColor Yellow
Write-Host ""
Write-Host "📌 服务器启动后，请在浏览器中访问：" -ForegroundColor Cyan
Write-Host "   主页: http://localhost:8080" -ForegroundColor White
Write-Host "   计算器: http://localhost:8080/calculator/" -ForegroundColor White
Write-Host ""
Write-Host "💡 提示: 按 Ctrl+C 可以停止服务器" -ForegroundColor Gray
Write-Host ""

# 使用 npx 运行 http-server
npx http-server -p 8080 -c-1 --cors 