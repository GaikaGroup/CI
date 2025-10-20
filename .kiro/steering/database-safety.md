---
inclusion: always
---

# Database Safety Rules

## CRITICAL: Always Ask Before Destructive Operations

**NEVER execute these commands without explicit user permission:**

- `prisma migrate reset`
- `DROP DATABASE`
- `DROP TABLE`
- `TRUNCATE`
- `DELETE FROM` (without WHERE or with broad WHERE)
- Any command that deletes production data

## Required Process for Database Migrations

1. **Always ask first**: "This migration will affect the database. Do you have a backup? Should I proceed?"
2. **Explain risks**: Clearly state what data might be lost
3. **Suggest backup**: Recommend creating a backup before proceeding
4. **Wait for explicit confirmation**: User must say "yes" or "proceed"

## Safe Migration Pattern

For adding required fields to existing tables:

```sql
-- Step 1: Add nullable column
ALTER TABLE "table" ADD COLUMN "field" TYPE;

-- Step 2: Populate data (via script)
-- Step 3: Make required
ALTER TABLE "table" ALTER COLUMN "field" SET NOT NULL;
```

## Production Data is Sacred

- Assume all data is production data unless told otherwise
- Development/staging environments should be explicitly mentioned
- When in doubt, ASK

## This Project Has Production Data

This project contains:
- User accounts and authentication data
- Course content and materials
- Learning sessions and chat history
- Student progress and statistics
- Enrollment records

**ALL of this data is valuable and should NEVER be deleted without explicit permission.**
