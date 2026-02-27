# Komari Dash

[English](README.md)

一个现代化的服务器监控面板主题，适用于 [Komari](https://github.com/komari-monitor/komari)，移植自 [NezhaDash](https://github.com/hamster1963/nezha-dash)。

![预览](preview.png)

## 功能特性

- WebSocket 实时服务器监控
- 交互式世界地图，显示服务器位置
- 详细的服务器页面，包含 CPU、内存、磁盘、网络、连接数、进程图表
- 网络延迟监控，支持 Ping 图表和 Peak Cut（EWMA 平滑）
- 深色 / 浅色主题切换
- 多语言支持（English、简体中文、繁體中文、日本語、Español、Deutsch、Français）
- 搜索命令面板
- 响应式设计，适配移动端和桌面端
- OS Logo 图标（font-logos）
- 动画圆形进度条
- 列表视图和卡片视图切换

## 安装

1. 进入 Komari 面板 → 设置 → 主题
2. 上传 [Releases](../../releases) 页面中的 `KomariDash.zip` 文件
3. 完成

## 本地开发

```bash
npm install
npm run dev
```

## 构建

```bash
npm run build
node scripts/zip.mjs
```

生成的 `KomariDash.zip` 即可上传使用。

## 配置项

主题设置可在 Komari 面板中配置：

| 选项 | 说明 | 默认值 |
|------|------|--------|
| 显示国旗 | 在服务器卡片上显示国旗图标 | `true` |
| 显示分组标签 | 显示服务器分组标签筛选 | `true` |
| 显示流量统计 | 在服务器卡片上显示总上传/下载流量 | `false` |
| 禁用卡通图标 | 隐藏网络卡片上的卡通图标 | `false` |
| 固定顶部服务器名 | 将服务器名称固定在卡片顶部 | `false` |
| 显示分组数量 | 在分组标签旁显示服务器数量 | `false` |
| 自定义 Logo URL | 自定义 Logo 图片地址 | - |
| 自定义描述 | 自定义站点描述文字 | - |
| 自定义链接 | JSON 格式的自定义链接 | - |

## 致谢

- 原始设计和代码来自 [hamster1963/nezha-dash](https://github.com/hamster1963/nezha-dash)
- 使用 React、Vite、TailwindCSS、Recharts、d3-geo 构建

## 许可证

MIT
