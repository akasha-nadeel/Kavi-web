# Testing Your Campus Notes Library

## Quick Test Guide

### 1. Start the Local Server

Open a terminal in the project folder and run:
```bash
python -m http.server 8080
```

Then open your browser to: `http://localhost:8080`

### 2. Test Upload Functionality (Without Google Sign-In)

**What should happen:**
- ✅ Click the "Upload PDF" button → You should see a "Please sign in first" toast message
- ✅ Click the drag-and-drop zone → Same "Please sign in first" message
- ✅ Drag a PDF file over the drop zone → The zone should highlight
- ✅ Drop a PDF file → "Please sign in first" message

**If these don't work:**
1. Open browser console (F12)
2. Check for JavaScript errors
3. Verify all three JS files loaded correctly

### 3. Test Subject Management

**What should happen:**
- ✅ Click the edit icon (✏️) next to "Subjects" in sidebar
- ✅ Modal should open showing current subjects
- ✅ Type a new subject name and click "Add"
- ✅ New subject appears in the list
- ✅ New subject appears in sidebar navigation
- ✅ Click X button on a subject to remove it

### 4. Test Theme Toggle

**What should happen:**
- ✅ Click the sun/moon icon in header
- ✅ Page switches between light and dark mode
- ✅ Preference is saved (refresh page to verify)

### 5. Test Search

**What should happen:**
- ✅ Type in the search box
- ✅ Notes filter in real-time (once you have uploaded some)

## Setting Up Google Drive Integration

To actually upload files to Google Drive, you need to:

1. **Get a Google Client ID** (see SETUP_GUIDE.md)
2. **Edit `js/auth.js`** line 33:
   ```javascript
   const CLIENT_ID = 'YOUR_ACTUAL_CLIENT_ID.apps.googleusercontent.com';
   ```
3. **Refresh the page**
4. **Click "Sign In"** button
5. **Grant permissions** to access Google Drive
6. **Now upload will work!**

## Troubleshooting

### Upload button doesn't respond
- Check browser console for errors
- Verify `js/ui.js` loaded correctly
- Try the test page: `http://localhost:8080/test-upload.html`

### Drag and drop doesn't work
- Make sure you're dragging PDF files
- Check if the drop zone highlights on drag over
- Open console and look for error messages

### Modal doesn't open
- Check if `window.drive` is defined (type in console)
- Verify `js/drive.js` loaded without errors

### Nothing works at all
- Clear browser cache
- Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- Check all script files are in correct locations:
  - `js/auth.js`
  - `js/drive.js`
  - `js/ui.js`

## Console Commands for Debugging

Open browser console (F12) and try:

```javascript
// Check if modules loaded
console.log('Auth:', window.auth);
console.log('Drive:', window.drive);

// Check subjects
console.log('Subjects:', window.drive.getSubjects());

// Test toast notification
window.showToast('Test message', 'success');

// Check authentication status
console.log('Authenticated:', window.auth.isAuthenticated());
```

## Current Status

✅ **Working Features (No Sign-In Required):**
- Theme toggle
- Subject management (add/remove)
- Sidebar navigation
- Search bar
- Upload button (shows sign-in prompt)
- Drag and drop (shows sign-in prompt)

🔐 **Requires Google Sign-In:**
- Actual file upload to Google Drive
- Viewing uploaded files
- Downloading files
- Deleting files

## Next Steps

1. Test basic functionality (upload button, drag-drop, subject management)
2. If everything works, proceed with Google Drive API setup
3. Get your Client ID from Google Cloud Console
4. Update `js/auth.js` with your Client ID
5. Test full upload workflow
