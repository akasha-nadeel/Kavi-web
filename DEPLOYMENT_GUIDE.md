# 🚀 Deployment Guide: Hosting Your Campus Notes App

This guide explains how to put your website online so others (like your girlfriend) can access it from their devices.

---

## 📦 Step 1: Upload to GitHub

1.  Create a standard GitHub repository.
2.  Upload all your project files to it (`index.html`, `css/`, `js/`, etc.).

## 🌐 Step 2: Enable GitHub Pages (Free Hosting)

1.  On your GitHub repository page, click **Settings** (top right tab).
2.  On the left sidebar, click **Pages**.
3.  Under **Build and deployment > Branch**, select `main` (or `master`) and `/ (root)`.
4.  Click **Save**.
5.  Wait about 1-2 minutes. Refresh the page.
6.  You will see a banner: **"Your site is live at..."**
7.  **COPY THIS URL.** (e.g., `https://learning-student.github.io/campus-notes`)

---

## 🔑 Step 3: Update Google Cloud Console (Critical!)

Google will BLOCK your new website unless you tell it that this URL is safe.

1.  Go to [Google Cloud Console > Credentials](https://console.cloud.google.com/apis/credentials).
2.  Click the **pencil icon (Edit)** next to your OAuth 2.0 Client ID.
3.  **Authorized JavaScript origins:**
    *   Click **ADD URI**.
    *   Paste your GitHub Pages URL (e.g., `https://learning-student.github.io`).
    *   *Note: Remove the slash `/` at the end and don't include `/campus-notes` path here, just the domain.*
4.  **Authorized redirect URIs:**
    *   Click **ADD URI**.
    *   Paste the EXACT same URL as above.
    *   Add another one WITH the full path to your project if it's in a subfolder: `https://learning-student.github.io/campus-notes`
5.  Click **Save**.

---

## 👥 Step 4: Grant Access

Since your app is in "Testing" mode (External), random people cannot sign in.

1.  Go to [OAuth Consent Screen](https://console.cloud.google.com/apis/credentials/consent).
2.  Scroll down to **Test users**.
3.  Click **+ Add Users**.
4.  Enter your girlfriend's email address (and anyone else you trust).
5.  Click **Save**.

---

## 📂 Step 5: Share the Drive Folder

For them to see the files, they need permission on the Google Drive folder itself.

1.  Go to Google Drive.
2.  Right-click "Campus Notes Library".
3.  Share > Type their email > **Editor** (to upload) or **Viewer** (read-only).
4.  Send.

**🎉 Done! Send them the GitHub Pages link and they can now sign in!**
