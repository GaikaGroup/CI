# Restart Instructions After User Changes

After updating user credentials, you need to:

## 1. Restart the Development Server

Stop your current dev server (Ctrl+C) and restart it:

```bash
npm run dev
```

## 2. Clear Browser Cache

Open browser console (F12) and run:

```javascript
localStorage.clear(); 
document.cookie = 'kiro_user=; path=/; max-age=0'; 
location.reload();
```

## 3. Test New Credentials

**Admin User:**
- Login: `AdminLogin`
- Password: `AdminPswd`
- Role: admin

**Demo User:**
- Login: `User1Login`
- Password: `User1Pswd`
- Role: student

## Files Updated

The following files were updated to remove old users:
- `src/lib/modules/auth/services/LocalAuthService.js`
- `src/lib/modules/auth/stores.js`
- `tests/auth/stores.test.js`

All old credentials have been removed:
- ❌ Admin / Demo543
- ❌ admin@example.com / password
- ❌ student@example.com / password
- ❌ student1@example.com / Demo123
- ❌ student2@example.com / Demo321
