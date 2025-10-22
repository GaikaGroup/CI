# CI/CD Requirements - Непрерывная интеграция и развертывание

## Обязательные этапы CI/CD Pipeline

### 1. Continuous Integration (CI)

**Запускается на каждый push и pull request**

#### Этап: Code Quality

```yaml
- Lint (ESLint)
- Format check (Prettier)
- Type checking (если используется TypeScript)
```

#### Этап: Testing

```yaml
- Unit tests
- Integration tests
- E2E tests
- Coverage report (минимум 80%)
```

#### Этап: Build

```yaml
- Build production bundle
- Check build size
- Verify no build errors
```

#### Этап: Security

```yaml
- Dependency audit (npm audit)
- Security vulnerabilities scan
- Check for exposed secrets
```

### 2. Continuous Deployment (CD)

**Запускается после успешного CI**

#### Staging Environment

- Автоматический деплой на staging при merge в `develop`
- Smoke tests после деплоя
- Уведомление команды

#### Production Environment

- Автоматический деплой на production при merge в `main`
- Database migrations (с подтверждением)
- Health checks после деплоя
- Rollback plan готов

## GitHub Actions Configuration

### Структура workflows

```
.github/
└── workflows/
    ├── ci.yml              # Основной CI pipeline
    ├── deploy-staging.yml  # Деплой на staging
    ├── deploy-prod.yml     # Деплой на production
    └── security.yml        # Security checks
```

### Основной CI Pipeline (.github/workflows/ci.yml)

```yaml
name: CI Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  quality:
    name: Code Quality
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint

      - name: Check formatting
        run: npm run format -- --check

  test:
    name: Tests
    runs-on: ubuntu-latest
    needs: quality

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: test_db
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Setup test database
        run: |
          npm run db:migrate
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db

      - name: Run unit tests
        run: npm run test:run tests/unit

      - name: Run integration tests
        run: npm run test:run tests/integration
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db

      - name: Run E2E tests
        run: npm run test:e2e
        env:
          DATABASE_URL: postgresql://postgres:postgres@localhost:5432/test_db

      - name: Generate coverage report
        run: npm run test:coverage

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
          fail_ci_if_error: true

      - name: Check coverage threshold
        run: |
          COVERAGE=$(cat coverage/coverage-summary.json | jq '.total.lines.pct')
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "Coverage $COVERAGE% is below 80% threshold"
            exit 1
          fi

  build:
    name: Build
    runs-on: ubuntu-latest
    needs: test
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build

      - name: Check build size
        run: |
          SIZE=$(du -sh build | cut -f1)
          echo "Build size: $SIZE"

      - name: Upload build artifacts
        uses: actions/upload-artifact@v3
        with:
          name: build
          path: build/
          retention-days: 7

  security:
    name: Security Audit
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'

      - name: Run npm audit
        run: npm audit --audit-level=moderate

      - name: Check for secrets
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          head: HEAD
```

### Staging Deployment (.github/workflows/deploy-staging.yml)

```yaml
name: Deploy to Staging

on:
  push:
    branches: [develop]
  workflow_dispatch:

jobs:
  deploy:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    environment: staging

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build
        env:
          NODE_ENV: production
          PUBLIC_API_URL: ${{ secrets.STAGING_API_URL }}

      - name: Run database migrations
        run: npm run db:migrate
        env:
          DATABASE_URL: ${{ secrets.STAGING_DATABASE_URL }}

      - name: Deploy to staging server
        run: |
          # Ваш скрипт деплоя (например, rsync, scp, или API вашего хостинга)
          echo "Deploying to staging..."
        env:
          DEPLOY_KEY: ${{ secrets.STAGING_DEPLOY_KEY }}

      - name: Run smoke tests
        run: npm run test:smoke
        env:
          TEST_URL: ${{ secrets.STAGING_URL }}

      - name: Notify team
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Staging deployment ${{ job.status }}'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}
```

### Production Deployment (.github/workflows/deploy-prod.yml)

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]
  workflow_dispatch:

jobs:
  deploy:
    name: Deploy to Production
    runs-on: ubuntu-latest
    environment: production

    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build application
        run: npm run build
        env:
          NODE_ENV: production
          PUBLIC_API_URL: ${{ secrets.PROD_API_URL }}

      - name: Backup database
        run: |
          echo "Creating database backup..."
          # Ваш скрипт бэкапа
        env:
          DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}

      - name: Run database migrations
        run: npm run db:migrate
        env:
          DATABASE_URL: ${{ secrets.PROD_DATABASE_URL }}

      - name: Deploy to production
        run: |
          # Ваш скрипт деплоя
          echo "Deploying to production..."
        env:
          DEPLOY_KEY: ${{ secrets.PROD_DEPLOY_KEY }}

      - name: Health check
        run: |
          sleep 10
          curl -f ${{ secrets.PROD_URL }}/health || exit 1

      - name: Notify team
        if: always()
        uses: 8398a7/action-slack@v3
        with:
          status: ${{ job.status }}
          text: 'Production deployment ${{ job.status }}'
          webhook_url: ${{ secrets.SLACK_WEBHOOK }}

      - name: Create release tag
        if: success()
        run: |
          git tag -a "v$(date +%Y%m%d-%H%M%S)" -m "Production release"
          git push origin --tags
```

## GitLab CI Configuration (альтернатива)

### .gitlab-ci.yml

```yaml
stages:
  - quality
  - test
  - build
  - deploy

variables:
  NODE_VERSION: '20'
  POSTGRES_DB: test_db
  POSTGRES_USER: postgres
  POSTGRES_PASSWORD: postgres

# Кэширование зависимостей
cache:
  key: ${CI_COMMIT_REF_SLUG}
  paths:
    - node_modules/
    - .npm/

# Шаблон для Node.js jobs
.node_template: &node_template
  image: node:${NODE_VERSION}
  before_script:
    - npm ci --cache .npm --prefer-offline

# Code Quality
lint:
  <<: *node_template
  stage: quality
  script:
    - npm run lint
    - npm run format -- --check

# Testing
test:unit:
  <<: *node_template
  stage: test
  script:
    - npm run test:run tests/unit
  coverage: '/Lines\s*:\s*(\d+\.\d+)%/'
  artifacts:
    reports:
      coverage_report:
        coverage_format: cobertura
        path: coverage/cobertura-coverage.xml

test:integration:
  <<: *node_template
  stage: test
  services:
    - postgres:15
  variables:
    DATABASE_URL: postgresql://postgres:postgres@postgres:5432/test_db
  script:
    - npm run db:migrate
    - npm run test:run tests/integration

test:e2e:
  <<: *node_template
  stage: test
  services:
    - postgres:15
  variables:
    DATABASE_URL: postgresql://postgres:postgres@postgres:5432/test_db
  script:
    - npm run db:migrate
    - npm run test:e2e

# Build
build:
  <<: *node_template
  stage: build
  script:
    - npm run build
  artifacts:
    paths:
      - build/
    expire_in: 1 week

# Security
security:
  <<: *node_template
  stage: quality
  script:
    - npm audit --audit-level=moderate
  allow_failure: true

# Deploy to Staging
deploy:staging:
  stage: deploy
  environment:
    name: staging
    url: https://staging.example.com
  only:
    - develop
  script:
    - echo "Deploying to staging..."
    - npm run db:migrate
    # Ваш скрипт деплоя

# Deploy to Production
deploy:production:
  stage: deploy
  environment:
    name: production
    url: https://example.com
  only:
    - main
  when: manual
  script:
    - echo "Creating backup..."
    - echo "Deploying to production..."
    - npm run db:migrate
    # Ваш скрипт деплоя
