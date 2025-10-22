# Quick Start Guide

## Initial Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Setup Database

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# Create test users
npm run create-test-users
```

### 3. Start Development Server

```bash
npm run dev
```

## Test Users

After running `npm run create-test-users`, you can login with:

- **Admin User**
  - Email: `AdminLogin`
  - Password: `AdminPswd`
  - Type: admin

- **Regular User**
  - Email: `UserLogin`
  - Password: `UserPswd`
  - Type: regular

## Common Commands

### Database

```bash
# Generate Prisma client (after schema changes)
npm run db:generate

# Create and apply migrations
npm run db:migrate

# Open Prisma Studio (database GUI)
npm run db:studio

# Backup database
npm run db:backup

# Reset database (WARNING: deletes all data)
npm run db:reset
```

### Testing

```bash
# Run all tests
npm run test:run

# Run tests with coverage
npm run test:coverage

# Run integration tests
npm run test:integration

# Run E2E tests
npm run test:e2e

# Run tests in watch mode
npm test
```

### Development

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Check code
npm run check

# Lint code
npm run lint

# Format code
npm run format
```

### Session Management

```bash
# Clear all sessions
npm run clear-sessions

# Check session count
npm run check-sessions

# Create test users
npm run create-test-users
```

## Troubleshooting

### "Failed to create new session"

**Cause**: Users don't exist in database

**Solution**:

```bash
npm run create-test-users
```

### "Database not ready" or "Prisma client not generated"

**Cause**: Prisma client needs to be generated

**Solution**:

```bash
npm run db:generate
```

### "Connection refused" or database errors

**Cause**: PostgreSQL is not running

**Solution**:

1. Start PostgreSQL service
2. Check DATABASE_URL in `.env`
3. Verify database exists

### Authentication issues

**Cause**: Mismatched user data between cookies and database

**Solution**:

1. Clear browser cookies/localStorage
2. Run `npm run create-test-users`
3. Login again

## Project Structure

```
├── src/
│   ├── lib/
│   │   ├── modules/          # Feature modules
│   │   │   ├── auth/         # Authentication
│   │   │   ├── chat/         # Chat system
│   │   │   ├── courses/      # Course management
│   │   │   └── session/      # Session management
│   │   ├── database/         # Database utilities
│   │   ├── stores/           # Svelte stores
│   │   └── components/       # Shared components
│   ├── routes/               # SvelteKit routes
│   │   ├── api/              # API endpoints
│   │   └── (pages)/          # Page routes
│   └── generated/            # Generated files (Prisma)
├── prisma/
│   └── schema.prisma         # Database schema
├── scripts/                  # Utility scripts
├── tests/                    # Test files
└── docs/                     # Documentation
```

## Environment Variables

Create a `.env` file in the root directory:

```env
# Database
DATABASE_URL="postgresql://user:password@localhost:5432/ai_tutor_sessions"

# JWT Secret (generate a random string)
JWT_SECRET="your-secret-key-here"

# OpenAI API (optional)
OPENAI_API_KEY="your-openai-key"

# Ollama (optional, for local LLM)
OLLAMA_BASE_URL="http://localhost:11434"
```

## Next Steps

1. **Login** with test credentials
2. **Explore** the sessions page at `/sessions`
3. **Create** a new chat session
4. **Browse** courses at `/catalogue`
5. **Check** admin panel at `/admin` (admin user only)

## Getting Help

- Check `docs/` folder for detailed documentation
- Review `docs/fixes/` for known issues and solutions
- Check the README.md for project overview
