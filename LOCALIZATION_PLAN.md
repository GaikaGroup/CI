# План полной локализации / Complete Localization Plan

## 📋 Текущий статус

**Прогресс:** ~40% (5 из 15+ основных страниц частично локализованы)

## 🎯 Приоритеты и оценка времени

### 🔴 КРИТИЧЕСКИЙ ПРИОРИТЕТ (Пользовательские страницы)

#### 1. Завершить частичную локализацию (30-45 мин)
**Страницы:** Login, Signup, My Courses, Student Dashboard

**Что нужно добавить:**
- Login: features list (4 элемента), social buttons
- Signup: benefits section (4 элемента), social buttons  
- My Courses: badges ("Active", "Progress"), labels ("Lessons", "Assessments", "Enrolled on", "Last activity")
- Student: те же badges и labels

**Переводов:** ~20 новых ключей

**Файлы для изменения:**
- `src/routes/login/+page.svelte`
- `src/routes/signup/+page.svelte`
- `src/routes/my-courses/+page.svelte`
- `src/routes/student/+page.svelte`
- `src/lib/modules/i18n/translations.js`

---

#### 2. Home Page `/` (45-60 мин)
**Статус:** ❌ Не локализована

**Что нужно локализовать:**
- Hero section (заголовок, описание, CTA кнопки)
- Features section
- How it works section
- Testimonials (если есть)
- Footer

**Переводов:** ~30-40 ключей

**Файлы:**
- `src/routes/+page.svelte`

---

#### 3. Tutor Page `/tutor` (30-45 мин)
**Статус:** ❌ Не локализована

**Что нужно локализовать:**
- Page header
- Course management interface
- Student management
- Analytics dashboard

**Переводов:** ~25-30 ключей

**Файлы:**
- `src/routes/tutor/+page.svelte`

---

#### 4. Catalogue Page `/catalogue` (45-60 мин)
**Статус:** ❌ Не локализована

**Что нужно локализовать:**
- Page title
- Filters (visibility, language, level)
- Sort options
- Course cards (all text)
- Empty states
- Action buttons

**Переводов:** ~35-40 ключей

**Файлы:**
- `src/routes/catalogue/+page.svelte`
- Возможно компоненты курсов

---

#### 5. Learn Page `/learn` (60-90 мин)
**Статус:** ❌ Не локализована

**Что нужно локализовать:**
- Course selection interface
- Learning mode selector (Practice/Exam)
- Instructions and guidance
- Progress indicators
- Navigation codes
- Feedback messages

**Переводов:** ~50-60 ключей

**Файлы:**
- `src/routes/learn/+page.svelte`
- `src/routes/learn/[courseId]/+page.svelte`
- Компоненты learn mode

---

### 🟡 СРЕДНИЙ ПРИОРИТЕТ (Дополнительные функции)

#### 6. Stats Page `/stats` (45-60 мин)
**Статус:** ❌ Не локализована

**Что нужно локализовать:**
- Page title
- Time range selector (Last hour, Last 24 hours, etc.)
- Chart titles (User Activity, Popular Courses, etc.)
- Table headers (Provider, Cost, Messages, Avg/Msg)
- Section titles (Language Usage, Attention Economy, Platform Health)
- Loading/Empty states

**Переводов:** ~40-45 ключей

**Файлы:**
- `src/routes/stats/+page.svelte`

---

#### 7. Course Edit Form (30-45 мин)
**Статус:** ⚠️ Частично (только wrapper)

**Что нужно локализовать:**
- Form labels (Name, Description, Language, Level, etc.)
- Section titles (Basic Info, Content, Agents, Materials)
- Validation messages
- Save/Cancel buttons
- Success/Error messages

**Переводов:** ~30-35 ключей

**Файлы:**
- `src/lib/modules/courses/components/CourseEditMode.svelte`
- Связанные компоненты

---

### 🟢 НИЗКИЙ ПРИОРИТЕТ (Админ панель)

