# 📚 My Campus Notes Library

A modern, cloud-based personal PDF notes organizer with direct Google Drive integration. Store, organize, and manage your campus notes without any backend or database.

![Version](https://img.shields.io/badge/version-1.0.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

- 🎨 **Modern Dashboard UI** - Clean, intuitive interface with smooth animations
- 🌓 **Dark/Light Mode** - Toggle between themes with persistent preference
- 📁 **Subject Organization** - Organize notes by Programming, Mathematics, Database, Networks, and Algorithms
- 📤 **Drag & Drop Upload** - Easy PDF upload with drag-and-drop support
- 🔍 **Smart Search** - Filter notes by filename instantly
- ☁️ **Google Drive Integration** - Direct storage in your Google Drive account
- 📱 **Responsive Design** - Works seamlessly on desktop, tablet, and mobile
- 🎯 **No Backend Required** - Fully client-side application
- 🔐 **Secure Authentication** - OAuth 2.0 authentication via Google

## 🚀 Quick Start

### Prerequisites

- A Google account
- A modern web browser (Chrome, Firefox, Safari, Edge)
- A local web server (Live Server, Python HTTP server, or similar)

### Installation

1. **Clone or download this repository**

2. **Set up Google Drive API**

   Follow the detailed setup instructions below to configure Google Drive API access.

3. **Update Client ID**

   Open `js/auth.js` and replace `YOUR_CLIENT_ID_HERE` with your actual Google Client ID:

   ```javascript
   const CLIENT_ID = 'your-actual-client-id.apps.googleusercontent.com';
   ```

4. **Run the application**

   Use a local web server to serve the files. For example:

   **Using Live Server (VS Code Extension):**
   - Right-click on `index.html`
   - Select "Open with Live Server"

   **Using Python:**
   ```bash
   # Python 3
   python -m http.server 5500
   ```

   **Using Node.js:**
   ```bash
   npx http-server -p 5500
   ```

5. **Open in browser**

   Navigate to `http://localhost:5500`

## 🔧 Google Drive API Setup (Detailed)

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click on the project dropdown at the top
3. Click "New Project"
4. Enter a project name (e.g., "Campus Notes Library")
5. Click "Create"

### Step 2: Enable Google Drive API

1. In your project, go to **"APIs & Services"** > **"Library"**
2. Search for **"Google Drive API"**
3. Click on it and press **"Enable"**

### Step 3: Configure OAuth Consent Screen

1. Go to **"APIs & Services"** > **"OAuth consent screen"**
2. Select **"External"** user type (unless you have a Google Workspace)
3. Click **"Create"**
4. Fill in the required fields:
   - **App name:** My Campus Notes Library
   - **User support email:** Your email
   - **Developer contact:** Your email
5. Click **"Save and Continue"**
6. On the **Scopes** page, click **"Add or Remove Scopes"**
7. Add these scopes:
   - `https://www.googleapis.com/auth/drive.file`
   - `https://www.googleapis.com/auth/drive.metadata.readonly`
8. Click **"Update"** and then **"Save and Continue"**
9. On **Test users**, add your email address
10. Click **"Save and Continue"**

### Step 4: Create OAuth 2.0 Credentials

1. Go to **"APIs & Services"** > **"Credentials"**
2. Click **"Create Credentials"** > **"OAuth client ID"**
3. Select **"Web application"**
4. Enter a name (e.g., "Campus Notes Web Client")
5. Under **"Authorized JavaScript origins"**, add:
   ```
   http://localhost:5500
   ```
   (Add your production domain if deploying)
6. Under **"Authorized redirect URIs"**, add:
   ```
   http://localhost:5500
   ```
   (Add your production domain if deploying)
7. Click **"Create"**
8. **Copy the Client ID** - you'll need this!

### Step 5: Update Your Code

1. Open `js/auth.js`
2. Find this line:
   ```javascript
   const CLIENT_ID = 'YOUR_CLIENT_ID_HERE.apps.googleusercontent.com';
   ```
3. Replace it with your actual Client ID:
   ```javascript
   const CLIENT_ID = '123456789-abcdefg.apps.googleusercontent.com';
   ```
4. Save the file

## 📖 How to Use

### First Time Setup

1. **Sign In**
   - Click the "Sign In" button in the top-right corner
   - Authorize the application to access your Google Drive
   - The app will create a "Campus Notes Library" folder in your Google Drive

### Uploading Notes

**Method 1: Drag & Drop**
1. Drag PDF files onto the drop zone
2. Select the subject category
3. Files will be uploaded to Google Drive

**Method 2: Upload Button**
1. Click the "Upload PDF" button
2. Select one or more PDF files
3. Choose the subject category
4. Files will be uploaded

### Organizing Notes

- Use the **sidebar** to filter notes by subject
- Click **"All Notes"** to view everything
- Each subject has its own folder in Google Drive

### Managing Notes

- **View:** Opens the PDF in Google Drive viewer
- **Download:** Downloads the PDF to your device
- **Delete:** Removes the PDF from Google Drive (with confirmation)

### Searching Notes

- Use the **search bar** to filter notes by filename
- Search works across all subjects or within the selected subject

### Theme Toggle

- Click the **sun/moon icon** to switch between light and dark mode
- Your preference is saved automatically

## 📁 Project Structure

```
Personal resouse web/
├── index.html          # Main HTML file
├── css/
│   └── style.css       # All styles and themes
├── js/
│   ├── auth.js         # Google OAuth authentication
│   ├── drive.js        # Google Drive operations
│   └── ui.js           # UI interactions and state
└── README.md           # This file
```

## 🗂️ Google Drive Folder Structure

The app automatically creates this structure in your Google Drive:

```
Campus Notes Library/
├── Programming/
├── Mathematics/
├── Database/
├── Networks/
└── Algorithms/
```

## 🎨 Customization

### Adding New Subjects

1. **Update `js/drive.js`:**
   ```javascript
   const SUBJECTS = ['Programming', 'Mathematics', 'Database', 'Networks', 'Algorithms', 'YourNewSubject'];
   ```

2. **Update `index.html`:**
   Add a new navigation button in the sidebar:
   ```html
   <button class="nav-item" data-subject="YourNewSubject">
       <svg><!-- icon --></svg>
       Your New Subject
   </button>
   ```

3. **Update subject selector:**
   Add a button in the subject selector section:
   ```html
   <button class="subject-btn" data-subject="YourNewSubject">Your New Subject</button>
   ```

### Changing Colors

Edit CSS variables in `css/style.css`:

```css
:root {
    --accent-primary: #6366f1;    /* Primary color */
    --accent-secondary: #8b5cf6;  /* Secondary color */
    /* ... */
}
```

## 🔒 Security & Privacy

- **No Backend:** All operations happen client-side
- **OAuth 2.0:** Secure authentication via Google
- **Your Data:** Files are stored in YOUR Google Drive account
- **No Tracking:** No analytics or tracking code
- **Open Source:** All code is visible and auditable

## 🐛 Troubleshooting

### "Failed to load Google API"
- Check your internet connection
- Ensure the Google API scripts are loading (check browser console)
- Try refreshing the page

### "Authentication failed"
- Verify your Client ID is correct in `js/auth.js`
- Check that your domain is in the authorized origins
- Make sure you're using a local web server (not opening the HTML file directly)

### "Upload failed"
- Ensure you're signed in
- Check that the file is a PDF
- Verify you have enough Google Drive storage space

### Files not showing
- Click "Sign In" if not already authenticated
- Wait a moment for files to load
- Check the browser console for errors

## 🌐 Deployment

### GitHub Pages

1. Push your code to GitHub
2. Go to repository Settings > Pages
3. Select your branch and root folder
4. Update authorized origins in Google Cloud Console with your GitHub Pages URL

### Netlify/Vercel

1. Connect your repository
2. Deploy
3. Update authorized origins with your deployment URL

**Important:** Always update your Google Cloud Console authorized origins when deploying to a new domain!

## 📝 License

MIT License - feel free to use this project for personal or educational purposes.

## 🤝 Contributing

This is a personal project, but suggestions and improvements are welcome!

## 💡 Tips

- **Organize as you go:** Upload files to the correct subject immediately
- **Use descriptive names:** Name your PDFs clearly for easy searching
- **Regular backups:** Your files are in Google Drive, which is automatically backed up
- **Mobile access:** Access your notes from any device with a browser

## 🎯 Future Enhancements

Potential features for future versions:
- PDF preview thumbnails
- Tags and labels
- Sharing capabilities
- Bulk operations
- Advanced search filters
- Study progress tracking

## 📧 Support

If you encounter issues:
1. Check the troubleshooting section
2. Review the browser console for errors
3. Verify your Google Cloud Console setup
4. Ensure all files are properly served via a web server

---

**Built with ❤️ for students who want to organize their notes efficiently**
