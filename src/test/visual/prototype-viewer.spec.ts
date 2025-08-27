import { test, expect } from '@playwright/test';

/**
 * Visual regression tests for PrototypeViewer component
 * Protects the interactive prototype viewing and feedback interface
 */

test.describe('PrototypeViewer Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    
    // Mock authentication
    await page.evaluate(() => {
      localStorage.setItem('authToken', 'mock-jwt-token');
    });

    await page.waitForLoadState('networkidle');
  });

  test('should display prototype viewer interface correctly', async ({ page }) => {
    // Mock prototype data
    await page.route('**/api/v1/prototypes/1', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            prototype: {
              id: 1,
              name: 'Healthcare Order Form',
              description: 'HIPAA compliant order entry form',
              status: 'active',
              healthcareCompliance: true,
              framework: 'react'
            },
            versions: [
              {
                id: 1,
                version: '1.0.0',
                buildPath: '/prototypes/order-form',
                entryPoint: 'index.html',
                isActive: true,
                status: 'active',
                healthcareValidated: true
              }
            ]
          }
        })
      });
    });

    // Mock feedback data
    await page.route('**/api/v1/prototypes/1/versions/1.0.0/feedback', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 1,
              feedbackType: 'enhancement',
              title: 'Improve button accessibility',
              comment: 'Submit button needs higher contrast for better visibility',
              priority: 'High',
              positionX: 250,
              positionY: 400,
              accessibilityIssue: true,
              status: 'open'
            }
          ]
        })
      });
    });

    // Navigate to prototype viewer
    await page.goto('/?tab=project-progress&projectId=1&prototypeId=1');
    
    // Wait for prototype viewer to load
    await page.waitForSelector('[data-testid="prototype-viewer"]', { timeout: 10000 });
    
    // Take screenshot of default viewer state
    await expect(page).toHaveScreenshot('prototype-viewer-default.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('should display feedback mode correctly', async ({ page }) => {
    // Mock prototype and feedback data (same as above)
    await page.route('**/api/v1/prototypes/1', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            prototype: {
              id: 1,
              name: 'Healthcare Dashboard',
              framework: 'react'
            },
            versions: [{ id: 1, version: '1.0.0', isActive: true, status: 'active' }]
          }
        })
      });
    });

    await page.route('**/api/v1/prototypes/1/versions/1.0.0/feedback', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] })
      });
    });

    await page.goto('/?tab=project-progress&projectId=1&prototypeId=1');
    await page.waitForSelector('[data-testid="prototype-viewer"]');
    
    // Enable feedback mode
    await page.click('button:has-text("Add Feedback")');
    
    // Wait for feedback mode UI to appear
    await page.waitForSelector('[data-testid="feedback-instructions"]');
    
    await expect(page).toHaveScreenshot('prototype-viewer-feedback-mode.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('should display feedback pins correctly', async ({ page }) => {
    // Mock data with existing feedback
    await page.route('**/api/v1/prototypes/1', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            prototype: { id: 1, name: 'Test Prototype', framework: 'react' },
            versions: [{ id: 1, version: '1.0.0', isActive: true, status: 'active' }]
          }
        })
      });
    });

    await page.route('**/api/v1/prototypes/1/versions/1.0.0/feedback', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 1,
              feedbackType: 'bug',
              title: 'Button not clickable',
              priority: 'Critical',
              positionX: 200,
              positionY: 150,
              status: 'open',
              securityConcern: true
            },
            {
              id: 2,
              feedbackType: 'accessibility',
              title: 'Missing alt text',
              priority: 'High',
              positionX: 400,
              positionY: 300,
              status: 'in_progress',
              accessibilityIssue: true
            }
          ]
        })
      });
    });

    await page.goto('/?tab=project-progress&projectId=1&prototypeId=1');
    await page.waitForSelector('.feedback-pin');
    
    // Show all feedback pins
    await page.click('button:has-text("Show Feedback")');
    
    await expect(page).toHaveScreenshot('prototype-viewer-feedback-pins.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });

  test('should display feedback panel correctly', async ({ page }) => {
    // Mock prototype data
    await page.route('**/api/v1/prototypes/1', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            prototype: { id: 1, name: 'Test Prototype', framework: 'react' },
            versions: [{ id: 1, version: '1.0.0', isActive: true, status: 'active' }]
          }
        })
      });
    });

    await page.route('**/api/v1/prototypes/1/versions/1.0.0/feedback', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 1,
              feedbackType: 'enhancement',
              title: 'Improve color scheme',
              comment: 'The current color scheme does not meet healthcare accessibility standards',
              priority: 'Medium',
              category: 'UI/UX',
              healthcareImpact: 'medium',
              complianceConcern: true,
              createdDate: '2025-08-27T10:30:00Z',
              userId: 'test-user'
            }
          ]
        })
      });
    });

    await page.goto('/?tab=project-progress&projectId=1&prototypeId=1');
    await page.waitForSelector('[data-testid="prototype-viewer"]');
    
    // Open feedback panel
    await page.click('button:has-text("View Feedback")');
    await page.waitForSelector('[data-testid="feedback-panel"]');
    
    await expect(page).toHaveScreenshot('prototype-viewer-feedback-panel.png', {
      animations: 'disabled'
    });
  });

  test('should display new feedback form correctly', async ({ page }) => {
    // Mock basic prototype data
    await page.route('**/api/v1/prototypes/1', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            prototype: { id: 1, name: 'Test Prototype', framework: 'react' },
            versions: [{ id: 1, version: '1.0.0', isActive: true, status: 'active' }]
          }
        })
      });
    });

    await page.route('**/api/v1/prototypes/1/versions/1.0.0/feedback', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] })
      });
    });

    await page.goto('/?tab=project-progress&projectId=1&prototypeId=1');
    await page.waitForSelector('[data-testid="prototype-viewer"]');
    
    // Enter feedback mode and simulate click
    await page.click('button:has-text("Add Feedback")');
    
    // Simulate clicking on prototype area to add feedback
    await page.click('[data-testid="prototype-content"]', { 
      position: { x: 300, y: 200 } 
    });
    
    // Wait for feedback form to appear
    await page.waitForSelector('[data-testid="feedback-form"]');
    
    await expect(page).toHaveScreenshot('prototype-viewer-feedback-form.png', {
      animations: 'disabled'
    });
  });

  test('should handle tablet viewport correctly', async ({ page }) => {
    await page.setViewportSize({ width: 1024, height: 768 });
    
    await page.route('**/api/v1/prototypes/1', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            prototype: { id: 1, name: 'Mobile Prototype', framework: 'react' },
            versions: [{ id: 1, version: '1.0.0', isActive: true, status: 'active' }]
          }
        })
      });
    });

    await page.route('**/api/v1/prototypes/1/versions/1.0.0/feedback', (route) => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] })
      });
    });

    await page.goto('/?tab=project-progress&projectId=1&prototypeId=1');
    await page.waitForSelector('[data-testid="prototype-viewer"]');
    
    await expect(page).toHaveScreenshot('prototype-viewer-tablet.png', {
      fullPage: true,
      animations: 'disabled'
    });
  });
});