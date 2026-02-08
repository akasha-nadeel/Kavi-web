# 🔑 Google Drive API Setup Guide

## Complete Step-by-Step Instructions

This guide will walk you through setting up Google Drive API access for the Campus Notes Library application.

---

## 📋 Prerequisites

- A Google account
- Access to [Google Cloud Console](https://console.cloud.google.com/)
- 10-15 minutes of time

---

## 🎯 Step 1: Create a Google Cloud Project

1. **Navigate to Google Cloud Console**
   - Go to: https://console.cloud.google.com/
   - Sign in with your Google account

2. **Create a New Project**
   - Click the project dropdown at the top of the page (next to "Google Cloud")
   - Click **"New Project"** button
   - Enter project details:
     - **Project name:** `Campus Notes Library` (or any name you prefer)
     - **Organization:** Leave as default (No organization)
   - Click **"Create"**
   - Wait for the project to be created (this takes a few seconds)

3. **Select Your Project**
   - Once created, make sure your new project is selected in the project dropdown

---

## 🔌 Step 2: Enable Google Drive API

1. **Open API Library**
   - In the left sidebar, click **"APIs & Services"**
   - Click **"Library"**

2. **Find Google Drive API**
   - In the search bar, type: `Google Drive API`
   - Click on **"Google Drive API"** from the results

3. **Enable the API**
   - Click the blue **"Enable"** button
   - Wait for the API to be enabled (takes a few seconds)
   - You'll be redirected to the API dashboard

---

## 🔐 Step 3: Configure OAuth Consent Screen

This step tells Google what your app does and who can use it.

1. **Navigate to OAuth Consent Screen**
   - In the left sidebar, click **"APIs & Services"**
   - Click **"OAuth consent screen"**

2. **Select User Type**
   - Choose **"External"** (unless you have Google Workspace)
   - Click **"Create"**

3. **Fill in App Information**
   
   **OAuth consent screen tab:**
   - **App name:** `My Campus Notes Library`
   - **User support email:** Select your email from dropdown
   - **App logo:** (Optional) Skip for now
   - **App domain:** (Optional) Leave blank for now
   - **Authorized domains:** (Optional) Leave blank for now
   - **Developer contact information:** Enter your email address
   - Click **"Save and Continue"**

4. **Configure Scopes**
   
   **Scopes tab:**
   - Click **"Add or Remove Scopes"**
   - In the filter box, search for: `drive`
   - Select these two scopes:
     - ✅ `https://www.googleapis.com/auth/drive.file`
       - *See, edit, create, and delete only the specific Google Drive files you use with this app*
     - ✅ `https://www.googleapis.com/auth/drive.metadata.readonly`
       - *View metadata for files in your Google Drive*
   - Click **"Update"**
   - Click **"Save and Continue"**

5. **Add Test Users**
   
   **Test users tab:**
   - Click **"+ Add Users"**
   - Enter your email address (the one you'll use to test the app)
   - Click **"Add"**
   - Click **"Save and Continue"**

6. **Review and Confirm**
   - Review your settings
   - Click **"Back to Dashboard"**

---

## 🎫 Step 4: Create OAuth 2.0 Credentials

This is where you get your Client ID!

1. **Navigate to Credentials**
   - In the left sidebar, click **"APIs & Services"**
   - Click **"Credentials"**

2. **Create OAuth Client ID**
   - Click **"+ Create Credentials"** at the top
   - Select **"OAuth client ID"**

3. **Configure the Client**
   
   - **Application type:** Select **"Web application"**
   - **Name:** `Campus Notes Web Client` (or any name)
   
   - **Authorized JavaScript origins:**
     - Click **"+ Add URI"**
     - Enter: `http://localhost:5500`
     - (If you plan to deploy, add your production URL too)
   
   - **Authorized redirect URIs:**
     - Click **"+ Add URI"**
     - Enter: `http://localhost:5500`
     - (If you plan to deploy, add your production URL too)
   
   - Click **"Create"**

4. **Save Your Client ID**
   - A popup will appear with your credentials
   - **Copy the Client ID** (it looks like: `123456789-abc123def456.apps.googleusercontent.com`)
   - You can also download the JSON file for backup
   - Click **"OK"**

---

## 💻 Step 5: Update Your Application Code

1. **Open the Project**
   - Navigate to your project folder: `Personal resouse web`

2. **Edit auth.js**
   - Open `js/auth.js` in your code editor

3. **Replace the Client ID**
   - Find this line (around line 27):
     ```javascript
     const CLIENT_ID = 'YOUR_CLIENT_ID_HERE.apps.googleusercontent.com';
     ```
   - Replace `YOUR_CLIENT_ID_HERE.apps.googleusercontent.com` with your actual Client ID:
     ```javascript
     const CLIENT_ID = '123456789-abc123def456.apps.googleusercontent.com';
     ```
   - **Important:** Keep the quotes around the Client ID!

4. **Save the File**
   - Save `auth.js`

---

## 🚀 Step 6: Test Your Setup

1. **Start a Local Web Server**
   
   You MUST use a web server (not just opening the HTML file).
   
   **Option A: VS Code Live Server**
   - Install "Live Server" extension in VS Code
   - Right-click `index.html`
   - Select "Open with Live Server"
   
   **Option B: Python**
   ```bash
   cd "c:/Users/User/Desktop/My projects/Personal resouse web"
   python -m http.server 5500
   ```
   
   **Option C: Node.js**
   ```bash
   cd "c:/Users/User/Desktop/My projects/Personal resouse web"
   npx http-server -p 5500
   ```

2. **Open in Browser**
   - Navigate to: `http://localhost:5500`

3. **Test Sign In**
   - Click the **"Sign In"** button in the top-right
   - You should see a Google sign-in popup
   - Select your Google account
   - Click **"Allow"** to grant permissions
   - You should be signed in!

4. **Test Upload**
   - Try uploading a PDF file
   - Check your Google Drive - you should see a new folder called "Campus Notes Library"

---

## ✅ Verification Checklist

Before you start using the app, verify:

- [ ] Google Cloud project created
- [ ] Google Drive API enabled
- [ ] OAuth consent screen configured
- [ ] Test user (your email) added
- [ ] OAuth 2.0 credentials created
- [ ] Client ID copied and pasted into `auth.js`
- [ ] Application running on `http://localhost:5500`
- [ ] Sign-in works successfully
- [ ] Can upload a test PDF
- [ ] "Campus Notes Library" folder appears in Google Drive

---

## 🐛 Common Issues and Solutions

### Issue: "Failed to load Google API"

**Cause:** Google API scripts not loading

**Solutions:**
- Check your internet connection
- Make sure you're using a web server (not opening HTML directly)
- Check browser console for specific errors
- Try a different browser

---

### Issue: "Invalid Client ID"

**Cause:** Client ID not configured correctly

**Solutions:**
- Double-check you copied the entire Client ID
- Make sure there are no extra spaces
- Verify the Client ID in Google Cloud Console matches your code
- Ensure you're using the Client ID (not Client Secret)

---

### Issue: "Redirect URI mismatch"

**Cause:** Your current URL doesn't match authorized origins

**Solutions:**
- Verify you're accessing via `http://localhost:5500`
- Check authorized JavaScript origins in Google Cloud Console
- Make sure you added `http://localhost:5500` (not `https://`)
- If using a different port, update both the server and Google Cloud Console

---

### Issue: "Access blocked: This app's request is invalid"

**Cause:** OAuth consent screen not properly configured

**Solutions:**
- Go back to OAuth consent screen in Google Cloud Console
- Verify all required fields are filled
- Make sure you added yourself as a test user
- Check that the required scopes are added

---

### Issue: "This app isn't verified"

**Cause:** Your app is in testing mode

**Solutions:**
- This is normal for development!
- Click **"Advanced"**
- Click **"Go to [App Name] (unsafe)"**
- This warning only appears for test users
- For production, you'd need to verify your app with Google

---

### Issue: Files not uploading

**Cause:** Various possible issues

**Solutions:**
- Make sure you're signed in
- Check that the file is a PDF
- Verify you have Google Drive storage space
- Check browser console for errors
- Try signing out and back in

---

## 🌐 Deploying to Production

When you're ready to deploy your app:

1. **Deploy your website** (GitHub Pages, Netlify, Vercel, etc.)

2. **Update Google Cloud Console:**
   - Go to **Credentials** > Your OAuth Client
   - Add your production URL to:
     - Authorized JavaScript origins
     - Authorized redirect URIs
   - Example: `https://yourusername.github.io`

3. **Update OAuth Consent Screen:**
   - Add your production domain to authorized domains
   - Consider publishing your app (removes test user limitation)

4. **Test thoroughly** on the production URL

---

## 📚 Additional Resources

- [Google Drive API Documentation](https://developers.google.com/drive/api/guides/about-sdk)
- [OAuth 2.0 Documentation](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)

---

## 🔒 Security Best Practices

1. **Never share your Client Secret** (we only use Client ID)
2. **Don't commit credentials** to public repositories
3. **Use environment variables** for production deployments
4. **Regularly review** authorized applications in your Google account
5. **Limit scopes** to only what you need (we use minimal scopes)

---

## 💡 Tips

- **Save your Client ID** somewhere safe (password manager)
- **Download the JSON** credentials file as backup
- **Test with a secondary Google account** first if you're worried
- **Your files are safe** - they're stored in YOUR Google Drive
- **You can revoke access** anytime from your Google account settings

---

## ❓ Need Help?

If you're stuck:

1. **Check the browser console** (F12) for error messages
2. **Review this guide** step by step
3. **Verify each checklist item** above
4. **Try with a fresh Google Cloud project** if all else fails

---

**You're all set! 🎉**

Once you complete these steps, your Campus Notes Library will be fully functional and ready to organize your PDFs!
