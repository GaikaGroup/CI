# Session Creation Fix - Missing Users in Database

## Problem

Users were unable to create new sessions, receiving a "Failed to create new session" error with a 500 Internal Server Error.

## Root Cause

The authentication system was working with cookies/localStorage, but the corresponding user records didn't exist in the database. When trying to create a session, the foreign key constraint on `Session.userId` failed because the user ID didn't exist in the `users` table.

## Solution

Created a script to add test users to the database with proper password hashing.

### Script Created: `scripts/create-test-users.js`

This script creates two test users:

- **Admin User**: AdminLogin / AdminPswd (type: admin)
- **Regular User**: UserLogin / UserPswd (type: regular)

The script uses `upsert` to either create new users or update existing ones, making it safe to run multiple times.

### Usage

```bash
# Run the script directly
node scripts/create-test-users.js

# Or use the npm script
npm run create-test-users
```

### What the Script Does

1. Hashes passwords using bcryptjs (same as the registration endpoint)
2. Creates/updates admin user with email "AdminLogin"
3. Creates/updates regular user with email "UserLogin"
4. Sets proper user types and activates accounts
5. Displays the created user IDs and credentials

## Files Created/Modified

- `scripts/create-test-users.js` - New script to create test users
- `package.json` - Added `create-test-users` script command
- `package.json` - Added `bcryptjs` and `jsonwebtoken` to dependencies

## Testing

After running the script:

1. **Logout** if currently logged in
2. **Login** with one of the test accounts:
   - AdminLogin / AdminPswd
   - UserLogin / UserPswd
3. **Navigate** to `/sessions`
4. **Click** "New Chat" button
5. **Verify** session is created successfully

## Prevention

To prevent this issue in the future:

1. **Always run the user creation script** after database resets
2. **Check user existence** before attempting operations that require user IDs
3. **Add better error messages** that indicate when a user doesn't exist
4. **Consider adding a database seed script** that runs automatically after migrations

## Related Issues

This fix also resolves:

- Authentication working but operations failing
- Foreign key constraint violations on user-related tables
- Silent failures in user-dependent operations

## Additional Notes

The demo authentication in `LocalAuthService.js` was checking for these exact credentials but only storing them in localStorage/cookies without creating database records. This created a mismatch between the authentication layer and the data layer.

The proper flow should be:

1. User authenticates → JWT token created
2. JWT token contains user ID from database
3. All operations use this user ID
4. User ID exists in database, so foreign key constraints pass
