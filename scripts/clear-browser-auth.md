# Clear Browser Authentication

If you're unable to log in with new credentials, it's likely because your browser has cached the old user session.

## Option 1: Clear Browser Storage (Recommended)

1. Open your browser's Developer Tools (F12 or Right-click → Inspect)
2. Go to the "Application" tab (Chrome/Edge) or "Storage" tab (Firefox)
3. Under "Storage" section, find:
   - **Local Storage** → Select your domain → Delete `kiro_user` and `kiro_auth_token`
   - **Cookies** → Select your domain → Delete `kiro_user` cookie
4. Refresh the page

## Option 2: Use Browser Console

Open the browser console (F12 → Console tab) and run:

```javascript
// Clear localStorage
localStorage.removeItem('kiro_user');
localStorage.removeItem('kiro_auth_token');

// Clear cookie
document.cookie = 'kiro_user=; path=/; max-age=0; SameSite=Lax';

// Reload page
location.reload();
```

## Option 3: Hard Refresh

- **Windows/Linux:** Ctrl + Shift + R or Ctrl + F5
- **Mac:** Cmd + Shift + R

## Option 4: Incognito/Private Window

Open your application in an incognito/private browsing window to test with a clean slate.

## New Login Credentials

After clearing the cache, use these credentials:

**Admin User:**

- Login: `AdminLogin`
- Password: `AdminPswd`

**Demo User:**

- Login: `User1Login`
- Password: `User1Pswd`
