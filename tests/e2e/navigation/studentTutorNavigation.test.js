import { test, expect } from '@playwright/test';

test.describe('Student/Tutor Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the app and login as admin
    await page.goto('/');
    
    // Wait for language selector and select English
    await page.waitForSelector('[data-testid="language-selector"]', { timeout: 10000 });
    await page.click('button:has-text("English")');
    
    // Login as admin user
    await page.waitForSelector('button:has-text("Login")', { timeout: 5000 });
    await page.click('button:has-text("Login")');
    
    await page.fill('input[type="email"]', 'AdminLogin');
    await page.fill('input[type="password"]', 'AdminPswd');
    await page.click('button[type="submit"]');
    
    // Wait for successful login
    await page.waitForSelector('text=Admin User', { timeout: 10000 });
  });

  test('should display Student and Tutor navigation items', async ({ page }) => {
    // Check that Student navigation is visible
    await expect(page.locator('button:has-text("Student")')).toBeVisible();
    
    // Check that Tutor navigation is visible
    await expect(page.locator('button:has-text("Tutor")')).toBeVisible();
    
    // Check that old navigation items are not present
    await expect(page.locator('a:has-text("Catalogue")')).not.toBeVisible();
    await expect(page.locator('a:has-text("My Courses")')).not.toBeVisible();
  });

  test('should navigate to Student dashboard', async ({ page }) => {
    await page.click('button:has-text("Student")');
    
    // Should be on student page
    await expect(page).toHaveURL(/\/student/);
    
    // Should see Student Dashboard title
    await expect(page.locator('h1:has-text("Student Dashboard")')).toBeVisible();
    
    // Should see tab navigation
    await expect(page.locator('button:has-text("Browse Courses")')).toBeVisible();
    await expect(page.locator('button:has-text("My Learning")')).toBeVisible();
    await expect(page.locator('button:has-text("Progress")')).toBeVisible();
  });

  test('should navigate to Tutor dashboard', async ({ page }) => {
    await page.click('button:has-text("Tutor")');
    
    // Should be on tutor page
    await expect(page).toHaveURL(/\/tutor/);
    
    // Should see Tutor Dashboard title
    await expect(page.locator('h1:has-text("Tutor Dashboard")')).toBeVisible();
    
    // Should see tab navigation
    await expect(page.locator('button:has-text("My Courses")')).toBeVisible();
    await expect(page.locator('button:has-text("Create Course")')).toBeVisible();
    await expect(page.locator('button:has-text("Analytics")')).toBeVisible();
    await expect(page.locator('button:has-text("Students")')).toBeVisible();
  });

  test('should switch between Student tabs', async ({ page }) => {
    await page.click('button:has-text("Student")');
    
    // Default should be Browse Courses
    await expect(page.locator('button:has-text("Browse Courses")').first()).toHaveClass(/border-blue-500/);
    
    // Click My Learning tab
    await page.click('button:has-text("My Learning")');
    await expect(page.locator('button:has-text("My Learning")').first()).toHaveClass(/border-blue-500/);
    
    // Click Progress tab
    await page.click('button:has-text("Progress")');
    await expect(page.locator('button:has-text("Progress")').first()).toHaveClass(/border-blue-500/);
  });

  test('should switch between Tutor tabs', async ({ page }) => {
    await page.click('button:has-text("Tutor")');
    
    // Default should be My Courses
    await expect(page.locator('button:has-text("My Courses")').first()).toHaveClass(/border-amber-500/);
    
    // Click Create Course tab
    await page.click('button:has-text("Create Course")');
    await expect(page.locator('button:has-text("Create Course")').first()).toHaveClass(/border-amber-500/);
    
    // Click Analytics tab
    await page.click('button:has-text("Analytics")');
    await expect(page.locator('button:has-text("Analytics")').first()).toHaveClass(/border-amber-500/);
    
    // Click Students tab
    await page.click('button:has-text("Students")');
    await expect(page.locator('button:has-text("Students")').first()).toHaveClass(/border-amber-500/);
  });

  test('should redirect old routes', async ({ page }) => {
    // Test catalogue redirect
    await page.goto('/catalogue');
    await expect(page).toHaveURL(/\/student\?tab=browse/);
    
    // Test my-subjects redirect
    await page.goto('/my-subjects');
    await expect(page).toHaveURL(/\/student\?tab=learning/);
    
    // Test my-courses redirect (if it exists)
    await page.goto('/my-courses');
    await expect(page).toHaveURL(/\/tutor\?tab=courses/);
  });

  test('should work on mobile', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Open mobile menu
    await page.click('button[aria-label="Open menu"]');
    
    // Should see Student and Tutor in mobile menu
    await expect(page.locator('button:has-text("Student")')).toBeVisible();
    await expect(page.locator('button:has-text("Tutor")')).toBeVisible();
    
    // Click Student in mobile menu
    await page.click('button:has-text("Student")');
    
    // Should navigate to student page and close menu
    await expect(page).toHaveURL(/\/student/);
    await expect(page.locator('button:has-text("Student")').first()).not.toBeVisible();
  });
});