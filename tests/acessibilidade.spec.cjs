const { test, expect } = require('@playwright/test');
const AxeBuilder = require('@axe-core/playwright').default;

const TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function scan(page, testInfo, state, collected) {
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  await testInfo.attach(`axe-${state}`, { body: JSON.stringify({ state, violations: results.violations, incomplete: results.incomplete }, null, 2), contentType: 'application/json' });
  for (const violation of results.violations) collected.push({ state, id: violation.id, targets: violation.nodes.map((node) => node.target) });
}

async function validFirstChallenge(page) {
  await page.locator('#tab-wifi24').click();
  await page.locator('#w24-width').selectOption('20');
  await page.locator('#w24-power').selectOption('alta');
  await page.locator('#wifi24 .save-btn').click();
}

test.beforeEach(async ({ page }) => { await page.goto('/'); });

test('axe: seis painéis visíveis e campos de QoS habilitados sem violações detectadas A/AA', async ({ page }, testInfo) => {
  test.setTimeout(90000);
  const violations = [];
  for (const panel of ['inicio', 'status', 'wifi24', 'wifi5', 'qos', 'system']) {
    await page.locator('#tab-' + panel).click();
    if (panel === 'qos') await page.locator('#enableQos').check();
    await scan(page, testInfo, panel, violations);
  }
  expect(violations).toEqual([]);
});

test('axe: seis desafios, dicas abertas e feedbacks de erro/acerto sem violações detectadas A/AA', async ({ page }, testInfo) => {
  test.setTimeout(90000);
  const violations = [];
  for (let i = 0; i < 6; i++) {
    await page.locator('#ch-tabs button').nth(i).click();
    await page.locator('.hint summary').click();
    await page.getByRole('button', { name: 'Verificar', exact: true }).click();
    await scan(page, testInfo, 'desafio-' + (i + 1) + '-erro', violations);
  }
  await page.locator('#ch-tabs button').first().click();
  await validFirstChallenge(page);
  await page.getByRole('button', { name: 'Verificar', exact: true }).click();
  await scan(page, testInfo, 'desafio-1-acerto', violations);
  expect(violations).toEqual([]);
});

for (const [name, target, tabs] of [
  ['Pular para configurações', '#painel-atual', 1],
  ['Pular para desafios', '#ch-heading', 2],
]) {
  test(`atalhos de salto: ${name} recebe foco e conduz ao destino`, async ({ page }) => {
    for (let i = 0; i < tabs; i++) await page.keyboard.press('Tab');
    await expect(page.getByRole('link', { name, exact: true })).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator(target)).toBeFocused();
    await expect(page.locator(target)).toBeInViewport();
    if (target === '#ch-heading') {
      await page.keyboard.press('Tab');
      await expect(page.locator('#ch-tabs button').first()).toBeFocused();
    }
  });
}

test('menu anuncia painel ativo, mantém o foco e usa Tab, Enter e Espaço', async ({ page }) => {
  await page.locator('#tab-wifi24').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#tab-wifi24')).toBeFocused();
  await expect(page.locator('#tab-wifi24')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('#tab-inicio')).toHaveAttribute('aria-pressed', 'false');
  await expect(page.locator('#tab-wifi24')).toHaveAttribute('aria-controls', 'wifi24');
  await page.keyboard.press('Tab');
  await expect(page.locator('#tab-wifi5')).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.locator('#wifi5')).toBeVisible();
  await expect(page.locator('#interaction-status')).toContainText('Configurações Wireless - 5GHz');
});

test('botões de desafio não perdem foco quando o conteúdo e a marcação são atualizados', async ({ page }) => {
  const second = page.locator('#ch-tabs button').nth(1);
  await second.focus();
  await page.keyboard.press('Enter');
  await expect(second).toBeFocused();
  await expect(second).toHaveAttribute('aria-current', 'step');
  await expect(page.locator('#interaction-status')).toContainText('Desafio 2');
  await page.keyboard.press('Tab');
  await expect(page.locator('#ch-tabs button').nth(2)).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.locator('#ch-tabs button').nth(2)).toBeFocused();
  await expect(page.locator('.ch-title')).toHaveText('2,4 GHz ou 5 GHz?');
});

