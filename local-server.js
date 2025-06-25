const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 8080;

// 启用 CORS
app.use(cors());

// 设置静态文件目录
app.use(express.static(path.join(__dirname)));

// 处理 /calculator 路由
app.get('/calculator', (req, res) => {
    res.sendFile(path.join(__dirname, 'calculator', 'index.html'));
});

// 处理 /calculator/* 路由
app.get('/calculator/*', (req, res) => {
    const filePath = req.path.substring(1); // 移除开头的 /
    res.sendFile(path.join(__dirname, filePath));
});

// API 路由模拟（如果需要测试 API）
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', message: '本地测试服务器运行正常' });
});

// 处理所有其他路由，返回主页
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 启动服务器
app.listen(PORT, () => {
    }); 