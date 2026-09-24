/**
 * Orchestrator.gs
 * Entrypoint e coordenação do fluxo de monitoramento de mercado financeiro.
 *
 * Executado 1x ao dia (via Triggers.gs) ou manualmente (menu da planilha),
 * pesquisando as últimas `cfg.JANELA_HORAS` horas (default 24).
 *
 * E-mail é enviado em TODOS os casos de término (sucesso com notícias, sucesso
 * sem notícias, ou erro em qualquer etapa) — só o assunto/corpo mudam.
 */

const Orchestrator = (function () {

  /**
   * Ponto de entrada — trata config e e-mail de erro.
   * Nome diferente do wrapper global de propósito: o seletor de triggers do Apps
   * Script ignora escopo de closure e avisaria de "função duplicada".
   */
  function executar() {
    let cfg;
    try {
      cfg = Config.carregar();
      console.log('[INÍCIO] monitorarMercadoFinanceiro (janela=' + cfg.JANELA_HORAS + 'h, modelo=' + cfg.ANTHROPIC_MODEL + ')');
    } catch (err) {
      // Sem cfg não há EMAILS_NOTIFICACAO para notificar — só resta logar.
      console.error('[FALHA] (config) ' + err.message);
      return { ok: false, erro: err.message };
    }

    try {
      return _executar(cfg);
    } catch (err) {
      const etapa = err.etapa ? '(' + err.etapa + ') ' : '';
      const mensagem = etapa + err.message;
      console.error('[FALHA] ' + mensagem);

      _notificarErro(cfg, mensagem);
      return { ok: false, erro: mensagem };
    }
  }

  /** Corpo do fluxo — qualquer exceção lançada aqui sobe para o catch acima. */
  function _executar(cfg) {
    const prompts = PromptBuilder.montar(cfg);

    const { resultado, meta } = ClaudeClient.pesquisarNoticias(cfg, prompts);
    console.log('[noticias] ' + resultado.noticias.length + ' notícia(s) retornada(s) pelo Claude.');

    const assunto = EmailBuilder.montarAssuntoSucesso();
    let corpo;
    if (!resultado.noticias.length) {
      corpo = EmailBuilder.montarCorpoSemNoticias(cfg, resultado);
      console.warn('[email] Nenhuma notícia encontrada — enviando e-mail informativo. buscas feitas=' +
        meta.buscasFeitas + ', com erro=' + meta.buscasComErro +
        ', resumo_geral do modelo: ' + (resultado.resumo_geral || '(vazio)'));
    } else {
      corpo = EmailBuilder.montarCorpoHtml(cfg, resultado);
    }

    Notifier.enviar(cfg, assunto, corpo);

    console.log('[FIM] monitorarMercadoFinanceiro — ' + resultado.noticias.length +
      ' notícia(s), e-mail enviado. tokens in/out=' + meta.tokensInput + '/' + meta.tokensOutput +
      ', duracao_ms=' + meta.duracaoMs);
    return { ok: true, noticias: resultado.noticias.length };
  }

  /** E-mail de erro. Falha no envio só é logada (não relança — já estamos no catch geral). */
  function _notificarErro(cfg, mensagemErro) {
    try {
      Notifier.enviar(cfg, EmailBuilder.montarAssuntoErro(), EmailBuilder.montarCorpoErro(mensagemErro));
    } catch (err) {
      console.error('[FALHA] (notificar erro) ' + err.message);
    }
  }

  return { executar: executar };
})();


// ── Wrapper de acionamento ──────────────────────────────────────────────────

/** Gatilho diário (ver Triggers.gs), menu "Executar agora" ou execução manual no editor. */
function monitorarMercadoFinanceiro() {
  return Orchestrator.executar();
}
