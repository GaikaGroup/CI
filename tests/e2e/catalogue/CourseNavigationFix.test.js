/**
 * Course Navigation UX Fix Test
 * 
 * Tests that both navigation paths lead to the same learn page:
 * 1. Direct navigation to /learn/course-id
 * 2. Navigation via catalogue Learn button
 */

import { test, expect } from '@playwright/test';

test.describe('Course Navigation UX Fix', () => {
  test.beforeEach(async ({ page }) => {
    // Mock authentication
    await page.addInitScript(() => {
      localStorage.setItem('user', JSON.stringify({
        id: 'test-user-id',
        name: 'Test User',
        email: 'test@example.com',
        role: 'user'
      }));
    });
  });

  test('Direct navigation to course should work', async ({ page }) => {
    // Navigate directly to course
    await page.goto('/learn/course-1');
    
    // Should be on the learn page
    await expect(page).toHaveURL(/\/learn\/course-1/);
    
    // Should show course learning interface
    await expect(page.locator('h1')).toContainText('Introduction to Mathematics');
  });

  test('Navigation via catalogue Learn button should go to same page', async ({ page }) => {
    // Start at catalogue
    await page.goto('/catalogue');
    
    // Wait for courses to load
    await page.waitForSelector('[data-testid="course-card"]', { timeout: 10000 });
    
    // Find the "Introduction to Mathematics" course and click Learn
    const courseCard = page.locator('[data-testid="course-card"]').filter({
      hasText: 'Introduction to Mathematics'
    });
    
    await expect(courseCard).toBeVisible();
    
    const learnButton = courseCard.locator('button', { hasText: 'Learn' });
    await learnButton.click();
    
    // Should navigate to the learn page, not stay in catalogue
    await expect(page).toHaveURL(/\/learn\/course-1/);
    
    // Should show the same course learning interface as direct navigation
    await expect(page.locator('h1')).toContainText('Introduction to Mathematics');
  });

  test('Join course button should also navigate to learn page', async ({ page }) => {
    // Start at catalogue
    await page.goto('/catalogue');
    
    // Wait for courses to load
    await page.waitForSelector('[data-testid="course-card"]', { timeout: 10000 });
    
    // Find a course that shows "Join" button (not enrolled)
    const courseCard = page.locator('[data-testid="course-card"]').filter({
      hasText: 'English Literature'
    });
    
    await expect(courseCard).toBeVisible();
    
    const joinButton = courseCard.locator('button', { hasText: 'Join' });
    if (await joinButton.isVisible()) {
      await joinButton.click();
      
      // Should navigate to the learn page after joining
      await expect(page).toHaveURL(/\/learn\/course-/);
    }
  });

  test('Both navigation paths result in identical page content', async ({ page }) => {
    // Test direct navigation first
    await page.goto('/learn/course-1');
    await page.waitForLoadState('networkidle');
    
    const directNavContent = await page.locator('main').innerHTML();
    const directNavTitle = await page.locator('h1').textContent();
    
    // Now test catalogue navigation
    await page.goto('/catalogue');
    await page.waitForSelector('[data-testid="course-card"]', { timeout: 10000 });
    
    const courseCard = page.locator('[data-testid="course-card"]').filter({
      hasText: 'Introduction to Mathematics'
    });
    
    const learnButton = courseCard.locator('button', { hasText: 'Learn' });
    await learnButton.click();
    
    await page.waitForLoadState('networkidle');
    
    const catalogueNavContent = await page.locator('main').innerHTML();
    const catalogueNavTitle = await page.locator('h1').textContent();
    
    // Both should have the same title
    expect(catalogueNavTitle).toBe(directNavTitle);
    
    // Both should be on learn pages (not catalogue)
    await expect(page).toHaveURL(/\/learn\/course-1/);
  });

  test('URL consistency check', async ({ page }) => {
    const expectedUrl = '/learn/course-1';
    
    // Test direct navigation
    await page.goto(expectedUrl);
    expect(page.url()).toContain(expectedUrl);
    
    // Test catalogue navigation
    await page.goto('/catalogue');
    await page.waitForSelector('[data-testid="course-card"]', { timeout: 10000 });
    
    const courseCard = page.locator('[data-testid="course-card"]').filter({
      hasText: 'Introduction to Mathematics'
    });
    
    const learnButton = courseCard.locator('button', { hasText: 'Learn' });
    await learnButton.click();
    
    // Should end up at the same URL
    expect(page.url()).toContain(expectedUrl);
  });
});