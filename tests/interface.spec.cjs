const { test: base, expect } = require('@playwright/test');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const STORAGE_KEY = 'simulador-roteador-desafios';
const SENHA_FICTICIA = 'Turma-Ficticia-Rede-42';
const TITULOS = [
  'Mais alcance na rede 2,4 GHz',
  'Escolha o canal com menos interferência',
  '2,4 GHz ou 5 GHz?',
  'Encontre a configuração insegura',
  'Priorize as aulas on-line',
  'Interprete o log de eventos',
];

// Cada teste usa um contexto novo; nenhum teste depende da ordem da suíte.
// A rede da página é limitada ao servidor local/arquivo de laboratório.
const test = base.extend({
  errosJavaScript: [async ({ page }, use) => {
    const errors = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await use(errors);
    expect(errors, 'A página não deve gerar erros JavaScript não tratados').toEqual([]);
  }, { auto: true }],
  trafegoExterno: [async ({ page }, use) => {
    const external = [];
    await page.route('**/*', async (route) => {
      const url = new URL(route.request().url());
      if (url.origin === 'http://127.0.0.1:4173' || url.protocol === 'file:' || url.protocol === 'data:') {
        await route.continue();
      } else {
        external.push(url.href);
        await route.abort();
      }
    });
    await use(external);
    expect(external, 'Nenhuma requisição da atividade deve sair do laboratório').toEqual([]);
  }, { auto: true }],
});

async function menu(page, panel) {
  await page.locator(`#tab-${panel}`).click();
  await expect(page.locator(`#${panel}`)).toBeVisible();
}

async function desafio(page, number) {
  await page.locator('#ch-tabs button').nth(number - 1).click();
  await expect(page.locator('.ch-title')).toHaveText(TITULOS[number - 1]);
}

async function salvar(page, panel) {
  await page.locator(`#${panel}`).getByRole('button', { name: 'Salvar', exact: true }).click();
  await expect(page.locator('#alert-msg')).toHaveClass('alert');
  await expect(page.locator('#alert-msg')).toContainText('Nenhum equipamento real foi alterado');
}

async function verificar(page, correct) {
  await page.getByRole('button', { name: 'Verificar', exact: true }).click();
  await expect(page.locator('#feedback')).toHaveClass(correct ? 'feedback ok' : 'feedback no');
}

async function alcance(page) {
  await menu(page, 'wifi24');
  await page.locator('#w24-enable').check();
  await page.locator('#w24-width').selectOption('20');
  await page.locator('#w24-power').selectOption('alta');
  await salvar(page, 'wifi24');
  await verificar(page, true);
}

async function responderFaixas(page, text = 'A faixa de 2,4 GHz atende melhor distâncias e obstáculos; 5 GHz oferece mais canais e velocidade perto do roteador.') {
  for (const [name, value] of [['b1', '24'], ['b2', '5'], ['b3', '24'], ['b4', '5'], ['b5', '24']]) {
    await page.locator(`input[name="${name}"][value="${value}"]`).check();
  }
  await page.locator('#bands-text').fill(text);
}

async function seguranca(page, prefix, panel) {
  await menu(page, panel);
  await page.locator(`#${prefix}-sec`).selectOption('wpa2-aes');
  await page.locator(`#${prefix}-pass`).fill(SENHA_FICTICIA);
  if (prefix === 'w24') await page.locator('#w24-wps').uncheck();
  await salvar(page, panel);
}

async function configurarQos(page, download = '90000', upload = '18000') {
  await menu(page, 'qos');
  await page.locator('#enableQos').check();
  await page.locator('#qos-down').fill(download);
  await page.locator('#qos-up').fill(upload);
  await page.locator('#qos-prio').selectOption('video');
  await salvar(page, 'qos');
}

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Simulador educacional de roteador', exact: true })).toBeVisible();
});

test('abre a atividade, navega pelos painéis e mostra seis desafios sem progresso prévio', async ({ page }) => {
  await expect(page.locator('.sim-notice')).toContainText('não é um roteador real');
  await expect(page.locator('#ch-tabs button')).toHaveCount(6);
  await expect(page.locator('#progress-text')).toHaveText('0 de 6 concluídos');
  for (const panel of ['status', 'wifi24', 'wifi5', 'qos', 'system', 'inicio']) await menu(page, panel);
  await menu(page, 'status');
  await expect(page.locator('#status')).toContainText('100 Mbps de download / 20 Mbps de upload');
  await menu(page, 'system');
  await expect(page.locator('pre.log')).toContainText('WAN: conexão estável');
});

