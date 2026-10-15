# GitHub Pages 发布

发布目标为公开仓库 `guygjygjhgj/qinghe-community-web`，网站地址为 https://guygjygjhgj.github.io/qinghe-community-web/ 。

仓库的 Settings → Pages → Build and deployment 选择 GitHub Actions。推送 `main` 后，`.github/workflows/pages.yml` 会安装依赖、运行检查与测试、打包 `dist`，最后发布到 `github-pages` 环境。首次发布需要创建公开仓库并启用 Pages。

本地运行 `npm run build:pages` 可生成同一发布文件。`dist` 仅包含网页代码、原稿素材和游戏资源；不会包含 `.local`、浏览器数据、依赖目录、本地服务或测试文件。图片按原始字节复制，游戏的根路径引用只在发布文件中改写，使其兼容项目子目录。原稿尺寸与页面布局不变。

发布验收应检查 Actions 的部署任务成功、网站首页能打开，且网站 `build-info.json` 中的 `commit` 对应当前发布提交。该文件也包含 `app.js` 的 SHA-256，可比对线上版本。登录、帖子、聊天与游戏进度仍在各访问者自己的浏览器保存；公开访问不等于跨设备共享数据。
