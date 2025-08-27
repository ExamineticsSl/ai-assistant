import { test, expect } from '@playwright/test';

/**
 * Visual regression tests for PrototypeManager component
 * Protects the healthcare prototype management interface from UI regressions
 */

test.describe('PrototypeManager Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Mock authentication
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'mock-jwt-token');
    });

    // Wait for app to load and navigate to prototype management
    await page.waitForLoadState('networkidle');
  });

  test('should display prototype manager interface correctly', async ({ page }) => {
    // Mock prototype data
    await page.route('**/api/v1/prototypes/project/1', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 1,
              name: 'Order Fulfillment UI',
              description: 'Healthcare order fulfillment interface prototype',
              prototypeType: 'ui-component',
              status: 'active',
              framework: 'react',
              healthcareCompliance: true,
              projectName: 'WHS Healthcare Management'
            },
            {
              id: 2,
              name: 'Patient Dashboard',
              description: 'Occupational health dashboard prototype',
              prototypeType: 'dashboard',
              status: 'pending_approval',
              framework: 'react',
              healthcareCompliance: true,
              projectName: 'WHS Healthcare Management'
            }
          ]
        })
      });
    });

    // Navigate to project with prototypes
    await page.goto('/?tab=project-progress&projectId=1');
    
    // Wait for prototype manager to render
    await page.waitForSelector('[data-testid="prototype-manager"]', { timeout: 10000 });
    
    // Take screenshot for visual regression
    await expect(page).toHaveScreenshot('prototype-manager-default.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('should display create prototype dialog correctly', async ({ page }) => {
    // Mock empty prototypes list
    await page.route('**/api/v1/prototypes/project/1', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] })
      });
    });

    await page.goto('/?tab=project-progress&projectId=1');
    await page.waitForSelector('[data-testid="prototype-manager"]');
    
    // Click create prototype button
    await page.click('button:has-text("Create New Prototype")');
    
    // Wait for dialog to appear
    await page.waitForSelector('[data-testid="create-prototype-dialog"]');
    
    // Take screenshot of create dialog
    await expect(page).toHaveScreenshot('prototype-manager-create-dialog.png', {
      animations: 'disabled'
    });
  });

  test('should display prototype cards with healthcare badges correctly', async ({ page }) => {
    // Mock prototypes with various compliance states
    await page.route('**/api/v1/prototypes/project/1', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 1,
              name: 'HIPAA Compliant Form',
              prototypeType: 'form',
              status: 'active',
              healthcareCompliance: true,
              hipaaReviewed: true,
              accessibilityTested: true,
              versionCount: 3,
              openFeedbackCount: 2
            },
            {
              id: 2,
              name: 'Basic UI Component',
              prototypeType: 'ui-component', 
              status: 'development',
              healthcareCompliance: false,
              hipaaReviewed: false,
              accessibilityTested: false,
              versionCount: 1,
              openFeedbackCount: 0
            }
          ]
        })
      });
    });

    await page.goto('/?tab=project-progress&projectId=1');
    await page.waitForSelector('.prototype-card');
    
    // Take screenshot showing healthcare compliance badges
    await expect(page).toHaveScreenshot('prototype-manager-healthcare-badges.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('should handle different viewport sizes correctly', async ({ page }) => {
    await page.route('**/api/v1/prototypes/project/1', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] })
      });
    });

    // Test tablet view
    await page.setViewportSize({ width: 1024, height: 768 });
    await page.goto('/?tab=project-progress&projectId=1');
    await page.waitForSelector('[data-testid="prototype-manager"]');
    
    await expect(page).toHaveScreenshot('prototype-manager-tablet.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('should display error state correctly', async ({ page }) => {
    // Mock API error
    await page.route('**/api/v1/prototypes/project/1', (route) => {
      route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({
          success: false,
          error: 'Failed to fetch prototypes'
        })
      });
    });

    await page.goto('/?tab=project-progress&projectId=1');
    
    // Wait for error state to appear
    await page.waitForSelector('text=Failed to fetch prototypes');
    
    await expect(page).toHaveScreenshot('prototype-manager-error.png', {
      animations: 'disabled'
    });
  });
});