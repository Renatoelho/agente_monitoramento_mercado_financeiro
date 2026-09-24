/**
 * Setup.gs
 * Criação da aba `config` e gravação do segredo (API key). Executado pelo menu
 * "Monitoramento" (Menu.gs) ou diretamente no editor do Apps Script.
 */

/**
 * Cria (ou completa) a aba `config` na planilha do SPREADSHEET_ID (src/Ids.gs) já com
 * TODOS os parâmetros para preenchimento. É idempotente: NUNCA sobrescreve valores
 * que você já editou — só adiciona chaves que faltam.
 * Rode uma vez no editor do Apps Script (selecionar a função > Executar).
 */
function criarAbaConfig() {
  const planilha = abrirPlanilha();
  let aba = planilha.getSheetByName(ABA_CONFIG);
  const nova = !aba;

  if (nova) {
    aba = planilha.getSheets().length === 1 && planilha.getSheets()[0].getLastRow() === 0
      ? planilha.getSheets()[0].setName(ABA_CONFIG)     // aproveita a aba vazia padrão
      : planilha.insertSheet(ABA_CONFIG);
    aba.getRange(1, 1, 1, 3).setValues([['chave', 'valor', 'descricao']])
      .setFontWeight('bold').setBackground('#0b3d91').setFontColor('#ffffff');
    aba.setFrozenRows(1);
  }

  // Coluna de valores como texto puro: evita o Sheets converter "24" em número,
  // IDs em notação científica etc.
  aba.getRange('B2:B200').setNumberFormat('@');

  const existentes = {};
  const ultimaLinha = aba.getLastRow();
  if (ultimaLinha >= 2) {
    aba.getRange(2, 1, ultimaLinha - 1, 1).getValues().forEach(function (l) {
      existentes[String(l[0]).trim()] = true;
    });
  }

  const novasLinhas = CONFIG_PADRAO.filter(function (l) { return !existentes[l[0]]; });
  if (novasLinhas.length) {
    aba.getRange(aba.getLastRow() + 1, 1, novasLinhas.length, 3).setValues(novasLinhas);
  }

  aba.setColumnWidth(1, 260);
  aba.setColumnWidth(2, 320);
  aba.setColumnWidth(3, 620);
  aba.getRange('A2:A200').setFontWeight('bold');
  aba.getRange('C2:C200').setFontColor('#6b7280');

  console.log('✅ Aba "' + ABA_CONFIG + '" ' + (nova ? 'criada' : 'atualizada') + ' — ' +
    novasLinhas.length + ' chave(s) adicionada(s).');
  return { criada: nova, chavesAdicionadas: novasLinhas.length };
}

/** Grava a API key da Anthropic nas Script Properties (não fica na planilha nem no código). */
function salvarApiKey(chave) {
  const valor = String(chave || '').trim();
  if (valor.length < 20) throw new ConfigError('API key inválida (curta demais).');
  PropertiesService.getScriptProperties().setProperty(PROP_API_KEY, valor);
  console.log('✅ ANTHROPIC_API_KEY gravada nas Script Properties (' + _mascarar(valor) + ').');
}

/** Lista a configuração efetiva no console (a API key aparece mascarada). */
function listarConfiguracao() {
  const apiKey = PropertiesService.getScriptProperties().getProperty(PROP_API_KEY);
  console.log('ANTHROPIC_API_KEY = ' + (apiKey ? _mascarar(apiKey) : '(NÃO configurada)'));
  const aba = abrirPlanilha().getSheetByName(ABA_CONFIG);
  if (!aba) { console.log('Aba "' + ABA_CONFIG + '" não existe — rode criarAbaConfig().'); return; }
  aba.getRange(2, 1, Math.max(aba.getLastRow() - 1, 1), 2).getValues().forEach(function (l) {
    if (!ehVazio(l[0])) console.log(l[0] + ' = ' + l[1]);
  });
}

function _mascarar(valor) {
  if (!valor || valor.length < 12) return '(vazio)';
  return valor.substring(0, 8) + '...' + valor.substring(valor.length - 4);
}
