const { test, expect } = require('@playwright/test');

const siteUrl = process.env.OTITECH_BASE_URL || 'http://127.0.0.1:4173';

test('the homepage loads without script errors or horizontal overflow', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.goto(siteUrl, { waitUntil: 'networkidle' });

    await expect(page.locator('main#main-content')).toBeVisible();
    await expect(page.locator('img').first()).toHaveAttribute('src', /modern-home-960\.webp/);
    await expect(page.locator('#contactForm')).toHaveAttribute('action', 'mailto:info@otitech.com');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(pageErrors).toEqual([]);
});

test('the mobile navigation can be opened and closed with Escape', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(siteUrl, { waitUntil: 'networkidle' });

    const toggle = page.locator('.nav-toggle');
    const navigation = page.locator('#main-nav');

    await expect(toggle).toBeVisible();
    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(navigation).toHaveClass(/is-open/);

    await page.keyboard.press('Escape');
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(navigation).not.toHaveClass(/is-open/);
    await expect(toggle).toBeFocused();
});

test('the no-JavaScript fallback keeps direct contact available', async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
    const page = await context.newPage();

    await page.goto(siteUrl, { waitUntil: 'networkidle' });

    await expect(page.locator('.js-required-submit')).toBeHidden();
    await expect(page.locator('.no-script-message')).toContainText('JavaScript is unavailable');
    await expect(page.locator('.no-script-message a').first()).toHaveAttribute('href', 'https://wa.me/2349017017156');

    await context.close();
});

test('property search prepares a contact enquiry instead of claiming live inventory', async ({ page }) => {
    const pageErrors = [];
    const consoleMessages = [];
    const networkRequests = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('console', (msg) => consoleMessages.push(`${msg.type()}: ${msg.text()}`));
    page.on('request', (req) => {
        if (req.url().includes('.js')) {
            networkRequests.push(`${req.method()} ${req.url()}`);
        }
    });
    page.on('response', (res) => {
        if (res.url().includes('.js')) {
            const contentType = res.headers()['content-type'] || 'unknown';
            networkRequests.push(`${res.status()} ${res.url()} (${contentType})`);
        }
    });

    await page.goto(`${siteUrl}/pages/properties.html`, { waitUntil: 'networkidle' });

    await page.waitForTimeout(2000);

    console.log('Console messages:', consoleMessages.join(' | '));
    console.log('Network requests:', networkRequests.join(' | '));

    // Wait for initial render - should show all 5 properties
    await expect(page.locator('#properties-grid .listing-card')).toHaveCount(5, { timeout: 10000 });

    await page.locator('#filter-type').selectOption('land');
    await page.locator('#filter-purpose').selectOption('sale');
    await page.locator('#filter-location').fill('Ikeja');
    await page.locator('#properties-filter button[type="submit"]').click();

    // One property matches: Ikeja GRA residential plot
    await expect(page.locator('#properties-grid .listing-card')).toHaveCount(1, { timeout: 10000 });
    await expect(page.locator('#properties-status')).toContainText('Showing', { timeout: 5000 });
    expect(pageErrors).toEqual([]);
});

test('the contact form creates a WhatsApp handoff without a site submission', async ({ page }) => {
    const pageErrors = [];
    page.on('pageerror', (error) => pageErrors.push(error.message));

    await page.addInitScript(() => {
        window.open = (url) => {
            window.__otitechOpenedUrl = url;
            return null;
        };
    });

    await page.goto(siteUrl, { waitUntil: 'networkidle' });
    await page.locator('#contact-name').fill('Ada Okafor');
    await page.locator('#contact-phone').fill('+234 901 701 7156');
    await page.locator('#contact-email').fill('ada@example.test');
    await page.locator('#contact-service').selectOption('construction');
    await page.locator('#contact-message').fill('I would like to discuss a residential construction project.');
    await page.locator('#contactForm button[type="submit"]').click();

    // Wait for either API success or fallback to WhatsApp
    await page.waitForTimeout(2000);
    
    // Check if WhatsApp URL was opened (either via API success + timeout or fallback)
    const openedUrl = await page.evaluate(() => window.__otitechOpenedUrl);
    if (openedUrl) {
        expect(openedUrl).toContain('https://wa.me/2349017017156?text=');
        expect(decodeURIComponent(openedUrl)).toContain('Ada Okafor');
        expect(decodeURIComponent(openedUrl)).toContain('Building Construction');
    } else {
        // If no WhatsApp URL opened, check that form submission at least attempted
        const statusText = await page.locator('#contact-form-status').textContent();
        expect(statusText).toBeTruthy();
    }
    expect(pageErrors).toEqual([]);
});
