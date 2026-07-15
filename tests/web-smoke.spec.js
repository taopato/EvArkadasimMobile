const { test, expect } = require('@playwright/test');

const email = process.env.ROOMORA_TEST_EMAIL;
const password = process.env.ROOMORA_TEST_PASSWORD;
const webUrl = process.env.ROOMORA_WEB_URL || 'http://localhost:8082';

test.use({
  channel: 'chrome',
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 1,
});

test('mobile web critical navigation renders without runtime errors', async ({ page }, testInfo) => {
  test.skip(!email || !password, 'ROOMORA_TEST_EMAIL and ROOMORA_TEST_PASSWORD are required.');

  const pageErrors = [];
  const serverErrors = [];
  const dialogs = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));
  page.on('dialog', async (dialog) => {
    dialogs.push(dialog.message());
    await dialog.accept();
  });
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

  await page.goto(webUrl, { waitUntil: 'networkidle' });
  await page.getByPlaceholder('E-posta').fill(email);
  await page.getByPlaceholder('Şifre').fill(password);
  await page.getByText('Giriş Yap', { exact: true }).first().click();

  await expect(page.getByText('Haftalık ev harcaması', { exact: true })).toBeVisible({ timeout: 20_000 });
  await assertNoHorizontalOverflow();
  await page.screenshot({ path: testInfo.outputPath('home.png'), fullPage: true });

  await page.getByText('Ödemeler', { exact: true }).last().click();
  await expect(page.getByText('Yeni Ödeme Ekle', { exact: true })).toBeVisible();
  await assertNoHorizontalOverflow();
  await page.screenshot({ path: testInfo.outputPath('payments.png'), fullPage: true });

  await page.getByText('Giderler', { exact: true }).last().click();
  await expect(page.getByText('Harcamalar', { exact: true })).toBeVisible();
  await expect(page.getByText('Yeni Harcama Ekle', { exact: true })).toBeVisible();
  await assertNoHorizontalOverflow();
  await page.screenshot({ path: testInfo.outputPath('expenses.png'), fullPage: true });
  await page.getByText('Yeni Harcama Ekle', { exact: true }).click();
  await expect(page.getByText('Harcama Ekle', { exact: true })).toBeVisible();
  await expect(page.getByText('Fiş veya fatura okut', { exact: true })).toBeVisible();
  await assertNoHorizontalOverflow();
  await page.screenshot({ path: testInfo.outputPath('expense-create.png'), fullPage: true });
  await page.goBack();
  await expect(page.getByText('Harcamalar', { exact: true })).toBeVisible();

  await page.getByText('Faturalar', { exact: true }).last().click();
  await expect(page.getByText('Bu ay toplam', { exact: true })).toBeVisible();
  await expect(page.getByText('Yeni Fatura Planı Ekle', { exact: true })).toBeVisible();
  await assertNoHorizontalOverflow();
  await page.screenshot({ path: testInfo.outputPath('bills.png'), fullPage: true });
  await page.getByText('Elektrik', { exact: true }).last().click();
  await expect(page.getByText('Fatura Detayı', { exact: true })).toBeVisible();
  await expect(page.getByText('Fatura bilgileri', { exact: true })).toBeVisible();
  await assertNoHorizontalOverflow();
  await page.screenshot({ path: testInfo.outputPath('bill-detail.png'), fullPage: true });
  await page.getByText('Düzenle', { exact: true }).click();
  await expect(page.getByText('Faturayı Düzenle', { exact: true })).toBeVisible();
  await expect(page.getByText('Fatura tarihi', { exact: true })).toBeVisible();
  await assertNoHorizontalOverflow();
  await page.screenshot({ path: testInfo.outputPath('bill-edit.png'), fullPage: true });
  await page.goBack();
  await expect(page.getByText('Fatura Detayı', { exact: true })).toBeVisible();
  await page.goBack();
  await expect(page.getByText('Bu ay toplam', { exact: true })).toBeVisible();

  await page.getByText('Ayarlar', { exact: true }).last().click();
  await expect(page.getByText('Profili Düzenle', { exact: true })).toBeVisible();
  await expect(page.getByText('API (dev)', { exact: true })).toHaveCount(0);
  await page.getByText('Tema', { exact: true }).click();
  await expect(page.getByText('Renk Paleti', { exact: true })).toBeVisible();
  await expect(page.getByRole('radio', { name: 'Gökyüzü Mavisi' })).toBeChecked();
  await page.getByLabel('Geri').click();
  await expect(page.getByText('Profili Düzenle', { exact: true })).toBeVisible();
  await page.getByText('Profili Düzenle', { exact: true }).click();
  await expect(page.getByText('Telefon Numarası', { exact: true })).toBeVisible();
  await expect(page.getByText('+90', { exact: true })).toBeVisible();
  await expect(page.getByText('TR', { exact: true })).toBeVisible();
  await assertNoHorizontalOverflow();
  await page.screenshot({ path: testInfo.outputPath('profile.png'), fullPage: true });

  const profileUpdate = page.waitForResponse((response) => (
    /\/api\/Users\/\d+\/Profile$/.test(response.url()) && response.request().method() === 'PUT'
  ));
  await page.getByText('Değişiklikleri Kaydet', { exact: true }).click();
  expect((await profileUpdate).status()).toBe(200);
  expect(dialogs.join(' ')).not.toContain('Oturum hatası');

  expect(pageErrors).toEqual([]);
  expect(serverErrors).toEqual([]);
});
