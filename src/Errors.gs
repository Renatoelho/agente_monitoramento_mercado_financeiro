/**
 * Errors.gs
 * Exceções tipadas por etapa do fluxo de monitoramento de mercado financeiro.
 * Cada erro carrega `etapa` para facilitar o log e o e-mail de notificação.
 */

/** Erro base do processo. Todas as exceções tipadas herdam desta. */
class AppError extends Error {
  constructor(message, etapa) {
    super(message);
    this.name = this.constructor.name;
    this.etapa = etapa || '';
  }
}

/** Configuração ausente/inválida (aba `config` ou Script Properties). */
class ConfigError extends AppError {
  constructor(message) { super(message, 'config'); }
}

/** Falha ao ler os arquivos de prompt (system/user) no Drive. */
class PromptError extends AppError {
  constructor(message) { super(message, 'ler prompts do drive'); }
}

/** Falha na chamada à API Claude (HTTP, parsing do JSON, resposta truncada). */
class ClaudeApiError extends AppError {
  constructor(message) { super(message, 'chamar api claude'); }
}

/** Falha ao montar/enviar o e-mail de monitoramento. */
class EmailError extends AppError {
  constructor(message) { super(message, 'enviar e-mail'); }
}
