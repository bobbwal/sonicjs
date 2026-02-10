import { test, expect } from '@playwright/test';
import { loginAsAdmin, ensureAdminUserExists } from './utils/test-helpers';

const BASE_URL = process.env.BASE_URL || 'http://localhost:8787';

test.describe('Radio Field', () => {
  test('should save hero height radio selection in page blocks', async ({ page }) => {
    let createdContentId: string | null = null;
    await ensureAdminUserExists(page);
    await loginAsAdmin(page);

    // Use shipped Page Blocks collection via chooser for env-independent collection IDs.
    await page.goto(`${BASE_URL}/admin/content/new`);
    const pageBlocksLink = page.locator('a[href^="/admin/content/new?collection="]').filter({ hasText: 'Page Blocks' });
    const hasPageBlocks = await pageBlocksLink.isVisible().catch(() => false);
    if (!hasPageBlocks) {
      test.skip(true, 'Page Blocks collection not available');
      return;
    }
    await pageBlocksLink.click();
    await page.waitForSelector('form#content-form');

    const title = `Radio Content ${Date.now()}`;
    await page.fill('input[name="title"]', title);
    await page.fill('input[name="slug"]', `radio-content-${Date.now()}`);

    const blocksField = page.locator('[data-field-name="body"]');
    await expect(blocksField).toBeVisible();
    await blocksField.locator('[data-role="block-type-select"]').selectOption('hero');
    await blocksField.locator('[data-action="add-block"]').click();

    const firstBlock = blocksField.locator('.blocks-item').first();
    await firstBlock.locator('[data-block-field="heading"] input').fill('Radio persistence hero');

    const radioFull = firstBlock.locator('[data-block-field="height"] input[value="full"]');
    await expect(radioFull).toBeVisible({ timeout: 10000 });
    await radioFull.check();

    await page.click('button[name="action"][value="save_and_publish"]');
    await page.waitForURL(/\/admin\/content\/[^/]+\/edit|\/admin\/content\?/, { timeout: 15000 });

    const editUrlMatch = page.url().match(/\/admin\/content\/([^/]+)\/edit/);
    if (editUrlMatch?.[1]) {
      createdContentId = editUrlMatch[1];
    } else {
      await page.goto(`${BASE_URL}/admin/content?collection=page_blocks`);
      const contentLink = page.locator(`a:has-text("${title}")`).first();
      await expect(contentLink).toBeVisible({ timeout: 10000 });
      const href = await contentLink.getAttribute('href');
      const match = href?.match(/\/admin\/content\/([^/]+)\/edit/);
      createdContentId = match?.[1] || null;
      await contentLink.click();
    }

    await expect(page.locator('[data-block-field="height"] input[value="full"]').first()).toBeChecked();

    if (createdContentId) {
      const deleteResponse = await page.request.delete(`/admin/content/${createdContentId}`);
      expect(deleteResponse.ok()).toBeTruthy();
    }
  });
});