```

## Environment Variables (Secrets)

### Обязательные переменные окружения:

#### Staging

```
STAGING_DATABASE_URL
STAGING_API_URL
STAGING_DEPLOY_KEY
STAGING_URL
OPENAI_API_KEY (staging)
```

#### Production

```
PROD_DATABASE_URL
PROD_API_URL
PROD_DEPLOY_KEY
PROD_URL
OPENAI_API_KEY (production)
```

#### Общие

```
SLACK_WEBHOOK (для уведомлений)
CODECOV_TOKEN (для coverage reports)
```

## Branch Strategy

### Основные ветки:

- `main` - production код, всегда стабильный
- `develop` - staging код, интеграция фич
- `feature/*` - новые фичи
- `bugfix/*` - исправления багов
- `hotfix/*` - срочные исправления для production

### Workflow:

1. Создаём feature branch из `develop`
2. Разрабатываем, коммитим, пушим
3. Создаём Pull Request в `develop`
4. CI проверяет код (lint, tests, build)
5. Code review
6. Merge в `develop` → автодеплой на staging
7. Тестирование на staging
8. Pull Request из `develop` в `main`
9. Merge в `main` → автодеплой на production

## Pre-commit Hooks (Husky)

### Установка Husky

```bash
npm install --save-dev husky
npx husky init
```

### .husky/pre-commit

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🔍 Running pre-commit checks..."

# Lint
echo "📝 Checking code style..."
npm run lint || exit 1

# Format
echo "✨ Checking formatting..."
npm run format -- --check || exit 1

# Tests
echo "🧪 Running tests..."
npm run test:run || exit 1

echo "✅ All checks passed!"
```

### .husky/pre-push

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

echo "🚀 Running pre-push checks..."

# Full test suite
echo "🧪 Running full test suite..."
npm run test:run || exit 1

# Coverage check
echo "📊 Checking coverage..."
npm run test:coverage || exit 1

# Build check
echo "🏗️ Checking build..."
npm run build || exit 1

echo "✅ Ready to push!"
```

### .husky/commit-msg

```bash
#!/usr/bin/env sh
. "$(dirname -- "$0")/_/husky.sh"

# Проверка формата commit message
# Формат: type(scope): message
# Пример: feat(chat): add voice recognition

npx --no -- commitlint --edit ${1}
```

## Commit Message Convention

### Формат:

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types:

- `feat`: Новая фича
- `fix`: Исправление бага
- `docs`: Изменения в документации
- `style`: Форматирование, отсутствующие точки с запятой и т.д.
- `refactor`: Рефакторинг кода
- `test`: Добавление тестов
- `chore`: Обновление зависимостей, конфигурации и т.д.

### Примеры:

```
feat(chat): add multilingual support for waiting phrases

- Added translation service
- Implemented language detection
- Updated UI components

Closes #123
```

```
fix(auth): resolve session timeout issue

Users were being logged out prematurely due to incorrect
token expiration calculation.

Fixes #456
```

## Monitoring и Alerts

### Health Checks

Каждое приложение должно иметь `/health` endpoint:

```javascript
// src/routes/health/+server.js
export async function GET() {
  const checks = {
    database: await checkDatabase(),
    redis: await checkRedis(),
    openai: await checkOpenAI()
  };

  const healthy = Object.values(checks).every((c) => c.status === 'ok');

  return new Response(
    JSON.stringify({
      status: healthy ? 'healthy' : 'unhealthy',
      checks,
      timestamp: new Date().toISOString()
    }),
    {
      status: healthy ? 200 : 503
    }
  );
}
```

### Уведомления

- Slack/Discord для деплоев
- Email для критических ошибок
- Sentry для мониторинга ошибок в production

## Rollback Strategy

### Автоматический rollback:

```yaml
- name: Health check
  run: |
    sleep 10
    if ! curl -f ${{ secrets.PROD_URL }}/health; then
      echo "Health check failed, rolling back..."
      # Rollback команды
      exit 1
    fi
```

### Ручной rollback:

```bash
# Откатиться на предыдущий коммит
git revert HEAD
git push origin main

# Или использовать предыдущий tag
git checkout v20240101-120000
# Деплой
```

## Database Migrations

### Безопасные миграции:

1. Всегда создавайте бэкап перед миграцией
2. Тестируйте миграции на staging
3. Миграции должны быть обратимыми
4. Используйте транзакции

### Пример безопасной миграции:

```javascript
// migrations/add_user_preferences.js
export async function up(prisma) {
  // Добавляем nullable колонку
  await prisma.$executeRaw`
    ALTER TABLE users 
    ADD COLUMN preferences JSONB
  `;

  // Заполняем дефолтными значениями
  await prisma.$executeRaw`
    UPDATE users 
    SET preferences = '{}'::jsonb 
    WHERE preferences IS NULL
  `;

  // Делаем NOT NULL
  await prisma.$executeRaw`
    ALTER TABLE users 
    ALTER COLUMN preferences SET NOT NULL
  `;
}

export async function down(prisma) {
  await prisma.$executeRaw`
    ALTER TABLE users 
    DROP COLUMN preferences
  `;
}
```

## Checklist для настройки CI/CD

- [ ] Создать GitHub Actions workflows (или GitLab CI)
- [ ] Настроить secrets в GitHub/GitLab
- [ ] Установить Husky для pre-commit hooks
- [ ] Настроить branch protection rules
- [ ] Создать staging и production environments
- [ ] Настроить мониторинг и alerts
- [ ] Документировать процесс деплоя
- [ ] Протестировать rollback процедуру
- [ ] Настроить автоматические бэкапы БД
- [ ] Добавить health check endpoints

## Полезные ссылки

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [GitLab CI Documentation](https://docs.gitlab.com/ee/ci/)
- [Husky Documentation](https://typicode.github.io/husky/)
- [Conventional Commits](https://www.conventionalcommits.org/)
