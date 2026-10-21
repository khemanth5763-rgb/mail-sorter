# Application Mail Sorter

Reads your Gmail (read-only) in your browser and sorts emails into:
Assessment, Interview, Accepted, Submitted, Rejected. Unrelated mail goes to "Other".
No server and no database. Your emails never leave your browser.

## Files to upload
index.html, style.css, app.js, config.js  (keep them in the same folder)

## Setup (about 10 minutes, one time)

### 1. Get a Google Client ID
1. Go to https://console.cloud.google.com and create a project.
2. APIs & Services > Library > search "Gmail API" > Enable.
3. APIs & Services > OAuth consent screen: choose External, fill in app name and your email.
   Under "Test users", add your own Gmail address (needed while the app is in Testing mode).
4. APIs & Services > Credentials > Create credentials > OAuth client ID > "Web application".
5. Under "Authorized JavaScript origins" add your site address exactly,
   e.g. https://yourwebsite.com  (no trailing slash, no path).
   For local testing also add http://localhost:8000
6. Copy the Client ID (ends with .apps.googleusercontent.com).

### 2. Add it to the app
Open config.js and replace PASTE_YOUR_CLIENT_ID.apps.googleusercontent.com with your Client ID.

### 3. Upload
Upload the four files to your website (the site must use https). Open the page and click "Connect Gmail".

## Notes
- "Google hasn't verified this app" warning is normal in Testing mode. Click Advanced > Continue.
- Use "Try demo emails" to check the page works before connecting Gmail.
- To test locally: run `python3 -m http.server 8000` in the folder, open http://localhost:8000
- Sorting uses keyword matching. Edit the RULES list at the top of app.js to add your own phrases.
