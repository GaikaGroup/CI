# Database Management Scripts

This document contains commands to run various database management scripts.

## Delete All Sessions

Removes all sessions and messages from the database.

**WARNING:** This will permanently delete all session data!

```bash
node scripts/delete-all-sessions.js
```

**What it does:**

- Deletes all messages from the database
- Deletes all sessions from the database
- Provides a count of deleted records

**Use case:** Clean the database for testing or when resetting the system.
