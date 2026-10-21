import assert from 'node:assert/strict';
export async function verifyWorkspaceTabs(page) {
  const navigate = url => page.evaluate(url => window.__router.navigate(url), url);
  const tab = name => page.locator('nav.cw-tabs').getByRole('button', { name, exact: true }).click();
  const advanced = async title => { await page.locator('.cw-card').filter({ has: page.getByRole('heading', { name: title, exact: true }) }).getByRole('button', { name: 'Advanced settings', exact: true }).click(); };
  const apply = () => page.getByRole('button', { name: 'Apply to draft', exact: true }).click();
  await navigate('/dashboard/products-payments/products/new?type=course');
  const title = page.getByLabel('Course Title *', { exact: true });
  await title.fill('QA Course'); await title.pressSequentially(' Focus');
  assert.equal(await title.evaluate(input => document.activeElement === input), true);
  await page.getByLabel('Short Description', { exact: true }).fill('Course draft description');
  await tab('Content'); await page.getByRole('button', { name: 'Add your first module', exact: true }).click();
  await page.getByRole('button', { name: 'Add Lesson', exact: true }).first().click();
  await page.getByLabel('Lesson title', { exact: true }).fill('QA lesson');
  await page.getByRole('dialog').getByRole('combobox').click(); await page.getByRole('option', { name: 'Text', exact: true }).click();
  await page.getByLabel('Resource URL', { exact: true }).fill('https://example.com/lesson');
  await page.getByRole('button', { name: 'Save Lesson', exact: true }).click();
  await tab('Pricing & Offers');
  await page.getByRole('button', { name: /^Payment plan Split/ }).click();
  await page.getByLabel('Payment Amount').fill('50');
  await page.getByLabel('Price *', { exact: true }).fill('120');
  await tab('Checkout'); await advanced('Checkout Settings');
  await page.getByRole('switch', { name: 'Require terms agreement', exact: true }).check().catch(async error => { console.log('Checkout advanced dialog state:', await page.getByRole('dialog').allTextContents(), await page.evaluate(() => window.__router.state.location)); throw error; });
  await page.getByLabel('Terms URL', { exact: true }).fill('https://example.com/terms');
  await apply();
  assert.equal(await page.locator('.cp-primary').isDisabled(), true);
  await page.getByRole('checkbox', { name: /I agree to the terms/ }).check();
  assert.equal(await page.locator('.cp-primary').isEnabled(), true);
  await tab('Funnel & Pages'); await page.getByLabel('Sales Page URL', { exact: true }).fill('https://example.com/course');
  await tab('Automation'); await page.getByLabel('CRM tag after purchase', { exact: true }).fill('course-enrolled');
  await advanced('Post-purchase Automations'); await page.getByRole('switch', { name: 'Send file delivery notification', exact: true }).check(); await apply();
  await tab('Students'); await page.getByRole('button', { name: 'Add student', exact: true }).click();
  await page.getByLabel('Student name', { exact: true }).fill('QA Learner'); await page.getByLabel('Email address', { exact: true }).fill('learner@example.com');
  await page.getByLabel('Progress (%)', { exact: true }).fill('40'); await page.getByRole('button', { name: 'Apply enrollment', exact: true }).click();
  await tab('Analytics'); await page.getByText('40%', { exact: true }).first().waitFor();
  await tab('Settings'); await advanced('Product Settings');
  await page.getByRole('switch', { name: 'Enable completion certificates', exact: true }).check();
  await page.getByLabel('Certificate issuer', { exact: true }).fill('QA Academy'); await apply();
  await page.getByLabel('Webhook endpoint').fill('https://example.com/webhook');
  await tab('Overview'); assert.equal(await title.inputValue(), 'QA Course Focus');
  const save = page.getByRole('button', { name: 'Save as Draft', exact: true });
  await page.evaluate(() => { window.__failSave = true; });
  await save.click(); await page.getByRole('alert').getByText(/Product could not be saved/).waitFor();
  assert.equal(await title.inputValue(), 'QA Course Focus');
  await page.evaluate(() => { window.__failSave = false; });
  const before = await page.evaluate(() => window.__writes.length);
  await save.evaluate(button => { button.click(); button.click(); });
  await page.waitForFunction(() => window.__router.state.location.pathname.endsWith('/edit'));
  assert.equal(await page.evaluate(() => window.__writes.length), before + 1);
  const saved = await page.evaluate(() => JSON.parse(window.__writes.at(-1).value).find(product => product.name === 'QA Course Focus'));
  assert.equal(saved.config.billing, 'Payment plan'); assert.equal(saved.config.amount, 50);
  assert.equal(saved.config.experience.oneTimeAmount, 120); assert.equal(saved.config.experience.checkout.requireTerms, true);
  assert.equal(saved.config.automations.crmTag, 'course-enrolled'); assert.equal(saved.config.automations.fileDelivery, true);
  assert.equal(saved.config.certificateIssuer, 'QA Academy'); assert.equal(saved.config.students[0].progress, 40);
  assert.equal(saved.config.modules[0].lessons[0].kind, 'Text');
  await page.evaluate(id => {
    window.__seed('entity:orders', [{ id: 'qa-order', productId: id, customerName: 'Course Buyer', status: 'Paid', amount: 50, currency: 'EUR', createdAt: new Date().toISOString() }, { id: 'other', productId: 'other', customerName: 'Unrelated Buyer', amount: 999 }]);
    window.__seed('entity:transactions', [{ id: 'qa-payment', orderId: 'qa-order', status: 'Completed', amount: 50, currency: 'EUR', date: new Date().toISOString() }]);
    window.__seed('entity:events', [{ id: 'view', type: 'lesson.viewed', productId: id, lessonId: 'lesson' }]);
  }, saved.id);
  await tab('Orders'); await page.getByText('Course Buyer', { exact: true }).waitFor(); assert.equal(await page.getByText('Unrelated Buyer', { exact: true }).count(), 0);
  await page.locator('.ce-orders-card tbody tr').waitFor(); assert.equal(await page.locator('.ce-orders-card tbody tr').count(), 1);
  await tab('Analytics'); await page.getByText(/1 views/).waitFor();
  for (const type of ['digital', 'service']) {
    await navigate(`/dashboard/products-payments/products/new?type=${type}`);
    await page.getByLabel(type === 'digital' ? 'Product Name *' : 'Service Name *', { exact: true }).fill(type === 'digital' ? 'QA Digital' : 'QA Service Saved');
    if (type === 'digital') {
      await tab('Customer Access'); await page.getByRole('button', { name: 'Manage access', exact: true }).click();
      await page.getByLabel('Download expiration (hours)', { exact: true }).fill('48'); await apply();
      await tab('Pricing & Payment'); await page.getByLabel('Price *', { exact: true }).fill('25');
    } else {
      await page.evaluate(() => { window.__seed('entity:members', [{ id: 'provider', name: 'QA Provider', status: 'Active' }]); window.__seed('entity:calendars', [{ id: 'calendar-qa', name: 'QA Calendar', slug: 'qa-calendar', availability: [{ day: 1, enabled: true, start: '09:00', end: '17:00' }] }]); });
      await page.getByLabel('Team Member / Provider', { exact: true }).click(); await page.getByRole('option', { name: 'QA Provider', exact: true }).click();
      await tab('Booking'); await advanced('Booking Configuration');
      await page.getByLabel('Workspace calendar', { exact: true }).click(); await page.getByRole('option', { name: 'QA Calendar', exact: true }).click(); await apply();
      await tab('Settings'); await advanced('Product Settings');
      await page.getByLabel('Buffer before (minutes)', { exact: true }).fill('10'); await page.getByLabel('Cancellation notice (hours)', { exact: true }).fill('24'); await apply();
      await tab('Pricing'); await page.getByLabel('Price *', { exact: true }).fill('75');
    }
    await page.getByRole('button', { name: 'Save as Draft', exact: true }).click();
    await page.waitForFunction(() => window.__router.state.location.pathname.endsWith('/edit'));
    const row = await page.evaluate(name => JSON.parse(window.__writes.at(-1).value).find(product => product.name === name), type === 'digital' ? 'QA Digital' : 'QA Service Saved');
    if (type === 'digital') assert.equal(row.config.downloadExpiryHours, 48);
    else { assert.equal(row.config.experience.provider, 'QA Provider'); assert.equal(row.config.calendarId, 'calendar-qa'); assert.equal(row.config.bufferBefore, 10); assert.equal(row.config.cancellationHours, 24); }
  }
}