#### 8. Admin Dashboard `/admin` (30-45 мин)
**Что нужно локализовать:**
- Dashboard overview
- Statistics cards
- Quick actions
- Navigation menu

**Переводов:** ~25-30 ключей

---

#### 9. Admin Users `/admin/users` (30-45 мин)
**Что нужно локализовать:**
- User list table
- Filters and search
- User actions (Edit, Delete, Ban)
- User details modal

**Переводов:** ~30-35 ключей

---

#### 10. Admin Feedback `/admin/feedback` (20-30 мин)
**Что нужно локализовать:**
- Feedback list
- Filters (Rating, Status)
- Feedback details
- Actions (Resolve, Delete)

**Переводов:** ~20-25 ключей

---

#### 11. Admin Sessions `/admin/sessions` (20-30 мин)
**Что нужно локализовать:**
- Session list
- Filters
- Session details
- Actions

**Переводов:** ~20-25 ключей

---

#### 12. Admin Analytics `/admin/analytics` (30-45 мин)
**Что нужно локализовать:**
- Charts and graphs
- Metrics labels
- Time range selectors
- Export options

**Переводов:** ~25-30 ключей

---

#### 13. Admin Finance `/admin/finance` (30-45 мин)
**Что нужно локализовать:**
- Financial overview
- Cost breakdown
- Provider statistics
- Export options

**Переводов:** ~25-30 ключей

---

### ⚪ НЕ ЛОКАЛИЗОВАТЬ (Debug страницы)

- `/debug-*` - только для разработки
- `/test-*` - тестовые страницы
- `/clear-*` - утилиты
- `/reset-*` - утилиты

---

## 📊 Общая статистика

### По приоритетам:
- **Критический:** 5 страниц, ~4-5 часов, ~200 ключей
- **Средний:** 2 страницы, ~1.5-2 часа, ~75 ключей
- **Низкий:** 6 страниц, ~3-4 часа, ~170 ключей

### Итого:
- **Всего страниц:** 13
- **Общее время:** 8-11 часов
- **Всего ключей:** ~445 переводов × 3 языка = ~1335 строк

---

## 🚀 Рекомендуемый порядок выполнения

### Фаза 1: Быстрые победы (1-1.5 часа)
1. ✅ Завершить Login/Signup/My Courses/Student (30-45 мин)
2. Коммит и проверка

### Фаза 2: Основной функционал (3-4 часа)
3. Home Page (45-60 мин)
4. Catalogue Page (45-60 мин)
5. Tutor Page (30-45 мин)
6. Learn Page (60-90 мин)
7. Коммит и проверка

### Фаза 3: Дополнительные функции (1.5-2 часа)
8. Stats Page (45-60 мин)
9. Course Edit Form (30-45 мин)
10. Коммит и проверка

### Фаза 4: Админ панель (опционально, 3-4 часа)
11. Admin Dashboard
12. Admin Users
13. Admin Feedback
14. Admin Sessions
15. Admin Analytics
16. Admin Finance
17. Финальный коммит

---

## 💡 Решение

**Выберите один из вариантов:**

### Вариант A: Минимальный (1-1.5 часа)
- Завершить частичную локализацию (Login, Signup, My Courses, Student)
- **Результат:** Все пользовательские страницы аутентификации и курсов полностью локализованы

### Вариант B: Оптимальный (4-5 часов)
- Фаза 1 + Фаза 2
- **Результат:** Все критически важные пользовательские страницы полностью локализованы

### Вариант C: Полный (8-11 часов)
- Все фазы
- **Результат:** 100% локализация всего приложения

### Вариант D: Выборочный
- Вы указываете конкретные страницы из списка

---

## 📝 Что нужно от вас

**Укажите:**
1. Какой вариант выбираете? (A, B, C или D)
2. Если D - какие конкретно страницы?
3. Нужно ли локализовать админ панель?

**Я начну работу сразу после вашего ответа.**

---

**Дата создания:** 2024-10-24
**Статус:** Ожидание решения
