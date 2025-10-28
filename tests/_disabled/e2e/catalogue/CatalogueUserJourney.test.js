import { test, expect } from '@playwright/test';

test.describe('Catalogue User Journey', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      localStorage.setItem(
        'user',
        JSON.stringify({
          id: 'user1',
          role: 'user',
          name: 'Test User'
        })
      );
    });

    // Mock subjects data
    await page.addInitScript(() => {
      localStorage.setItem(
        'learnModeSubjects',
        JSON.stringify([
          {
            id: 'subject1',
            name: 'Spanish B2 Conversation',
            description: 'Advanced Spanish conversation practice for B2 level students',
            shortDescription: 'Advanced Spanish conversation practice',
            language: 'Spanish',
            level: 'B2',
            skills: ['speaking', 'listening', 'conversation'],
            creatorId: 'user1',
            creatorRole: 'user',
            status: 'active',
            agents: [
              {
                id: 'agent1',
                name: 'Conversation Partner',
                description: 'Native Spanish speaker for conversation practice'
              }
            ],
            materials: [],
            practice: {
              summary: 'Practice Spanish conversation',
              instructions: 'Engage in natural conversation',
              minWords: 100
            },
            exam: {
              summary: 'Spanish conversation assessment',
              instructions: 'Demonstrate conversation skills',
              minWords: 200
            }
          }
        ])
      );
    });
  });

  test('user can browse catalogue and view subjects', async ({ page }) => {
    await page.goto('/catalogue');

    // Check page title and header
    await expect(page.getByText('Subject Catalogue')).toBeVisible();
    await expect(page.getByText('Subject Catalog')).toBeVisible();

    // Check subject tile is displayed
    await expect(page.getByText('Spanish B2 Conversation')).toBeVisible();
    await expect(page.getByText('Advanced Spanish conversation practice')).toBeVisible();
    await expect(page.getByText('Spanish · B2')).toBeVisible();

    // Check skills are displayed
    await expect(page.getByText('speaking')).toBeVisible();
    await expect(page.getByText('listening')).toBeVisible();
    await expect(page.getByText('conversation')).toBeVisible();

    // Check Join button is present
    await expect(page.getByText('Join')).toBeVisible();
  });

  test('user can search and filter subjects', async ({ page }) => {
    await page.goto('/catalogue');

    // Test search functionality
    await page.fill('input[placeholder="Search subjects..."]', 'French');
    await expect(page.getByText('Spanish B2 Conversation')).not.toBeVisible();

    // Clear search
    await page.fill('input[placeholder="Search subjects..."]', '');
    await expect(page.getByText('Spanish B2 Conversation')).toBeVisible();

    // Test language filter
    await page.selectOption('select[id="language-filter"]', 'French');
    await expect(page.getByText('Spanish B2 Conversation')).not.toBeVisible();

    // Reset filter
    await page.selectOption('select[id="language-filter"]', 'all');
    await expect(page.getByText('Spanish B2 Conversation')).toBeVisible();
  });

  test('subject creator can see and use edit icon', async ({ page }) => {
    await page.goto('/catalogue');

    // Edit icon should be visible for creator
    const editButton = page.getByTitle('Edit subject');
    await expect(editButton).toBeVisible();

    // Click edit button should navigate to edit page
    await editButton.click();
    await expect(page).toHaveURL('/catalogue/edit?id=subject1');
  });

  test('user can create new subject', async ({ page }) => {
    await page.goto('/catalogue');

    // Click create subject button
    await page.getByText('Create Subject').click();
    await expect(page).toHaveURL('/catalogue/edit?new=true');

    // Check create form is displayed
    await expect(page.getByText('Create New Subject')).toBeVisible();
    await expect(page.getByText('Create a new learning subject')).toBeVisible();
  });

  test('user can join a subject and start learning', async ({ page }) => {
    await page.goto('/catalogue');

    // Click join button
    await page.getByText('Join').click();

    // Should show subject details and chat interface
    await expect(page.getByText('Spanish B2 Conversation')).toBeVisible();
    await expect(page.getByText('Practice Spanish conversation')).toBeVisible();

    // Chat interface should be visible
    await expect(page.locator('.rounded-2xl.shadow-sm.border')).toBeVisible();
  });

  test('user can report inappropriate content', async ({ page }) => {
    await page.goto('/catalogue');

    // Click report button
    await page.getByTitle('Report inappropriate content').click();

    // Report modal should open
    await expect(page.getByText('Report Subject')).toBeVisible();
    await expect(page.getByText('You are reporting: Spanish B2 Conversation')).toBeVisible();

    // Select reason and submit
    await page.selectOption('select[id="report-reason-selection"]', 'spam');
    await page.getByText('Submit Report').click();

    // Modal should close
    await expect(page.getByText('Report Subject')).not.toBeVisible();
  });

  test('navigation header shows catalogue link', async ({ page }) => {
    await page.goto('/');

    // Check catalogue link in navigation
    await expect(page.getByText('Catalogue')).toBeVisible();

    // Click catalogue link
    await page.getByText('Catalogue').click();
    await expect(page).toHaveURL('/catalogue');
  });

  test('my subjects dropdown shows enrolled subjects', async ({ page }) => {
    // Mock enrollment data
    await page.addInitScript(() => {
      localStorage.setItem(
        'userEnrollments',
        JSON.stringify([
          [
            'user1-subject1',
            {
              userId: 'user1',
              subjectId: 'subject1',
              status: 'active',
              enrolledAt: new Date().toISOString(),
              progress: {
                lessonsCompleted: 3,
                assessmentsTaken: 1,
                lastActivity: new Date().toISOString()
              }
            }
          ]
        ])
      );
    });

    await page.goto('/catalogue');

    // My Subjects dropdown should be visible
    await expect(page.getByText('My Subjects')).toBeVisible();

    // Click to open dropdown
    await page.getByText('My Subjects').click();

    // Should show enrolled subject
    await expect(page.getByText('Spanish B2 Conversation')).toBeVisible();
    await expect(page.getByText('3 lessons • 1 assessments')).toBeVisible();
  });

  test('old learn route redirects to catalogue', async ({ page }) => {
    await page.goto('/learn');

    // Should redirect to catalogue
    await expect(page).toHaveURL('/catalogue');
    await expect(page.getByText('Subject Catalogue')).toBeVisible();
  });

  test('admin subjects route is removed', async ({ page }) => {
    const response = await page.goto('/admin/subjects');

    // Should return 404 or redirect
    expect(response.status()).toBe(404);
  });
});
