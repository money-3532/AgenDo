二、日常开发流程（每次写代码都按这个走）
第 1 步：同步最新代码
powershell
git switch main
git pull
每次开始写代码前必须先做这一步，保证基于最新代码开发。

第 2 步：创建自己的功能分支
分支名格式：feature/功能名，不要用中文。

powershell
git switch -c feature/backend-login
后端队友只改 backend/，前端只改 frontend/，互不干扰。

第 3 步：写代码
只修改自己负责的目录。提交前用 git status 检查改了哪些文件：

powershell
git status
git diff
第 4 步：提交代码
powershell
git add backend/
git commit -m "feat(backend): 实现登录接口"
提交信息格式：类型(范围): 描述

类型	用途
feat	新功能
fix	修 Bug
docs	文档
refactor	重构
chore	配置/依赖等杂项
第 5 步：推送到 GitHub
powershell
git push -u origin feature/backend-login
第一次推送带 -u，之后同一分支直接 git push 即可。

第 6 步：发起 Pull Request
打开 https://github.com/money-3532/AgenDo

页面会提示 Compare & pull request，点击

确认 base 是 main，compare 是你的功能分支

填写标题和说明，点 Create pull request

通知对方来审查

第 7 步：对方审查并合并
对方在 PR 页面点 Review changes → Approve

然后点 Merge pull request → Confirm merge

合并后可以点 Delete branch 删除远程功能分支

⚠️ 因为开启了 Require approvals: 1，必须对方批准后 PR 才能合并，自己不能合并自己的 PR。

第 8 步：合并后同步本地
powershell
git switch main
git pull
git branch -d feature/backend-login
删除本地已合并的分支，保持干净。


三、注意事项
🚫 绝对不能做的事
不要直接往 main 推送

powershell
# 千万不要这样
git push origin main
分支保护会拒绝，而且这是错误的工作方式。所有改动必须走功能分支 + PR。

不要强制推送

powershell
# 千万不要这样
git push --force
main 已禁止强制推送，强制推送会覆盖历史，可能抹掉队友的代码。

不要提交敏感文件和依赖目录

node_modules/

dist/

.env、.env.local

数据库密码、API 密钥

.gitignore 已配置好，但提交前仍要用 git status 检查。

不要 git add . 后就提交
先 git status 看清暂存了什么，确认没有误加文件。

不要改对方的目录
前端不改 backend/，后端不改 frontend/。需要联调时先在群里沟通接口格式。

✅ 必须养成的习惯
写代码前先 git pull

每次只做一件事，一个功能一个分支，一个 PR

提交信息写清楚，方便以后查历史

推送前先 git status 和 git diff 检查改动

PR 合并后立刻同步本地 main


四、常见问题
Q1：git push 报错 rejected / non-fast-forward
说明远程有你本地没有的提交。先同步：

powershell
git pull --rebase origin main
如果当前在功能分支上：

powershell
git switch main
git pull
git switch 你的功能分支
git rebase main
有冲突就手动解决冲突文件，然后：

powershell
git add .
git rebase --continue
git push
Q2：PR 页面显示 This branch has conflicts that must be resolved
说明你的分支和 main 有冲突。在本地：

powershell
git switch main
git pull
git switch 你的功能分支
git merge main
# 手动解决冲突文件
git add .
git commit -m "merge: 解决与 main 的冲突"
git push
PR 页面会自动更新。

Q3：git push 要求输入密码
GitHub 现在不支持账户密码，需要用 Personal Access Token：

GitHub → 头像 → Settings → Developer settings → Personal access tokens → Tokens (classic)

生成新 token，勾选 repo 权限

推送时密码栏粘贴这个 token

或者直接用 GitHub Desktop 图形客户端，登录后自动管理凭证。

Q4：不小心把 node_modules 提交了
powershell
git rm -r --cached node_modules
git commit -m "chore: 移除误提交的 node_modules"
git push
Q5：想看自己提交了什么
powershell
git log --oneline
git show 提交ID
五、一句话总结流程
git pull → 建功能分支 → 改自己目录 → git status 检查 → git add → git commit → git push → 开 PR → 对方审批 → 合并 → 回到 main 再 git pull

按这个循环走，就不会出问题。