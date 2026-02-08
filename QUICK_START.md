# 🚀 Quick Start Guide - Campus Notes Library

## ⚡ 5-Minute Setup

### Step 1: Get Your Google Client ID (3 minutes)

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project: "Campus Notes Library"
3. Enable **Google Drive API**
4. Create **OAuth 2.0 credentials** (Web application)
5. Add authorized origin: `http://localhost:5500`
6. Copy your **Client ID**

### Step 2: Update the Code (1 minute)

1. Open `js/auth.js`
2. Replace line 27:
   ```javascript
   const CLIENT_ID = 'YOUR_ACTUAL_CLIENT_ID.apps.googleusercontent.com';
   ```

### Step 3: Run the App (1 minute)

**Option A - VS Code:**
```
Right-click index.html → Open with Live Server
```

**Option B - Python:**
```bash
python -m http.server 5500
```

**Option C - Node.js:**
```bash
npx http-server -p 5500
```

Then open: `http://localhost:5500`

---

## 📖 How to Use

### 🔐 Sign In
1. Click **"Sign In"** button (top-right)
2. Choose your Google account
3. Click **"Allow"** to grant permissions

### 📤 Upload PDFs

**Method 1: Drag & Drop**
- Drag PDF files onto the drop zone
- Select subject category
- Done!

**Method 2: Upload Button**
- Click **"Upload PDF"** button
- Select PDF file(s)
- Choose subject
- Done!

### 📁 Organize Notes
- Click subjects in sidebar to filter
- Use search bar to find specific notes
- All files auto-organized in Google Drive

### 🎯 Manage Notes
- **View**: Opens in Google Drive viewer
- **Download**: Saves to your computer
- **Delete**: Removes from Google Drive

### 🌓 Toggle Theme
- Click sun/moon icon (top-right)
- Switches between light/dark mode
- Preference saved automatically

---

## 🗂️ Folder Structure

Your Google Drive will have:
```
📁 Campus Notes Library/
├── 📁 Programming/
├── 📁 Mathematics/
├── 📁 Database/
├── 📁 Networks/
└── 📁 Algorithms/
```

---

## 🎨 Features at a Glance

✅ **No Backend** - Runs entirely in browser  
✅ **No Database** - Uses Google Drive  
✅ **Drag & Drop** - Easy file uploads  
✅ **Smart Search** - Filter by filename  
✅ **Dark Mode** - Easy on the eyes  
✅ **Responsive** - Works on all devices  
✅ **Secure** - OAuth 2.0 authentication  
✅ **Free** - No costs (uses your Google Drive)  

---

## ⚠️ Important Notes

### ✓ DO:
- Use a web server (Live Server, Python, etc.)
- Sign in before uploading
- Upload PDF files only
- Keep filenames descriptive

### ✗ DON'T:
- Open HTML file directly in browser
- Share your Client ID publicly
- Upload non-PDF files
- Delete the Google Drive folder manually

---

## 🐛 Quick Troubleshooting

| Problem | Solution |
|---------|----------|
| "Failed to load Google API" | Check internet connection, refresh page |
| "Invalid Client ID" | Verify Client ID in `auth.js` |
| "Redirect URI mismatch" | Use `http://localhost:5500` |
| Files not showing | Sign in, wait a moment, refresh |
| Upload failed | Check file is PDF, verify Google Drive space |

---

## 🔑 Keyboard Shortcuts

- `Ctrl/Cmd + K` - Focus search bar
- `Esc` - Clear search
- Click logo - Return to all notes

---

## 📱 Mobile Usage

The app is fully responsive! Access from:
- 📱 Phone browser
- 💻 Tablet
- 🖥️ Desktop

All features work on mobile devices.

---

## 🎓 Tips for Students

1. **Name files clearly**: `Week1-Lecture-Python.pdf`
2. **Upload regularly**: Don't wait until exam time
3. **Use subjects**: Organize as you upload
4. **Search often**: Find notes quickly
5. **Backup**: Your files are in Google Drive (already backed up!)

---

## 🔒 Privacy & Security

- ✅ Your data stays in YOUR Google Drive
- ✅ No third-party servers
- ✅ No tracking or analytics
- ✅ Open source code
- ✅ You control access

---

## 📊 Limits

- **File size**: Google Drive limit (15GB free)
- **File types**: PDF only
- **Storage**: Your Google Drive quota
- **Users**: Just you (or add test users)

---

## 🌟 Pro Tips

### Tip 1: Batch Upload
Select multiple PDFs at once - they'll all upload to the same subject.

### Tip 2: Descriptive Names
Use clear filenames like:
- `Database-Chapter3-Normalization.pdf`
- `Math-Assignment-5-Solutions.pdf`

### Tip 3: Regular Cleanup
Delete old or duplicate files to save space.

### Tip 4: Mobile Access
Bookmark the site on your phone for quick access.

### Tip 5: Share with Friends
They can set up their own instance with their Google account!

---

## 🚀 Next Steps

1. ✅ Complete the setup
2. ✅ Upload your first PDF
3. ✅ Organize by subject
4. ✅ Try the search feature
5. ✅ Toggle dark mode
6. ✅ Access from mobile

---

## 📚 Additional Resources

- **Full Setup Guide**: See `SETUP_GUIDE.md`
- **README**: See `README.md`
- **Google Drive API**: [Documentation](https://developers.google.com/drive)

---

## ❓ FAQ

**Q: Is this free?**  
A: Yes! Uses your free Google Drive storage.

**Q: Can others access my files?**  
A: No, only you can access your Google Drive files.

**Q: Does it work offline?**  
A: No, requires internet for Google Drive access.

**Q: Can I use it on my phone?**  
A: Yes! Fully responsive design.

**Q: What if I delete a file by mistake?**  
A: Check Google Drive trash - files stay there for 30 days.

**Q: Can I add more subjects?**  
A: Yes! Edit the code to add custom subjects.

**Q: Is my data safe?**  
A: Yes, stored in your Google Drive with Google's security.

---

**Happy organizing! 📚✨**

Need help? Check `SETUP_GUIDE.md` for detailed instructions.
