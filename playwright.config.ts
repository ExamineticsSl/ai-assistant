import { defineConfig, devices } from '@playwright/test';

/**
 * Visual Regression Testing Configuration for Healthcare AI Prototype Management
 * Protects the beautiful UI of our prototype management system from regressions
 */
export default defineConfig({
  // Test directory
  testDir: './src/test/visual',
  
  // Test timeout
  timeout: 30 * 1000,
  
  // Global test settings
  use: {
    // Base URL for our React app
    baseURL: 'http://localhost:3002',
    
    // Collect trace on retry
    trace: 'on-first-retry',
    
    // Screenshot settings for visual regression
    screenshot: 'only-on-failure',
  },

  // Configure projects for major browsers
  projects: [
    {
      name: 'Desktop Chrome',
      use: { 
        ...devices['Desktop Chrome'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    
    {
      name: 'Desktop Firefox',
      use: { 
        ...devices['Desktop Firefox'],
        viewport: { width: 1920, height: 1080 },
      },
    },
    
    {
      name: 'Healthcare Tablet',
      use: { 
        ...devices['iPad Pro'],
        viewport: { width: 1024, height: 768 },
      },
    },
  ],

  // Test reporter configuration
  reporter: [
    ['html', { outputFolder: 'visual-test-results' }],
    ['junit', { outputFile: 'visual-test-results/junit.xml' }],
  ],

  // Visual comparison settings
  expect: {
    // Threshold for visual comparisons (0.2 = 20% difference tolerance)
    threshold: 0.2,
    
    // Animation handling
    toHaveScreenshot: {
      threshold: 0.3,
      mode: 'rgb',
      animations: 'disabled',
    },
  },

  // Web server for tests
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3002',
    reuseExistingServer: !process.env.CI,
    timeout: 120 * 1000,
  },
});