import { test, expect } from '@playwright/test';

/**
 * Visual regression tests for main dashboard components
 * Protects the core healthcare AI task management interface
 */

test.describe('Dashboard Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Mock authentication
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'mock-jwt-token');
    });

    await page.waitForLoadState('networkidle');
  });

  test('should display main dashboard correctly', async ({ page }) => {
    // Mock task data
    await page.route('**/api/v1/tasks/pending-approval', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 1,
              title: 'Process Healthcare Order #12345',
              description: 'Occupational health screening order for employee John Smith',
              priority: 'High',
              status: 'pending_approval',
              category: 'Order Processing',
              healthcareContext: true,
              estimatedTimeMinutes: 15,
              requiredCapabilities: ['order-processing', 'healthcare-compliance'],
              createdDate: '2025-08-27T09:00:00Z'
            }
          ]
        })
      });
    });

    // Mock statistics
    await page.route('**/api/v1/approval/statistics', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            pendingCount: 3,
            approvedCount: 15,
            rejectedCount: 2,
            averageResponseTimeHours: 2.5
          }
        })
      });
    });

    await page.waitForSelector('[data-testid="approval-inbox"]');
    
    await expect(page).toHaveScreenshot('dashboard-main.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('should display approval inbox correctly', async ({ page }) => {
    // Mock multiple tasks with different priorities
    await page.route('**/api/v1/tasks/pending-approval', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 1,
              title: 'Critical: Process Emergency Order',
              priority: 'Critical',
              status: 'pending_approval',
              category: 'Emergency Processing',
              healthcareContext: true,
              estimatedTimeMinutes: 5
            },
            {
              id: 2,
              title: 'Review Compliance Documentation',
              priority: 'High',
              status: 'pending_approval',
              category: 'Compliance',
              healthcareContext: true,
              estimatedTimeMinutes: 30
            },
            {
              id: 3,
              title: 'Standard Order Processing',
              priority: 'Medium',
              status: 'pending_approval',
              category: 'Order Processing',
              healthcareContext: false,
              estimatedTimeMinutes: 10
            }
          ]
        })
      });
    });

    await page.route('**/api/v1/approval/statistics', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { pendingCount: 3, approvedCount: 10, rejectedCount: 1, averageResponseTimeHours: 1.8 }
        })
      });
    });

    await page.waitForSelector('.task-card');
    
    await expect(page).toHaveScreenshot('dashboard-approval-inbox.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('should display task submission modal correctly', async ({ page }) => {
    // Mock empty pending tasks
    await page.route('**/api/v1/tasks/pending-approval', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] })
      });
    });

    await page.route('**/api/v1/approval/statistics', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { pendingCount: 0, approvedCount: 0, rejectedCount: 0, averageResponseTimeHours: 0 }
        })
      });
    });

    await page.waitForSelector('button:has-text("Submit New Task")');
    
    // Open task submission modal
    await page.click('button:has-text("Submit New Task")');
    await page.waitForSelector('[data-testid="task-submission-modal"]');
    
    await expect(page).toHaveScreenshot('dashboard-task-submission-modal.png', {
      animations: 'disabled'
    });
  });

  test('should display project progress tab correctly', async ({ page }) => {
    // Mock project data
    await page.route('**/api/v1/projects', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 1,
              name: 'WHS Healthcare Management',
              description: 'Occupational health order fulfillment system',
              status: 'Active',
              healthcareCompliance: true,
              startDate: '2025-01-15',
              targetDate: '2025-12-31'
            }
          ]
        })
      });
    });

    // Switch to project progress tab
    await page.click('button:has-text("Project Progress")');
    await page.waitForSelector('[data-testid="project-progress"]');
    
    await expect(page).toHaveScreenshot('dashboard-project-progress.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('should handle mobile viewport correctly', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.route('**/api/v1/tasks/pending-approval', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 1,
              title: 'Mobile Task Test',
              priority: 'Medium',
              status: 'pending_approval',
              healthcareContext: true
            }
          ]
        })
      });
    });

    await page.route('**/api/v1/approval/statistics', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { pendingCount: 1, approvedCount: 0, rejectedCount: 0, averageResponseTimeHours: 0 }
        })
      });
    });

    await page.waitForSelector('[data-testid="approval-inbox"]');
    
    await expect(page).toHaveScreenshot('dashboard-mobile.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('should display error states correctly', async ({ page }) => {
    // Mock API error
    await page.route('**/api/v1/tasks/pending-approval', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Internal server error'
        })
      });
    });

    await page.route('**/api/v1/approval/statistics', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Statistics unavailable'
        })
      });
    });

    // Wait for error states to appear
    await page.waitForSelector('text=Failed to load tasks');
    
    await expect(page).toHaveScreenshot('dashboard-error-state.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('should display loading states correctly', async ({ page }) => {
    // Mock slow API response
    await page.route('**/api/v1/tasks/pending-approval', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] })
      });
    });

    await page.route('**/api/v1/approval/statistics', async (route) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: { pendingCount: 0, approvedCount: 0, rejectedCount: 0, averageResponseTimeHours: 0 }
        })
      });
    });

    // Capture loading state immediately after navigation
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    
    // Wait for loading indicators
    await page.waitForSelector('.animate-spin, [data-testid="loading"]', { timeout: 1000 });
    
    await expect(page).toHaveScreenshot('dashboard-loading-state.png', {
      animations: 'disabled'
    });
  });
});