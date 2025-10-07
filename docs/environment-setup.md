# Environment Configuration Guide

This guide explains how to set up environment variables for the AI Tutor Sessions feature across different deployment environments.

## Environment Files

The project includes several environment configuration files:

- `.env.example` - Template with all available variables and descriptions
- `.env.development` - Development-specific settings
- `.env.staging` - Staging environment settings
- `.env.production` - Production environment settings

## Quick Setup

### Development Environment

1. Copy the development template:

   ```bash
   cp .env.development .env
   ```

2. Update database credentials if needed:
   ```bash
   # Edit .env file
   DATABASE_URL=postgresql://your_user:your_password@localhost:5432/ai_tutor_sessions_dev
   ```

### Production Environment

1. Copy the production template:

   ```bash
   cp .env.production .env
   ```

2. **IMPORTANT**: Change all security-related secrets:
   ```bash
   # Generate secure secrets
   SESSION_SECRET=$(openssl rand -base64 32)
   JWT_SECRET=$(openssl rand -base64 32)
   DATABASE_PASSWORD=$(openssl rand -base64 16)
   ```

## Configuration Categories

### Database Configuration

| Variable            | Description                       | Default                                         |
| ------------------- | --------------------------------- | ----------------------------------------------- |
| `DATABASE_URL`      | Full PostgreSQL connection string | `postgresql://localhost:5432/ai_tutor_sessions` |
| `DATABASE_HOST`     | Database host                     | `localhost`                                     |
| `DATABASE_PORT`     | Database port                     | `5432`                                          |
| `DATABASE_NAME`     | Database name                     | `ai_tutor_sessions`                             |
| `DATABASE_USER`     | Database username                 | `postgres`                                      |
| `DATABASE_PASSWORD` | Database password                 | _(empty)_                                       |
| `DATABASE_SSL`      | Enable SSL connection             | `false`                                         |
| `DATABASE_POOL_MIN` | Minimum connection pool size      | `2`                                             |
| `DATABASE_POOL_MAX` | Maximum connection pool size      | `10`                                            |
| `DATABASE_TIMEOUT`  | Connection timeout (ms)           | `30000`                                         |

### Session Configuration

| Variable                     | Description                        | Default                       |
| ---------------------------- | ---------------------------------- | ----------------------------- |
| `SESSION_SECRET`             | Secret key for session encryption  | _(must change in production)_ |
| `SESSION_TIMEOUT`            | Session timeout in milliseconds    | `86400000` (24 hours)         |
| `SESSION_MAX_MESSAGES`       | Maximum messages per session       | `1000`                        |
| `SESSION_CLEANUP_INTERVAL`   | Cleanup interval in milliseconds   | `3600000` (1 hour)            |
| `SESSION_ARCHIVE_AFTER_DAYS` | Days before archiving old sessions | `90`                          |

### Security Configuration

| Variable                    | Description                      | Default                       |
| --------------------------- | -------------------------------- | ----------------------------- |
| `JWT_SECRET`                | Secret key for JWT tokens        | _(must change in production)_ |
| `JWT_EXPIRES_IN`            | JWT token expiration             | `24h`                         |
| `BCRYPT_ROUNDS`             | BCrypt hashing rounds            | `12`                          |
| `RATE_LIMIT_WINDOW`         | Rate limiting window (ms)        | `900000` (15 minutes)         |
| `RATE_LIMIT_MAX_REQUESTS`   | Max requests per window          | `100`                         |
| `RATE_LIMIT_SESSION_CREATE` | Max session creations per window | `10`                          |
| `RATE_LIMIT_MESSAGE_SEND`   | Max messages per window          | `60`                          |

### CORS and API Configuration

| Variable                 | Description                 | Default                           |
| ------------------------ | --------------------------- | --------------------------------- |
| `CORS_ORIGIN`            | Allowed CORS origin         | `http://localhost:5173` (dev)     |
| `CORS_CREDENTIALS`       | Allow credentials in CORS   | `true`                            |
| `API_BASE_URL`           | Base URL for API calls      | `http://localhost:5173/api` (dev) |
| `API_TIMEOUT`            | API request timeout (ms)    | `30000`                           |
| `API_MAX_PAYLOAD_SIZE`   | Maximum payload size        | `10mb`                            |
| `API_ENABLE_COMPRESSION` | Enable response compression | `true` (production)               |

### Application Configuration

| Variable                 | Description            | Default                      |
| ------------------------ | ---------------------- | ---------------------------- |
| `NODE_ENV`               | Node.js environment    | `development`                |
| `PORT`                   | Server port            | `3000`                       |
| `HOST`                   | Server host            | `0.0.0.0`                    |
| `LOG_LEVEL`              | Logging level          | `debug` (dev), `info` (prod) |
| `ENABLE_REQUEST_LOGGING` | Enable request logging | `true` (dev)                 |

## Environment-Specific Settings

### Development

- Lower security requirements
- Verbose logging
- Relaxed rate limits
- Debug features enabled

### Staging

- Production-like security
- Moderate logging
- Realistic rate limits
- Performance monitoring enabled

### Production

- Maximum security
- Minimal logging
- Strict rate limits
- All monitoring features enabled

## Security Best Practices

1. **Never commit `.env` files** - They contain sensitive information
2. **Use strong secrets** - Generate random secrets for production
3. **Rotate secrets regularly** - Change secrets periodically
4. **Use environment-specific databases** - Separate dev/staging/prod data
5. **Enable SSL in production** - Always use encrypted connections
6. **Monitor rate limits** - Adjust based on actual usage patterns

## Docker Configuration

When using Docker, you can:

1. **Use environment files**:

   ```bash
   docker run --env-file .env.production your-app
   ```

2. **Pass individual variables**:

   ```bash
   docker run -e DATABASE_URL=postgresql://... your-app
   ```

3. **Use Docker Compose**:
   ```yaml
   services:
     app:
       env_file:
         - .env.production
   ```

## Troubleshooting

### Common Issues

1. **Database connection fails**:
   - Check `DATABASE_URL` format
   - Verify database is running
   - Check network connectivity

2. **Session errors**:
   - Ensure `SESSION_SECRET` is set
   - Check session timeout settings

3. **CORS errors**:
   - Verify `CORS_ORIGIN` matches your domain
   - Check `CORS_CREDENTIALS` setting

4. **Rate limiting issues**:
   - Adjust rate limit values
   - Check if limits are too restrictive

### Validation

The application validates required environment variables on startup. Missing required variables will cause the application to fail with a clear error message.

## Configuration Usage in Code

```javascript
import { config } from '$lib/config/environment.js';

// Database configuration
const dbUrl = config.database.url;

// Session configuration
const sessionTimeout = config.session.timeout;

// Security configuration
const jwtSecret = config.security.jwtSecret;
```
