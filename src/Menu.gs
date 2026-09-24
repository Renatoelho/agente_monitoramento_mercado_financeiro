/**
 * Menu.gs
 * Menu "Monitoramento" na barra da planilha (simple trigger `onOpen`, dispara
 * sozinho ao abrir a planilha — não precisa de instalação nem de autorização).
 * As funções `menu*` só fazem a ponte com a UI (alertas/prompts); a lógica de
 * negócio fica nos demais arquivos e também roda sem UI (gatilho diário).
 */

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Monitoramento')
    .addItem('1. Criar aba config', 'menuCriarAbaConfig')
    .addItem('2. Configurar API key da Anthropic', 'menuConfigurarApiKey')
    .addItem('3. Instalar gatilho diário', 'menuInstalarGatilho')
    .addSeparator()
    .addItem('Executar agora (teste)', 'menuExecutarAgora')
    .addItem('Validar configuração', 'menuValidarConfiguracao')
    .addSeparator()
    .addItem('Remover gatilho diário', 'menuRemoverGatilho')
    .addToUi();
}

function menuCriarAbaConfig() {
  const r = criarAbaConfig();
  SpreadsheetApp.getUi().alert('Aba config',
    (r.criada ? 'Aba "config" criada. ' : 'Aba "config" já existia. ') +
    r.chavesAdicionadas + ' chave(s) adicionada(s).\n\nPreencha os e-mails e os IDs dos prompts do Drive na aba.',
    SpreadsheetApp.getUi().ButtonSet.OK);
}

function menuConfigurarApiKey() {
  const ui = SpreadsheetApp.getUi();
  const resp = ui.prompt('API key da Anthropic',
    'Cole a chave (sk-ant-...). Ela será gravada nas Script Properties, não na planilha.',
    ui.ButtonSet.OK_CANCEL);
  if (resp.getSelectedButton() !== ui.Button.OK) return;
  try {
    salvarApiKey(resp.getResponseText());
    ui.alert('API key gravada com sucesso.');
  } catch (err) {
    ui.alert('Falha ao gravar a API key: ' + err.message);
  }
}

function menuInstalarGatilho() {
  const ui = SpreadsheetApp.getUi();
  try {
    const hora = instalarGatilhoDiario();
    ui.alert('Gatilho instalado', 'monitorarMercadoFinanceiro roda todos os dias por volta das ' +
      hora + 'h (janela de até 1h, fuso America/Sao_Paulo).', ui.ButtonSet.OK);
  } catch (err) {
    ui.alert('Falha ao instalar o gatilho: ' + err.message);
  }
}

function menuRemoverGatilho() {
  removerGatilhoDiario();
  SpreadsheetApp.getUi().alert('Gatilho diário removido (se existia).');
}

function menuValidarConfiguracao() {
  const ui = SpreadsheetApp.getUi();
  try {
    const cfg = Config.carregar();
    ui.alert('Configuração válida',
      'Modelo: ' + cfg.ANTHROPIC_MODEL + '\nJanela: ' + cfg.JANELA_HORAS + 'h\n' +
      'Buscas web (máx.): ' + cfg.WEB_SEARCH_MAX_USES + '\nDestinatários: ' + cfg.EMAILS_NOTIFICACAO.join(', '),
      ui.ButtonSet.OK);
  } catch (err) {
    ui.alert('Configuração inválida', err.message, ui.ButtonSet.OK);
  }
}

function menuExecutarAgora() {
  const ui = SpreadsheetApp.getUi();
  const conf = ui.alert('Executar agora',
    'Isso chama a API Claude (gera custo) e envia o e-mail aos destinatários. Pode levar 1–3 minutos. Continuar?',
    ui.ButtonSet.YES_NO);
  if (conf !== ui.Button.YES) return;

  const r = monitorarMercadoFinanceiro();
  ui.alert(r.ok
    ? 'Concluído: ' + r.noticias + ' notícia(s), e-mail enviado.'
    : 'Falhou: ' + r.erro + '\n\nDetalhes em Extensões > Apps Script > Execuções.');
}
