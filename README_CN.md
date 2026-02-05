<p align="center">
  <img src="icons/icon128.png" width="80" height="80" alt="GlideRead">
</p>

<h1 align="center">GlideRead</h1>

<p align="center">
  为非英语母语者打造的浏览器阅读增强插件，智能放大字体 + 仿生阅读。
  <br>
  <a href="https://github.com/psylch/glideread-extension/releases/latest">下载最新版本</a>
</p>

<p align="center">
  <a href="#功能">功能</a> &middot;
  <a href="#安装">安装</a> &middot;
  <a href="#设置">设置</a> &middot;
  <a href="README.md">English</a>
</p>

---

## 功能

- **智能字体放大** - 只放大正文内容，不影响导航栏、按钮等 UI 元素，支持 1.0x - 1.5x 调节
- **仿生阅读 (Bionic Reading)** - 加粗每个英文单词的前半部分，创建视觉锚点，引导视线更快地扫过文字
- **中文友好** - 自动跳过中日韩文字，完美支持中英混排场景
- **柔和对比** - 使用透明度差异而非粗体来引导阅读，深色主题下不刺眼
- **智能站点匹配** - 内置信息密集型网站列表（X、Reddit、HN、Medium 等），支持自定义添加
- **SPA 支持** - 适配单页应用的动态内容加载和 DOM 回收机制
- **快捷键激活** - 按 `Alt+G` 在任意页面临时启用，无需预先配置

## 安装

### 从 Release 安装

1. 从 [Releases 页面](https://github.com/psylch/glideread-extension/releases/latest) 下载 `glideread-v*.zip`
2. 解压文件
3. 打开 Chrome 访问 `chrome://extensions`
4. 开启右上角的 **开发者模式**
5. 点击 **加载已解压的扩展程序**，选择解压后的文件夹

### 从源码安装

```bash
git clone https://github.com/psylch/glideread-extension.git
```

然后在 Chrome 中以未打包扩展的方式加载该文件夹。

### 快捷键

在任意页面按 `Alt+G` 即可立即激活 GlideRead。可在 `chrome://extensions/shortcuts` 自定义快捷键。

## 设置

点击扩展图标可快速开关。点击 **Settings** 进入完整设置页面：

- 字体放大比例和行高调节
- 仿生阅读强度（轻度 / 中度 / 重度）
- 站点管理（启用/禁用预置站点，添加自定义域名）

## 预置站点

`twitter.com` `x.com` `reddit.com` `news.ycombinator.com` `medium.com` `dev.to` `techcrunch.com` `arstechnica.com` `theverge.com` `hackernoon.com` `substack.com`

## 作者

[psylch](https://github.com/psylch)

## 开源协议

[MIT](LICENSE)