test('feedback fica identificado em região estável, sem roubar o foco de Verificar', async ({ page }) => {
  const verify = page.getByRole('button', { name: 'Verificar', exact: true });
  await verify.focus();
  await page.keyboard.press('Enter');
  await expect(verify).toBeFocused();
  await expect(page.locator('#interaction-status')).toHaveAttribute('role', 'status');
  await expect(page.locator('#interaction-status')).toHaveAttribute('aria-live', 'polite');
  await expect(page.locator('#interaction-status')).toHaveAttribute('aria-atomic', 'true');
  await expect(page.locator('#interaction-status')).toContainText('Ainda não');
  await expect(verify).toHaveAttribute('aria-controls', 'feedback');
  await validFirstChallenge(page);
  await verify.focus();
  await page.keyboard.press('Enter');
  await expect(verify).toBeFocused();
  await expect(page.locator('#interaction-status')).toContainText('Certo');
  await expect(page.locator('#progress-text')).toHaveText('1 de 6 concluídos');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Próximo desafio', exact: true })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('#ch-title')).toBeFocused();
  await expect(page.locator('#ch-title')).toHaveText('Escolha o canal com menos interferência');
  await expect(page.locator('#ch-title')).toBeInViewport();
});

test('erro de campo recebe foco e descrição, depois é limpo; confirmação não desaparece por temporizador', async ({ page }) => {
  await page.clock.install();
  await page.locator('#tab-wifi24').click();
  await page.locator('#w24-ssid').fill('');
  await page.locator('#wifi24 .save-btn').click();
  await expect(page.locator('#w24-ssid')).toBeFocused();
  await expect(page.locator('#w24-ssid')).toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#w24-ssid')).toHaveAttribute('aria-describedby', 'alert-msg');
  await expect(page.locator('#alert-msg')).toContainText('Preencha o campo');
  await page.locator('#w24-ssid').fill('Rede-Ficticia');
  await page.locator('#wifi24 .save-btn').click();
  await expect(page.locator('#w24-ssid')).not.toHaveAttribute('aria-invalid', 'true');
  await expect(page.locator('#w24-ssid')).not.toHaveAttribute('aria-describedby', 'alert-msg');
  await page.clock.fastForward(5000);
  await expect(page.locator('#alert-msg')).toBeVisible();
  await expect(page.locator('#alert-msg')).toContainText('Configurações aplicadas');
});

test('foco customizado é visível em botões, campos, links, dica e log', async ({ page }) => {
  const selectors = ['#tab-wifi24', '#w24-ssid', '#w24-channel', '#w24-enable', '#wifi24 .save-btn', '#ch-tabs button', '.hint summary', '.check-btn', '.link-btn', '#inicio a', 'pre.log'];
  for (const selector of selectors) {
    if (selector.startsWith('pre')) await page.locator('#tab-system').click();
    else if (selector.startsWith('#inicio')) await page.locator('#tab-inicio').click();
    else await page.locator('#tab-wifi24').click();
    const element = page.locator(selector).first();
    await element.focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await expect(element).toBeFocused();
    const style = await element.evaluate((el) => {
      const css = getComputedStyle(el);
      return { style: css.outlineStyle, width: parseFloat(css.outlineWidth) };
    });
    expect(style.style, selector).toBe('solid');
    expect(style.width, selector).toBeGreaterThanOrEqual(3);
  }
});

test('tela de 320px e preferência de movimento reduzido mantêm a atividade utilizável', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const panel of ['inicio', 'status', 'wifi24', 'wifi5', 'qos', 'system']) {
    await page.locator('#tab-' + panel).click();
    if (panel === 'qos') await page.locator('#enableQos').check();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  }
  await page.locator('#ch-tabs button').nth(2).click();
  await expect(page.locator('#bands-text')).toBeVisible();
  expect(await page.locator('.progress span').evaluate((el) => getComputedStyle(el).transitionDuration)).toBe('0s');
});
