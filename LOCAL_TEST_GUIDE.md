# 🧪 두리무역 계산기 - 本地测试指南

## 📋 快速开始

### 方法 1: 使用批处理文件（推荐）
```bash
# Windows 用户直接双击运行
test-local.bat
```

### 方法 2: 使用 http-server
```bash
# 安装 http-server（如果尚未安装）
npm install -g http-server

# 启动服务器
http-server -p 8080 -c-1

# 或使用 npx（无需安装）
npx http-server -p 8080 -c-1
```

### 方法 3: 使用 Node.js Express 服务器
```bash
# 运行本地服务器脚本
node local-server.js
```

### 方法 4: 使用 Python 内置服务器
```bash
# Python 3
python -m http.server 8080

# Python 2
python -m SimpleHTTPServer 8080
```

### 方法 5: 使用 VS Code Live Server
1. 安装 Live Server 扩展
2. 右键点击 `index.html`
3. 选择 "Open with Live Server"

## 🌐 访问地址

启动服务器后，在浏览器中访问：

- **主页**: http://localhost:8080
- **计算器**: http://localhost:8080/calculator/
- **API 测试**: http://localhost:8080/api/health

## ⚠️ 注意事项

### API 功能测试
- 本地测试时，API 功能需要配置环境变量
- 创建 `.env` 文件并添加必要的 API 密钥
- 参考 `env.example` 文件

### 跨域问题
- 本地测试可能遇到 CORS 问题
- 使用 `local-server.js` 可以避免大部分跨域问题
- 或在浏览器中安装 CORS 插件

### 路由问题
- 直接打开 HTML 文件可能导致路由失效
- 建议使用 HTTP 服务器进行测试
- 确保访问 `/calculator/` 而不是 `/calculator`（注意末尾斜杠）

## 🔧 故障排除

### 端口被占用
```bash
# Windows - 查找占用端口的进程
netstat -ano | findstr :8080

# 更换端口
http-server -p 3000 -c-1
```

### Node.js 未安装
- 下载地址: https://nodejs.org/
- 推荐安装 LTS 版本

### 页面加载缓慢
- 使用 `-c-1` 参数禁用缓存
- 清除浏览器缓存（Ctrl+Shift+R）

## 📱 移动设备测试

1. 确保电脑和手机在同一网络
2. 查找电脑 IP 地址：
   ```bash
   ipconfig
   ```
3. 在手机浏览器访问：
   ```
   http://[你的IP地址]:8080
   ```

## 🚀 部署测试

### Vercel 本地测试
```bash
# 安装 Vercel CLI
npm i -g vercel

# 本地运行
vercel dev
```

### 生产环境测试
- Vercel: https://duly-trade-calculator.vercel.app
- Firebase: https://duly-trade-calculator.web.app

---

💡 **提示**: 推荐使用方法 1 或方法 2 进行快速本地测试。 