# Vercel 部署文件获取脚本

Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║   Vercel 部署文件获取工具                                 ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# 部署 URL
$deploymentUrl = "https://duly-trade-calculator-fvjfbvv7w-doohos-projects.vercel.app"

Write-Host "📌 目标部署: $deploymentUrl" -ForegroundColor Yellow
Write-Host ""

# 检查是否安装了 Vercel CLI
Write-Host "🔍 检查 Vercel CLI..." -ForegroundColor Yellow
$vercelInstalled = Get-Command vercel -ErrorAction SilentlyContinue

if (-not $vercelInstalled) {
    Write-Host "❌ Vercel CLI 未安装！" -ForegroundColor Red
    Write-Host ""
    Write-Host "请运行以下命令安装 Vercel CLI：" -ForegroundColor Yellow
    Write-Host "npm i -g vercel" -ForegroundColor Green
    Write-Host ""
    Read-Host "按回车键退出"
    exit
}

Write-Host "✅ Vercel CLI 已安装" -ForegroundColor Green
Write-Host ""

# 选项菜单
Write-Host "请选择操作：" -ForegroundColor Cyan
Write-Host "1. 登录 Vercel 账户" -ForegroundColor White
Write-Host "2. 查看部署信息" -ForegroundColor White
Write-Host "3. 下载部署源代码" -ForegroundColor White
Write-Host "4. 查看部署日志" -ForegroundColor White
Write-Host "5. 本地运行 Vercel Dev" -ForegroundColor White
Write-Host "6. 退出" -ForegroundColor White
Write-Host ""

$choice = Read-Host "请输入选项 (1-6)"

switch ($choice) {
    "1" {
        Write-Host ""
        Write-Host "🔐 登录 Vercel..." -ForegroundColor Yellow
        vercel login
    }
    "2" {
        Write-Host ""
        Write-Host "📊 获取部署信息..." -ForegroundColor Yellow
        # 从 URL 提取部署 ID
        $deploymentId = "duly-trade-calculator-fvjfbvv7w-doohos-projects.vercel.app"
        vercel inspect $deploymentId
    }
    "3" {
        Write-Host ""
        Write-Host "📥 下载部署源代码..." -ForegroundColor Yellow
        Write-Host "⚠️  注意：需要有项目访问权限" -ForegroundColor Red
        Write-Host ""
        
        # 创建下载目录
        $downloadDir = "vercel-deployment-download"
        if (Test-Path $downloadDir) {
            Write-Host "清理旧的下载目录..." -ForegroundColor Yellow
            Remove-Item -Path $downloadDir -Recurse -Force
        }
        
        New-Item -ItemType Directory -Path $downloadDir | Out-Null
        Set-Location $downloadDir
        
        Write-Host "初始化 Vercel 项目..." -ForegroundColor Yellow
        vercel pull
    }
    "4" {
        Write-Host ""
        Write-Host "📜 查看部署日志..." -ForegroundColor Yellow
        $deploymentId = "duly-trade-calculator-fvjfbvv7w-doohos-projects.vercel.app"
        vercel logs $deploymentId
    }
    "5" {
        Write-Host ""
        Write-Host "🚀 启动 Vercel Dev 服务器..." -ForegroundColor Yellow
        Write-Host "服务器将在 http://localhost:3000 启动" -ForegroundColor Cyan
        Write-Host ""
        vercel dev
    }
    "6" {
        Write-Host ""
        Write-Host "👋 再见！" -ForegroundColor Green
        exit
    }
    default {
        Write-Host ""
        Write-Host "❌ 无效的选项！" -ForegroundColor Red
    }
}

Write-Host ""
Read-Host "按回车键退出" 