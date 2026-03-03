# Database / Backups

Use the **Save** button (dashboard header, top right) to export all app data to a JSON file. The file is downloaded as `database/backup-YYYY-MM-DD.json`.

- **Where to save:** Save the downloaded file into this `database` folder, or upload it to your preferred cloud storage (Google Drive, OneDrive, etc.) so you can use the app from anywhere (e.g. after cloning the repo from GitHub).
- **What’s included:** Monthly database (income, expenses), loans, credit cards, and trips, plus an `exportedAt` timestamp.
- **Restore:** To restore from a backup, you would need an **Import** feature (or replace `localStorage` contents manually via browser dev tools). For now, the app uses browser `localStorage`; the backup is for safekeeping and moving to another device or cloud.

**Reset** (header) clears all data in the browser and reloads the app with default values, after confirmation.
