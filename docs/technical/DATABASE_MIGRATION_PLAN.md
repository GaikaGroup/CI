# План миграции данных в базу данных

## Текущее состояние

### Данные в localStorage:
- ✅ **Курсы/предметы**: `learnModeCourses`, `learnModeSubjects`
- ✅ **Подписки**: `userEnrollments`, `courseEnrollments`, `subjectEnrollments`
- ✅ **Админ данные**: `adminSubjects`, `adminCourses`, `moderationQueue`, `moderationData`
- ✅ **Настройки**: `theme`, `language`
- ✅ **Аутентификация**: пользовательские данные
- ✅ **Логи**: `errorLog`
- ✅ **Админ настройки**: `adminDashboardData`

### Данные в sessionStorage:
- ✅ **OCR результаты**: временные результаты распознавания
- ✅ **Сессионные данные**: временные данные сессий

### Данные в БД (PostgreSQL):
- ✅ **User**: пользователи
- ✅ **Session**: сессии чата
- ✅ **Message**: сообщения

## Этап 1: Расширение схемы базы данных

### 1.1 Добавить модели для курсов/предметов
```prisma
model Course {
  id              String   @id @default(cuid())
  name            String   @db.VarChar(255)
  description     String?  @db.Text
  language        String   @db.VarChar(10)
  level           String   @db.VarChar(50)
  skills          Json?    // Array of skills
  settings        Json?    // Course settings
  practice        Json?    // Practice mode settings
  exam            Json?    // Exam mode settings
  agents          Json?    // Course agents
  orchestrationAgent Json? // Orchestration agent
  materials       Json?    // Course materials
  llmSettings     Json?    // LLM settings
  creatorId       String   @map("creator_id")
  creatorRole     String   @default("admin") @db.VarChar(20)
  status          String   @default("active") @db.VarChar(20)
  isActive        Boolean  @default(true) @map("is_active")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  
  // Relations
  creator         User     @relation("CourseCreator", fields: [creatorId], references: [id])
  enrollments     Enrollment[]
  sessions        Session[]
  reports         CourseReport[]
  
  @@index([creatorId])
  @@index([status])
  @@index([language])
  @@map("courses")
}
```

### 1.2 Добавить модель подписок
```prisma
model Enrollment {
  id              String   @id @default(cuid())
  userId          String   @map("user_id")
  courseId        String   @map("course_id")
  status          String   @default("active") @db.VarChar(20) // active, completed, dropped
  progress        Json?    // Progress tracking
  enrolledAt      DateTime @default(now()) @map("enrolled_at")
  completedAt     DateTime? @map("completed_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  
  // Relations
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  course          Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  
  @@unique([userId, courseId])
  @@index([userId])
  @@index([courseId])
  @@index([status])
  @@map("enrollments")
}
```

### 1.3 Добавить модель настроек пользователя
```prisma
model UserPreference {
  id              String   @id @default(cuid())
  userId          String   @map("user_id")
  key             String   @db.VarChar(100)
  value           Json
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  
  // Relations
  user            User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@unique([userId, key])
  @@index([userId])
  @@map("user_preferences")
}
```

### 1.4 Добавить модель отчетов/модерации
```prisma
model CourseReport {
  id              String   @id @default(cuid())
  courseId        String   @map("course_id")
  reporterId      String   @map("reporter_id")
  reason          String   @db.VarChar(255)
  description     String?  @db.Text
  status          String   @default("pending") @db.VarChar(20) // pending, reviewed, resolved, dismissed
  priority        String   @default("medium") @db.VarChar(20) // low, medium, high, critical
  metadata        Json?    // Additional report data
  reviewedBy      String?  @map("reviewed_by")
  reviewedAt      DateTime? @map("reviewed_at")
  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")
  
  // Relations
  course          Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  reporter        User     @relation("CourseReporter", fields: [reporterId], references: [id])
  reviewer        User?    @relation("CourseReviewer", fields: [reviewedBy], references: [id])
  
  @@index([courseId])
  @@index([reporterId])
  @@index([status])
  @@index([createdAt])
  @@map("course_reports")
}
```

### 1.5 Добавить модель системных логов
```prisma
model SystemLog {
  id              String   @id @default(cuid())
  userId          String?  @map("user_id")
  level           String   @db.VarChar(20) // error, warn, info, debug
  category        String   @db.VarChar(50) // auth, course, enrollment, etc.
  message         String   @db.Text
  metadata        Json?    // Additional log data
  createdAt       DateTime @default(now()) @map("created_at")
  
  // Relations
  user            User?    @relation(fields: [userId], references: [id], onDelete: SetNull)
  
  @@index([userId])
  @@index([level])
  @@index([category])
  @@index([createdAt])
  @@map("system_logs")
}
```

### 1.6 Обновить модель User
```prisma
model User {
  // ... existing fields ...
  
  // New relations
  createdCourses  Course[] @relation("CourseCreator")
  enrollments     Enrollment[]
  preferences     UserPreference[]
  reportedCourses CourseReport[] @relation("CourseReporter")
  reviewedReports CourseReport[] @relation("CourseReviewer")
  systemLogs      SystemLog[]
}
```

## Этап 2: Создание сервисов для работы с БД

### 2.1 CourseService - управление курсами
- Создание, обновление, удаление курсов
- Поиск и фильтрация курсов
- Управление статусами курсов

### 2.2 EnrollmentService - управление подписками
- Подписка/отписка от курсов
- Отслеживание прогресса
- Статистика подписок

### 2.3 UserPreferenceService - настройки пользователя
- Сохранение/загрузка настроек
- Синхронизация с localStorage

### 2.4 ModerationService - модерация контента
- Создание отчетов
- Обработка жалоб
- Административные действия

### 2.5 SystemLogService - системные логи
- Логирование ошибок
- Аудит действий пользователей
- Мониторинг системы

## Этап 3: Миграция данных

### 3.1 Скрипт миграции localStorage → БД
```javascript
// migrate-localStorage-to-db.js
async function migrateLocalStorageData() {
  // 1. Миграция курсов
  // 2. Миграция подписок
  // 3. Миграция настроек
  // 4. Миграция админ данных
  // 5. Миграция логов
}
```

### 3.2 Обновление существующих компонентов
- Замена localStorage на API вызовы
- Обновление stores для работы с БД
- Добавление кэширования для производительности

## Этап 4: Постепенный переход

### 4.1 Гибридный режим
- Чтение из БД с fallback на localStorage
- Постепенная миграция пользователей
- Синхронизация данных

### 4.2 Полный переход
- Отключение localStorage
- Удаление старых скриптов очистки
- Финальная очистка кода

## Этап 5: Оптимизация и мониторинг

### 5.1 Производительность
- Индексы БД
- Кэширование запросов
- Пагинация данных

### 5.2 Мониторинг
- Логирование операций БД
- Метрики производительности
- Алерты на ошибки

## Приоритеты реализации

1. **Высокий приоритет**:
   - Курсы/предметы (основная функциональность)
   - Подписки пользователей (критично для UX)
   - Настройки пользователя (theme, language)

2. **Средний приоритет**:
   - Модерация и отчеты
   - Административные данные
   - Системные логи

3. **Низкий приоритет**:
   - OCR результаты (можно оставить в sessionStorage)
   - Временные данные сессий

## Ожидаемые преимущества

- ✅ Персистентность данных между сессиями
- ✅ Синхронизация между устройствами
- ✅ Централизованное управление данными
- ✅ Лучшая производительность при больших объемах
- ✅ Возможность аналитики и отчетности
- ✅ Резервное копирование данных
- ✅ Масштабируемость системы