for (const [index, message] of [
  [0, 'A largura do canal está em 40 MHz'],
  [1, 'O canal 6 tem 4 redes vizinhas'],
  [2, 'Falta responder'],
  [3, 'WEP'],
  [4, 'O QoS está desligado'],
  [5, 'Responda à pergunta 1'],
]) {
  test(`desafio ${index + 1}: resposta inicial incompleta recebe feedback e não marca conclusão`, async ({ page }) => {
    await desafio(page, index + 1);
    await verificar(page, false);
    await expect(page.locator('#feedback')).toContainText(message);
    await expect(page.locator('#progress-text')).toHaveText('0 de 6 concluídos');
  });
}

test('alterações não salvas não substituem a configuração verificada; repetir acerto não duplica progresso', async ({ page }) => {
  await menu(page, 'wifi24');
  await page.locator('#w24-width').selectOption('20');
  await page.locator('#w24-power').selectOption('alta');
  await verificar(page, false);
  await expect(page.locator('#feedback')).toContainText('alterações não salvas');
  await expect(page.locator('#feedback')).toContainText('40 MHz');
  await salvar(page, 'wifi24');
  await verificar(page, true);
  await verificar(page, true);
  await expect(page.locator('#progress-text')).toHaveText('1 de 6 concluídos');
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), STORAGE_KEY)).toEqual([0]);
});

test('conclui os seis desafios pelo fluxo real de Salvar, Verificar e Próximo desafio', async ({ page }) => {
  await alcance(page);
  await page.getByRole('button', { name: 'Próximo desafio', exact: true }).click();
  await expect(page.locator('.ch-title')).toHaveText(TITULOS[1]);
  await menu(page, 'status');
  await expect(page.locator('#status')).toContainText('-86 dBm');
  await menu(page, 'wifi24');
  await page.locator('#w24-channel').selectOption('11');
  await salvar(page, 'wifi24');
  await verificar(page, true);
  await page.getByRole('button', { name: 'Próximo desafio', exact: true }).click();
  await responderFaixas(page);
  await verificar(page, true);
  await page.getByRole('button', { name: 'Próximo desafio', exact: true }).click();
  await seguranca(page, 'w24', 'wifi24');
  await seguranca(page, 'w5', 'wifi5');
  await verificar(page, true);
  await page.getByRole('button', { name: 'Próximo desafio', exact: true }).click();
  await configurarQos(page);
  await verificar(page, true);
  await page.getByRole('button', { name: 'Próximo desafio', exact: true }).click();
  await menu(page, 'system');
  await page.locator('input[name="log1"][value="b"]').check();
  await page.locator('input[name="log2"][value="c"]').check();
  await verificar(page, true);
  await expect(page.locator('#feedback')).toContainText('Você concluiu todos os desafios');
  await expect(page.locator('#progress-text')).toHaveText('6 de 6 concluídos');
  await expect(page.getByRole('button', { name: 'Próximo desafio', exact: true })).toHaveCount(0);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), STORAGE_KEY)).toEqual([0, 1, 2, 3, 4, 5]);
});

test('SSID e senha inválidos não são salvos nem sobrescrevem a configuração aceita', async ({ page }) => {
  await alcance(page);
  await page.locator('#w24-width').selectOption('40');
  for (const [field, value, expected] of [
    ['w24-ssid', '', 'Preencha o campo'],
    ['w24-ssid', 'x'.repeat(33), 'máximo 32 caracteres'],
    ['w24-pass', 'curta', '8 a 63 caracteres'],
    ['w24-pass', 'x'.repeat(64), '8 a 63 caracteres'],
  ]) {
    await page.locator('#w24-ssid').fill('Rede-Ficticia');
    await page.locator('#w24-pass').fill(SENHA_FICTICIA);
    await page.locator(`#${field}`).fill(value);
    await page.locator('#wifi24').getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(page.locator('#alert-msg')).toHaveClass('alert error');
    await expect(page.locator('#alert-msg')).toContainText(expected);
    await verificar(page, true);
    await expect(page.locator('#feedback')).toContainText('alterações não salvas');
  }
  await expect(page.locator('#progress-text')).toHaveText('1 de 6 concluídos');
});

test('QoS rejeita texto/decimais no salvamento e banda acima do plano na verificação', async ({ page }) => {
  await desafio(page, 5);
  await menu(page, 'qos');
  await page.locator('#enableQos').check();
  for (const value of ['100 Mbps', '90.5', '-100']) {
    await page.locator('#qos-down').fill(value);
    await page.locator('#qos').getByRole('button', { name: 'Salvar', exact: true }).click();
    await expect(page.locator('#alert-msg')).toHaveClass('alert error');
    await expect(page.locator('#alert-msg')).toContainText('números inteiros');
  }
  await configurarQos(page, '200000', '50000');
  await verificar(page, false);
  await expect(page.locator('#feedback')).toContainText('100 Mbps = 100000 Kbps');
  await expect(page.locator('#feedback')).toContainText('20 Mbps = 20000 Kbps');
  await configurarQos(page);
  await verificar(page, true);
});

