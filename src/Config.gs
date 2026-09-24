/**
 * Config.gs
 * Carrega e valida a configuração em um objeto `cfg` (congelado).
 *
 * Duas fontes (o projeto é um Apps Script VINCULADO a uma planilha):
 *   1. Aba `config` da própria planilha  -> parâmetros NÃO secretos (e-mails, janela,
 *      modelo, IDs dos prompts no Drive...). Layout: coluna A = chave, B = valor,
 *      C = descrição. A aba é criada por `prepararPlanilha()` (Setup.gs).
 *   2. Script Properties                 -> SOMENTE o segredo `ANTHROPIC_API_KEY`
 *      (gravado pelo menu "Configurar API key"; nunca fica na planilha nem no código).
 */

const ABA_CONFIG = 'config';
const PROP_API_KEY = 'ANTHROPIC_API_KEY';

/** Valor de exemplo do e-mail — a execução é bloqueada enquanto não for trocado. */
const EMAIL_MODELO = 'seu-email@exemplo.com';

/**
 * Definição das chaves da aba `config`: valor padrão (texto) e descrição.
 * Usada tanto para criar a aba (Setup.gs) quanto para aplicar defaults ao ler.
 */
const CONFIG_PADRAO = [
  ['EMAILS_NOTIFICACAO', EMAIL_MODELO,
    'Destinatários do relatório, separados por vírgula. OBRIGATÓRIO trocar o e-mail modelo.'],
  ['JANELA_HORAS', '24',
    'Janela de pesquisa de notícias, em horas, contada a partir do momento da execução.'],
  ['MAX_NOTICIAS_RELATORIO', '20',
    'Máximo de notícias no e-mail (as de maior prioridade entram primeiro).'],
  ['HORA_EXECUCAO', '7',
    'Hora do dia (0-23, fuso America/Sao_Paulo) do gatilho diário. Reinstale o gatilho após alterar.'],
  ['ANTHROPIC_MODEL', 'claude-haiku-4-5-20251001',
    'Modelo da API Claude usado na pesquisa e no resumo.'],
  ['ANTHROPIC_VERSION', '2023-06-01',
    'Cabeçalho anthropic-version da Messages API.'],
  ['ANTHROPIC_MAX_TOKENS', '8192',
    'Limite de tokens de saída por chamada. Aumente se a resposta vier truncada.'],
  ['WEB_SEARCH_MAX_USES', '5',
    'Máximo de buscas web que o Claude pode fazer por execução (cada busca tem custo próprio).'],
  ['DRIVE_FILE_ID_PROMPT_SYSTEM', '',
    'ID do arquivo prompt_system.txt no Google Drive (trecho da URL entre /d/ e /view).'],
  ['DRIVE_FILE_ID_PROMPT_USER', '',
    'ID do arquivo prompt_user.txt no Google Drive (trecho da URL entre /d/ e /view).']
];

const Config = (function () {

  /** Chaves da aba `config` que precisam estar preenchidas. */
  const OBRIGATORIAS = [
    'EMAILS_NOTIFICACAO', 'DRIVE_FILE_ID_PROMPT_SYSTEM', 'DRIVE_FILE_ID_PROMPT_USER'
  ];

  /** Carrega o `cfg` (congelado). Lança ConfigError se algo obrigatório faltar. */
  function carregar() {
    const valores = _lerAbaConfig();
    const apiKey = PropertiesService.getScriptProperties().getProperty(PROP_API_KEY);

    const faltantes = OBRIGATORIAS.filter(function (k) { return ehVazio(valores[k]); });
    if (faltantes.length) {
      throw new ConfigError('Chaves sem valor na aba "' + ABA_CONFIG + '": ' + faltantes.join(', '));
    }
    if (ehVazio(apiKey)) {
      throw new ConfigError('ANTHROPIC_API_KEY não configurada. Use o menu "Monitoramento > Configurar API key".');
    }

    const emails = String(valores.EMAILS_NOTIFICACAO)
      .split(',').map(function (e) { return e.trim(); }).filter(function (e) { return !!e; });
    if (!emails.length || emails.indexOf(EMAIL_MODELO) !== -1) {
      throw new ConfigError('EMAILS_NOTIFICACAO ainda contém o e-mail modelo (' + EMAIL_MODELO +
        '). Informe destinatários reais na aba "' + ABA_CONFIG + '".');
    }

    const cfg = {
      // Segredo (Script Properties)
      ANTHROPIC_API_KEY: apiKey,

      // Aba `config`
      EMAILS_NOTIFICACAO:          emails,
      JANELA_HORAS:                paraInt(valores.JANELA_HORAS, 24),
      MAX_NOTICIAS_RELATORIO:      paraInt(valores.MAX_NOTICIAS_RELATORIO, 20),
      HORA_EXECUCAO:               paraInt(valores.HORA_EXECUCAO, 7),
      ANTHROPIC_MODEL:             String(valores.ANTHROPIC_MODEL),
      ANTHROPIC_VERSION:           String(valores.ANTHROPIC_VERSION),
      ANTHROPIC_MAX_TOKENS:        paraInt(valores.ANTHROPIC_MAX_TOKENS, 8192),
      WEB_SEARCH_MAX_USES:         paraInt(valores.WEB_SEARCH_MAX_USES, 5),
      DRIVE_FILE_ID_PROMPT_SYSTEM: String(valores.DRIVE_FILE_ID_PROMPT_SYSTEM).trim(),
      DRIVE_FILE_ID_PROMPT_USER:   String(valores.DRIVE_FILE_ID_PROMPT_USER).trim()
    };

    return Object.freeze(cfg);
  }

  /** Lê a aba `config` como { CHAVE: valor }, aplicando os defaults de CONFIG_PADRAO. */
  function _lerAbaConfig() {
    const planilha = SpreadsheetApp.getActiveSpreadsheet();
    if (!planilha) {
      throw new ConfigError('Este script precisa estar vinculado a uma planilha (container-bound).');
    }
    const aba = planilha.getSheetByName(ABA_CONFIG);
    if (!aba) {
      throw new ConfigError('Aba "' + ABA_CONFIG + '" não encontrada. Use o menu "Monitoramento > Preparar planilha".');
    }

    const valores = {};
    CONFIG_PADRAO.forEach(function (linha) { valores[linha[0]] = linha[1]; });

    const ultimaLinha = aba.getLastRow();
    if (ultimaLinha >= 2) {
      aba.getRange(2, 1, ultimaLinha - 1, 2).getValues().forEach(function (linha) {
        const chave = String(linha[0]).trim();
        if (chave && !ehVazio(linha[1])) valores[chave] = linha[1];
      });
    }
    return valores;
  }

  return { carregar: carregar };
})();
