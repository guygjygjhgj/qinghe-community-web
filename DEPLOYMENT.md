# GitHub Pages 发布

发布目标为公开仓库 `guygjygjhgj/qinghe-community-web`，网站地址为 https://guygjygjhgj.github.io/qinghe-community-web/ 。

仓库的 Settings → Pages → Build and deployment 选择 GitHub Actions。推送 `main` 后，`.github/workflows/pages.yml` 会安装依赖、运行检查与测试、打包 `dist`，最后发布到 `github-pages` 环境。首次发布需要创建公开仓库并启用 Pages。

本地运行 `npm run build:pages` 可生成同一发布文件。`dist` 仅包含网页代码、原稿素材和游戏资源；不会包含 `.local`、浏览器数据、依赖目录、本地服务或测试文件。图片按原始字节复制，游戏的根路径引用只在发布文件中改写，使其兼容项目子目录。原稿尺寸与页面布局不变。

发布验收应检查 Actions 的部署任务成功、网站首页能打开，且网站 `build-info.json` 中的 `commit` 对应当前发布提交。该文件也包含 `app.js` 的 SHA-256，可比对线上版本。

登录页保留 Figma 手机号验证码画板；首次使用演示手机号时提交注册，审批通过后再获取登录验证码。`#/register` 与 `#/login` 共用原稿。仅接受 `19900000001` 至 `19900009999` 的演示号码，不发送短信。验证码由服务随机生成，有效十分钟，重发间隔一分钟；未审批账号不能登录。

注册服务：https://qinghe-registration-service.hebaixuan01111123.chatgpt.site 。账号、申请、审批状态及会话保存在共享 D1 数据库。审核服务：https://qinghe-registration-review.hebaixuan01111123.chatgpt.site ，保持所有者私有；审核者登录自己的 ChatGPT 账号，在卡片中核对并输入六位演示验证码，再明确点击批准或驳回。审核密钥仅存在两个服务的运行时环境变量中，不进入 GitHub 网页。

两个预备演示账号为 `19900000001`（李阿姨）、`19900000002`（王阿姨），必须由所有者手动批准。帖子、聊天、植物与游戏进度仍在各访问者自己的浏览器保存；公开访问不代表这些业务内容已跨设备同步。
