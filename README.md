# Liquid Glass Homepage

个人主页 + 音乐播放器，液态玻璃视觉风格。

## 文件结构

```
liquid-glass-homepage/
├── index.html              # 主页面
├── config.js               # 全局配置（只改这一个文件）
├── assets/
│   ├── avatar.jpg          # 头像
├── style/
│   ├── base.css            # 基础样式 + 动态背景
│   ├── glass.css           # 液态玻璃点缀
│   ├── bento.css           # 网格布局
│   ├── player.css          # 播放器样式
│   └── hitokoto.css        # 一言卡片
└── script/
    ├── api.js              # Meting API 适配层
    ├── hitokoto.js         # 一言模块（可配置接口源）
    ├── player.js           # 播放器逻辑
    ├── glass.js            # 主色提取（极简版）
    └── app.js              # 全局初始化
```

## 使用

1. 把整个文件夹放到任意静态服务器（或用 VS Code 的 Live Server）
2. 打开 `config.js`，按需修改：
   - `API_BASE`：Meting API 地址
   - `BOOTSTRAP`：默认播放的歌曲（标题 + 歌手）
   - `HITOKOTO_SOURCES`：一言接口源列表
3. 浏览器打开即可

## 关于性能

本版已移除所有会导致手机掉帧的特性：

- 移除了所有 `filter: blur()`（背景光斑、唱片外发光）
- 移除了所有 `backdrop-filter`（卡片、按钮、输入框）
- 移除了卡片的 `mousemove` 高光跟随
- 移除了歌词区的 `mask-image` 和 `scroll-behavior: smooth`
- 进度条拖动改为单次绑定、松手即解绑
- 歌词滚动改为 `translate3d`，只走合成层

如果还想更流畅，可以关闭 `.bg-blob` 的动画（在 `base.css` 里把 `animation` 那行注释掉）。

## 关于一言

一言接口源配置在 `config.js` 的 `HITOKOTO_SOURCES` 数组里。
如果默认的三个源在你的环境都返回 403/超时，把它们换成你自己能用的节点即可。

## 关于 Meting API

接口文档：https://meting.spr-aachen.com/docs

注意：**QQ 音乐（tencent）不支持 `type=search`**，会返回 400，
所以本项目的搜索只用 netease。
