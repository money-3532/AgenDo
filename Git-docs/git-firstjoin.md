一、队友首次加入（只做一次）
1. 安装 Git
到 https://git-scm.com/download/win 下载安装，一路默认即可。

2. 配置身份（只需一次）
powershell
git config --global user.name "队友的名字"
git config --global user.email "队友的邮箱"
3. 接受仓库邀请
你已在 GitHub Settings → Collaborators 邀请队友后，队友需要到 GitHub 通知或邮箱里接受邀请，否则没有推送权限。

4. 克隆仓库
powershell
cd C:\Users\队友\Desktop
git clone https://github.com/money-3532/AgenDo.git
cd AgenDo
5. 确认环境
powershell
git status
git branch
应显示 On branch main，且 main 前有 *。