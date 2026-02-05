import { test, expect } from '@playwright/test';
import { loginAsAdmin, ensureAdminUserExists, createTestCollection, deleteTestCollection } from './utils/test-helpers';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8787';

test.describe('Radio Field', () => {
  test('should save radio selection in content form', async ({ page }) => {
    const collectionName = `radio_test_${Date.now()}`;
    const collectionData = {
      name: collectionName,
      displayName: 'Radio Test',
      description: 'Collection for radio field E2E test'
    };

    await ensureAdminUserExists(page);
    await loginAsAdmin(page);

    await createTestCollection(page, collectionData);

    // Open collection edit page
    await page.goto(`${BASE_URL}/admin/collections`);
    const collectionRow = page.locator('tr').filter({ hasText: collectionName });
    await expect(collectionRow).toBeVisible();
    await collectionRow.click();
    await expect(page.locator('h1')).toContainText('Edit Collection');
    const collectionPath = new URL(page.url()).pathname;
    const collectionId = collectionPath.split('/').filter(Boolean).pop() || collectionName;

    // Add a radio field
    await page.click('button:has-text("Add Field")');
    await page.waitForSelector('#field-modal:not(.hidden)');

    await page.fill('#modal-field-name', 'priority');
    await page.selectOption('#field-type', 'radio');
    await page.fill('#field-label', 'Priority');

    await expect(page.locator('#field-options-container')).not.toHaveClass(/hidden/);

    const optionsJson = JSON.stringify({
      enum: ['low', 'medium', 'high'],
      enumLabels: ['Low', 'Medium', 'High'],
      default: 'medium',
      inline: true
    });
    await page.fill('#field-options', optionsJson);

    await page.click('#field-modal button[type="submit"]');
    const newField = page.locator('.field-item').filter({ hasText: 'priority' });
    await expect(newField).toBeVisible({ timeout: 10000 });

    // Create content using the new collection
    await page.goto(`${BASE_URL}/admin/content/new?collection=${collectionId}`);
    await page.waitForSelector('form#content-form');

    const title = `Radio Content ${Date.now()}`;
    const titleInput = page.locator('input[name="title"]');
    if (await titleInput.count()) {
      await titleInput.fill(title);
      const slugInput = page.locator('input[name="slug"]');
      if (await slugInput.count()) {
        await slugInput.fill(`radio-content-${Date.now()}`);
      }
    }

    const radioHigh = page.locator('input[name="priority"][value="high"]');
    await expect(radioHigh).toBeVisible({ timeout: 10000 });
    await radioHigh.check();

    await page.click('button[name="action"][value="save_and_publish"]');
    await page.waitForTimeout(2000);

    await page.goto(`${BASE_URL}/admin/content?collection=${collectionId}`);
    const contentLink = page.locator(`a:has-text("${title}")`).first();
    if (await contentLink.count()) {
      await expect(contentLink).toBeVisible({ timeout: 10000 });
      await contentLink.click();
    } else {
      // Fallback: open the first row if title isn't shown for this collection
      const firstRowLink = page.locator('tbody a[href*="/admin/content/"]').first();
      await expect(firstRowLink).toBeVisible({ timeout: 10000 });
      await firstRowLink.click();
    }

    await expect(page.locator('input[name="priority"][value="high"]')).toBeChecked();

    await deleteTestCollection(page, collectionName);
  });
});