test('segurança precisa estar corrigida nas duas faixas, não apenas na 2,4 GHz', async ({ page }) => {
  await desafio(page, 4);
  await menu(page, 'wifi5');
  await page.locator('#w5-sec').selectOption('wep');
  await salvar(page, 'wifi5');
  await seguranca(page, 'w24', 'wifi24');
  await verificar(page, false);
  await expect(page.locator('#feedback')).toContainText('rede 5 GHz usa WEP');
  await seguranca(page, 'w5', 'wifi5');
  await verificar(page, true);
});

test('explicação livre é limitada a 40 caracteres mínimos, não a correção semântica', async ({ page }) => {
  await desafio(page, 3);
  await responderFaixas(page, 'x'.repeat(39));
  await verificar(page, false);
  await expect(page.locator('#feedback')).toContainText('40 caracteres');
  await page.locator('#bands-text').fill('x'.repeat(40));
  await verificar(page, true);
  await expect(page.locator('#feedback')).toContainText('Compare sua explicação');
});

test('recarregar preserva apenas marcações, não configurações ou respostas', async ({ page }) => {
  await alcance(page);
  await desafio(page, 3);
  await responderFaixas(page);
  await verificar(page, true);
  await page.reload();
  await expect(page.locator('#progress-text')).toHaveText('2 de 6 concluídos');
  await menu(page, 'wifi24');
  await expect(page.locator('#w24-width')).toHaveValue('40');
  await expect(page.locator('#w24-power')).toHaveValue('media');
  await desafio(page, 3);
  await expect(page.locator('#bands-text')).toHaveValue('');
  await expect(page.locator('input[name="b1"][value="24"]')).not.toBeChecked();
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), STORAGE_KEY)).toEqual([0, 2]);
});

test('Recomeçar tudo respeita cancelamento e confirmação', async ({ page }) => {
  await alcance(page);
  page.once('dialog', (dialog) => dialog.dismiss());
  await page.getByRole('button', { name: 'Recomeçar tudo', exact: true }).click();
  await expect(page.locator('#progress-text')).toHaveText('1 de 6 concluídos');
  page.once('dialog', (dialog) => dialog.accept());
  await page.getByRole('button', { name: 'Recomeçar tudo', exact: true }).click();
  await expect(page.locator('#progress-text')).toHaveText('0 de 6 concluídos');
  await menu(page, 'wifi24');
  await expect(page.locator('#w24-width')).toHaveValue('40');
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), STORAGE_KEY)).toEqual([]);
});

test('menu e Verificar podem ser ativados por teclado', async ({ page }) => {
  await page.locator('#tab-wifi24').focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#wifi24')).toBeVisible();
  await page.keyboard.press('Tab');
  await expect(page.locator('#tab-wifi5')).toBeFocused();
  await page.keyboard.press('Space');
  await expect(page.locator('#wifi5')).toBeVisible();
  const button = page.getByRole('button', { name: 'Verificar', exact: true });
  await button.focus();
  await page.keyboard.press('Enter');
  await expect(page.locator('#feedback')).toHaveClass('feedback no');
});

test('continua funcionando quando o armazenamento local é bloqueado', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', { configurable: true, get() { throw new Error('Bloqueio fictício para teste'); } });
  });
  await page.reload();
  await alcance(page);
  await expect(page.locator('#progress-text')).toHaveText('1 de 6 concluídos');
  await page.reload();
  await expect(page.locator('#progress-text')).toHaveText('0 de 6 concluídos');
});

test('JSON malformado no progresso não derruba a interface', async ({ page }) => {
  await page.evaluate((key) => localStorage.setItem(key, '{incompleto'), STORAGE_KEY);
  await page.reload();
  await expect(page.locator('#progress-text')).toHaveText('0 de 6 concluídos');
  await alcance(page);
  expect(await page.evaluate((key) => JSON.parse(localStorage.getItem(key)), STORAGE_KEY)).toEqual([0]);
});

test('HTML baixado pode abrir e verificar um desafio com o navegador offline', async ({ page, context }) => {
  await context.setOffline(true);
  await page.goto(pathToFileURL(path.join(__dirname, '..', 'index.html')).href);
  await expect(page.locator('#progress-text')).toHaveText('0 de 6 concluídos');
  await alcance(page);
  await expect(page.locator('#progress-text')).toHaveText('1 de 6 concluídos');
});
