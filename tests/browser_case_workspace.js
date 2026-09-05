async (page) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  const check = (value, label) => { if (!value) throw new Error(label); };
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('http://127.0.0.1:8876/#home');
  await page.reload();
  for (const label of ['지급정지 소명 시작', '지급정지 소명 준비', '소명 준비 시작하기']) {
    await page.getByRole('button', { name: label, exact: true }).click();
    check(page.url().endsWith('#s00'), 'Home must open Frozen start, not dashboard: ' + label);
    await page.goto('http://127.0.0.1:8876/#home');
  }
  await page.getByRole('button', { name: '소명 준비 시작하기', exact: true }).click();
  await page.getByRole('button', { name: '사건 A로 체험 시작', exact: true }).click();
  await page.getByRole('button', { name: '직접 입력', exact: true }).click();
  await page.locator('#message').fill('금융감독원입니다. 지금 안전계좌로 이체하세요. 누구에게도 말하지 마세요.');
  await page.getByRole('button', { name: '입력 내용 분석', exact: true }).click();
  await page.waitForURL(/#g02\//);
  check(!(await page.locator('body').innerText()).includes('500,000'), 'Gate must not show unrelated fixed evidence');
  await page.getByRole('button', { name: '자료 정리 범위 확인', exact: true }).click();
  await page.getByRole('button', { name: '위 규칙에 동의하고 사건 생성', exact: true }).click();
  check(page.url().endsWith('#g03'), 'Consent must be checked');
  for (const box of await page.getByRole('checkbox').all()) await box.check();
  await page.getByRole('button', { name: '위 규칙에 동의하고 사건 생성', exact: true }).click();
  await page.getByRole('button', { name: '자료 상태 확인', exact: true }).click();
  await page.getByRole('button', { name: '합성 예시 3건 추가', exact: true }).click();
  check(await page.locator('.record-source-button').count() === 4, 'Gate original plus three demo records');
  await page.locator('.record-source-button').filter({ hasText: '중고 물품 주문' }).click();
  const original = await page.locator('.record-original').innerText();
  await page.getByLabel('내가 확인한 내용', { exact: true }).fill('UI 검증: 원문 주문 ID를 대조했습니다. <script>금지</script>');
  await page.getByRole('combobox', { name: '확인 상태', exact: true }).selectOption('confirmed');
  await page.getByLabel('확인 메모 / 수정 이유', { exact: true }).fill('수정 이력 검증용 합성 메모');
  await page.getByRole('button', { name: '확인 내용 반영', exact: true }).click();
  check(await page.locator('.record-original').innerText() === original, 'Review must preserve original');
  await page.getByRole('button', { name: '거래 연결', exact: true }).click();
  check((await page.locator('.record-issue').allTextContents()).some(t => /금액|불일치/.test(t)), 'Linked amount discrepancy visible');
  await page.getByRole('button', { name: '타임라인', exact: true }).click();
  check((await page.locator('.record-history-row').innerText()).includes('수정 후:'), 'Real review history visible');
  await page.getByRole('button', { name: '보고서', exact: true }).click();
  const reportFrame = page.frameLocator('.record-report-preview');
  check((await reportFrame.locator('body').innerText()).includes('UI 검증'), 'Preview includes edited state');
  check(await reportFrame.locator('script').count() === 0, 'Report does not execute source content');
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'HTML 내려받기', exact: true }).click();
  const download = await downloadEvent;
  await download.saveAs('/Users/seok/Documents/daycon/finguard/output/playwright/frozen-reviewed.html');
  const orderBox = page.locator('.record-include-row').filter({ hasText: '중고 물품 주문' }).getByRole('checkbox');
  await orderBox.uncheck();
  check(!(await page.frameLocator('.record-report-preview').locator('body').innerText()).includes('UI 검증'), 'Excluded source review and history must not leak');
  await page.getByRole('button', { name: '자료 보완', exact: true }).click();
  await page.getByLabel('자료 이름', { exact: true }).fill('유지되어야 하는 미완성 입력');
  await page.getByRole('button', { name: '개요', exact: true }).click();
  await page.getByRole('button', { name: '자료 보완', exact: true }).click();
  check(await page.getByLabel('자료 이름', { exact: true }).inputValue() === '유지되어야 하는 미완성 입력', 'Draft survives menu navigation');
  await page.getByLabel('자료 이름', { exact: true }).fill('');
  await page.getByRole('button', { name: 'FinGuard 홈', exact: true }).first().click();
  await page.getByRole('button', { name: '불법 추심 대응 보기', exact: true }).click();
  await page.getByRole('button', { name: '연락 한 건 기록하기', exact: true }).click();
  check(page.url().endsWith('#shield-workspace/s02'), 'Shield has its own workspace');
  await page.getByRole('button', { name: '합성 예시 3건 추가', exact: true }).click();
  check(await page.locator('.record-source-button').count() === 3, 'Shield records isolated from Frozen');
  await page.locator('.record-source-button').filter({ hasText: '제삼자 언급' }).click();
  check((await page.locator('.record-signals').innerText()).includes('가족'), 'Shield signals grounded in actual source');
  for (const label of ['개요', '연락 기록', '위험 신호', '증거 보관', '이슈 검토', '타임라인', '상담 준비', '자료 보완']) {
    await page.getByRole('button', { name: label, exact: true }).click();
    check(await page.locator('.record-workspace').count() === 1, 'Optional Shield view renders: ' + label);
  }
  await page.getByRole('button', { name: '위험 신호', exact: true }).click();
  await page.screenshot({ path: '/Users/seok/Documents/daycon/finguard/output/playwright/shield-desktop-review.png', fullPage: true });
  const widths = [1440, 1024, 768, 390, 320];
  for (const width of widths) {
    await page.setViewportSize({ width, height: 900 });
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
    check(!overflow, 'No horizontal overflow at ' + width);
  }
  await page.screenshot({ path: '/Users/seok/Documents/daycon/finguard/output/playwright/shield-mobile-review.png', fullPage: true });
  await page.setViewportSize({ width: 1440, height: 1000 });
  check(errors.length === 0, 'No page errors: ' + errors.join('; '));
  return { passed: true, homeEntries: 3, shieldViews: 8, viewportWidths: widths, errors, download: download.suggestedFilename() };
}
