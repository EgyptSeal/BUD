# Step-by-step: Add this app to GitHub and use it anywhere

## Part 1 — Put the app on GitHub

### 1. Create a GitHub account (if you don’t have one)
- Go to [github.com](https://github.com) → **Sign up**.
- Use the **same** email/account you want to use everywhere.

### 2. Install Git on your computer (if needed)
- Windows: download from [git-scm.com](https://git-scm.com/download/win) and run the installer.
- After install, open **PowerShell** or **Command Prompt** and run:
  ```bash
  git --version
  ```
  If you see a version number, Git is installed.

### 3. Tell Git who you are (one-time per machine)
In PowerShell or Command Prompt run (use your real name and GitHub email):

```bash
git config --global user.name "Your Name"
git config --global user.email "your-email@example.com"
```

### 4. Create a new repository on GitHub
1. Log in to [github.com](https://github.com).
2. Click the **+** (top right) → **New repository**.
3. **Repository name:** e.g. `personal-budget-app` (no spaces).
4. **Description:** optional, e.g. "Personal budget tracker".
5. Choose **Public**.
6. **Do not** check "Add a README" (you already have files).
7. Click **Create repository**.

### 5. Turn your project folder into a Git repo and push it
Open PowerShell and go to your **PFIS** project folder, then run:

```powershell
cd "C:\Users\hussa\Downloads\Compressed\EVNavWebView_Project\PFIS"
```

Then run these commands one by one:

```powershell
git init
git add .
git status
```

Check that the list shows your files (index.html, app.js, dataEngine.js, style.css, charts.js, etc.). Then:

```powershell
git commit -m "Initial commit: Personal budget app"
```

Then connect to GitHub and push (replace `YOUR_USERNAME` and `YOUR_REPO` with your GitHub username and repo name, e.g. `hussamhegazi` and `personal-budget-app`):

```powershell
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git branch -M main
git push -u origin main
```

When asked for password, use a **Personal Access Token** (GitHub no longer accepts account password for push):

- GitHub → **Settings** → **Developer settings** → **Personal access tokens** → **Tokens (classic)** → **Generate new token**.
- Give it a name, choose **repo** scope, generate, then **copy the token** and paste it when Git asks for password (username = your GitHub username).

---

## Part 2 — Use the app “anywhere”

### Option A — Clone on another computer
1. On the other computer, install Git and log in to GitHub (or use the same account).
2. Open PowerShell and run (use your real repo URL):
   ```powershell
   git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
   cd YOUR_REPO
   ```
3. Open **index.html** in a browser (double-click or drag into Chrome/Edge), or run a small local server:
   ```powershell
   npx serve .
   ```
   Then open the URL it shows (e.g. http://localhost:3000).

### Option B — Run from GitHub Pages (same account, same repo)
1. On GitHub: open your repo → **Settings** → **Pages**.
2. Under **Source** choose **Deploy from a branch**.
3. Branch: **main**, folder: **/ (root)** → **Save**.
4. After a minute, your app will be at:
   `https://YOUR_USERNAME.github.io/YOUR_REPO/`

You can open that URL on any device (phone, another PC) and use the app.

---

## Part 3 — “Make sure the server saves my data”

**Important:** This app is **static** (HTML + JS only). It does **not** have a server. All data is stored in the **browser’s localStorage** on the device you’re using.

- **Same device, same browser:** data stays.
- **Different device or different browser:** data is **not** there. So you need a way to “carry” your data.

### What you have now (no server)

1. **Save button (top right)**  
   - Downloads a JSON file with all your data (database, loans, credit cards, trips).  
   - Save that file in a safe place (e.g. **database** folder in the repo, or Google Drive / OneDrive).

2. **Restore manually (for now)**  
   - There is no “Import” button yet. To restore on another device you would:
     - Copy the backup JSON into the app (e.g. via a future “Import from file” feature), or
     - Use the same backup file and a simple script to put data back into localStorage (advanced).

So **“the server saves my data”** is not true yet: **no server is saving your data**. Only the browser is. To have a server save it, you’d need one of the options below.

### Option 1 — Backup file as “server” (simple, no coding)

- Use **Save** regularly.
- Put the backup file in a folder that syncs (e.g. **Google Drive**, **OneDrive**, or a **database** folder in your repo and commit it).
- When you open the app on another device, you’d need an **Import** feature to load that file (we can add that next so “the server” is effectively your cloud folder + the backup file).

### Option 2 — Real server (backend) that saves data

To have a **real** server save your data so it’s the same everywhere:

- Use a **Backend-as-a-Service** that works with static sites, for example:
  - **Firebase** (Firestore or Realtime Database): free tier, works from the browser.
  - **Supabase**: free tier, PostgreSQL, works from the browser.
- The app would:
  - **Load** data from Firebase/Supabase when you open it.
  - **Save** data to Firebase/Supabase when you click Save (or on every change).

That would require adding some JavaScript (and optionally a small backend) and is the only way to have “the server saves my data” in the sense of one central place that all devices use.

---

## Summary checklist

| Step | Action |
|------|--------|
| 1 | GitHub account + Git installed + `user.name` / `user.email` set |
| 2 | Create new repo on GitHub (no README) |
| 3 | `git init` → `git add .` → `git commit` in your PFIS folder |
| 4 | `git remote add origin` → `git push -u origin main` (use a token as password) |
| 5 | Use app anywhere: clone repo or open GitHub Pages URL |
| 6 | Data: use **Save** and store the file in cloud or repo; for true “server saves my data”, add Firebase/Supabase (or similar) later |

If you tell me your preferred option (only backup file + Import, or real server like Firebase/Supabase), I can give you the exact next steps or code changes for this project.
