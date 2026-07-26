const { test, expect } = require('@playwright/test');

const email = process.env.ROOMORA_TEST_EMAIL;
const password = process.env.ROOMORA_TEST_PASSWORD;
const webUrl = process.env.ROOMORA_WEB_URL || 'http://localhost:8083';

test.use({
  channel: 'chrome',
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
});

test('Roomora mobile critical flows render without runtime errors', async ({ page }, testInfo) => {
  test.setTimeout(150_000);
  test.skip(!email || !password, 'ROOMORA_TEST_EMAIL and ROOMORA_TEST_PASSWORD are required.');

  const pageErrors = [];
  const serverErrors = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('dialog', (dialog) => dialog.accept());
  page.on('response', (response) => {
    if (response.status() >= 500) serverErrors.push(`${response.status()} ${response.url()}`);
  });

  const assertNoHorizontalOverflow = async () => {
    const overflow = await page.evaluate(() => (
      Math.max(document.documentElement.scrollWidth, document.body?.scrollWidth || 0)
      - document.documentElement.clientWidth
    ));
    expect(overflow).toBeLessThanOrEqual(2);
  };

  await page.goto(webUrl, { waitUntil: 'domcontentloaded' });
  await page.getByPlaceholder('E-posta').fill(email);
  await page.getByPlaceholder('Şifre').fill(password);
  await page.getByText('Giriş Yap', { exact: true }).first().click();

  await expect(page.getByText(/Merhaba,/).first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText('Ana Sayfa', { exact: true }).last()).toBeVisible();
  await expect(page.getByText('Faturalar', { exact: true }).last()).toBeVisible();
  await expect(page.getByText('Giderler', { exact: true }).last()).toBeVisible();
  await expect(page.getByText('Notlar', { exact: true }).last()).toBeVisible();
  await expect(page.getByText('Ayarlar', { exact: true }).last()).toBeVisible();
  await expect(page.getByText('Ödemeler', { exact: true })).toHaveCount(0);
  await assertNoHorizontalOverflow();
  await page.screenshot({ path: testInfo.outputPath('home.png'), fullPage: true });

  await page.getByText('Giderler', { exact: true }).last().click();
  await expect(page.getByText('Yeni Harcama Ekle', { exact: true })).toBeVisible();
  await assertNoHorizontalOverflow();
  await page.screenshot({ path: testInfo.outputPath('expenses.png'), fullPage: true });

  await page.getByText('Yeni Harcama Ekle', { exact: true }).click();
  await expect(page.getByText('Harcama Ekle', { exact: true }).last()).toBeVisible();
  await expect(page.getByText('Hızlı seçimler', { exact: true })).toBeVisible();
  await expect(page.getByText('Ekmek', { exact: true })).toBeVisible();
  await page.getByText('Ekmek', { exact: true }).click();
  await expect(page.getByPlaceholder('Örn. Ekmek')).toHaveValue('Ekmek');
  await assertNoHorizontalOverflow();
  await page.screenshot({ path: testInfo.outputPath('quick-expense.png'), fullPage: true });
  await page.goBack();

  await page.getByText('Notlar', { exact: true }).last().click();
  await expect(page.getByText('Notlar', { exact: true }).first()).toBeVisible();
  await assertNoHorizontalOverflow();
  await page.screenshot({ path: testInfo.outputPath('notes.png'), fullPage: true });

  await page.getByText('Faturalar', { exact: true }).last().click();
  await expect(page.getByText('TOPLAM FATURA', { exact: true })).toBeVisible();
  await expect(page.getByText('Yeni Fatura Ekle', { exact: true })).toBeVisible();
  await assertNoHorizontalOverflow();
  await page.screenshot({ path: testInfo.outputPath('bills.png'), fullPage: true });

  await page.getByText('Ayarlar', { exact: true }).last().click();
  await expect(page.getByText('Profil Düzenle', { exact: true })).toBeVisible();
  await expect(page.getByText('Bildirim Ayarları', { exact: true }).last()).toBeVisible();
  await expect(page.getByText('Gizlilik Politikası', { exact: true })).toBeVisible();
  await expect(page.getByText('API (dev)', { exact: true })).toHaveCount(0);
  await assertNoHorizontalOverflow();
  await page.screenshot({ path: testInfo.outputPath('settings.png'), fullPage: true });

  await page.getByText('Bildirim Ayarları', { exact: true }).click();
  await expect(page.getByText('Bildirim Ayarları', { exact: true }).last()).toBeVisible();
  await page.getByLabel('Geri').click();
  await page.getByText('Gizlilik Politikası', { exact: true }).click();
  await expect(page.getByText('Topladığımız bilgiler', { exact: true })).toBeVisible();
  await page.getByLabel('Geri').click();

  await page.goto(`${webUrl}/debt-summary`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Borç / Alacak Özeti', { exact: true })).toBeVisible({ timeout: 15_000 });
  await assertNoHorizontalOverflow();

  await page.goto(`${webUrl}/ev-uyeleri`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Ev Üyeleri', { exact: true })).toBeVisible({ timeout: 15_000 });
  await assertNoHorizontalOverflow();

  await page.goto(`${webUrl}/ev-notlari`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Notlar', { exact: true })).toBeVisible({ timeout: 15_000 });
  await assertNoHorizontalOverflow();

  await page.goto(`${webUrl}/bekleyen-odemeler`, { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Bekleyen Ödemeler', { exact: true })).toBeVisible({ timeout: 15_000 });
  await assertNoHorizontalOverflow();

  expect(pageErrors).toEqual([]);
  expect(serverErrors).toEqual([]);
});
