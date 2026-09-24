/**
 * EmailBuilder.gs
 * MODELO de e-mail do monitoramento do mercado financeiro (assunto + corpo HTML).
 * Personalize cores, textos e layout livremente — o restante do projeto só usa as
 * funções exportadas no final do arquivo.
 *
 * Notícias são ordenadas por prioridade (campo `prioridade` retornado pelo Claude,
 * maior primeiro) e limitadas a `cfg.MAX_NOTICIAS_RELATORIO`.
 */

const EmailBuilder = (function () {

  const COR_FUNDO = '#f4f6f8';
  const COR_PRIMARIA = '#0b3d91';
  const COR_TEXTO = '#1a1a1a';
  const COR_MUTED = '#6b7280';
  const TITULO = 'Monitoramento Mercado Financeiro';

  /** Assunto do e-mail de sucesso. */
  function montarAssuntoSucesso() {
    return hojeFmt() + ' - ' + TITULO;
  }

  /** Assunto do e-mail de erro. */
  function montarAssuntoErro() {
    return hojeFmt() + ' - ' + TITULO + ' (Falha na Execução)';
  }

  /** Corpo HTML principal, com notícias (ou aviso de lista vazia). */
  function montarCorpoHtml(cfg, resultado) {
    const noticias = (resultado.noticias || [])
      .slice()
      .sort(function (a, b) { return (b.prioridade || 0) - (a.prioridade || 0); })
      .slice(0, cfg.MAX_NOTICIAS_RELATORIO);

    const blocoResumo = '<p style="font-size:15px;line-height:1.6;color:' + COR_TEXTO + ';margin:0 0 24px;">' +
      escHtml(resultado.resumo_geral || 'Sem resumo geral disponível.') + '</p>';

    const blocoNoticias = noticias.length
      ? noticias.map(_renderNoticia).join(_renderSeparador())
      : _renderSemNoticias();

    const corpo = _renderCabecalhoJanela(cfg) + blocoResumo +
      (noticias.length ? _renderSeparador() : '') + blocoNoticias;

    return _montarLayout(hojeFmt() + ' - ' + TITULO, corpo, cfg);
  }

  /** Corpo HTML quando nenhuma notícia foi encontrada na janela pesquisada. */
  function montarCorpoSemNoticias(cfg, resultado) {
    const resumo = resultado && resultado.resumo_geral
      ? '<p style="font-size:14px;line-height:1.6;color:' + COR_TEXTO + ';margin:20px 0 0;">' + escHtml(resultado.resumo_geral) + '</p>'
      : '';

    const corpo = _renderCabecalhoJanela(cfg) + _renderSemNoticias() + resumo;
    return _montarLayout(hojeFmt() + ' - ' + TITULO, corpo, cfg);
  }

  /** Corpo HTML do e-mail de erro de execução. */
  function montarCorpoErro(mensagemErro) {
    const corpo =
      '<p style="font-size:15px;line-height:1.6;color:' + COR_TEXTO + ';margin:0 0 16px;">' +
        'A execução do monitoramento de mercado financeiro em <b>' + escHtml(agoraFmt()) + '</b> falhou.' +
      '</p>' +
      '<div style="background:#fdecea;border-left:4px solid #c0392b;padding:14px 16px;border-radius:6px;">' +
        '<p style="margin:0;font-size:13px;color:#7a1f1f;font-family:Consolas,Menlo,monospace;white-space:pre-wrap;">' +
          escHtml(mensagemErro) +
        '</p>' +
      '</div>';

    return _montarLayout(hojeFmt() + ' - ' + TITULO + ' (Falha)', corpo, null);
  }

  // ── Renderização interna ────────────────────────────────────────────────

  function _renderCabecalhoJanela(cfg) {
    return '<p style="font-size:13px;color:' + COR_MUTED + ';margin:0 0 4px;">' +
      'Janela pesquisada: últimas ' + escHtml(cfg.JANELA_HORAS) + ' horas &middot; Execução em ' + escHtml(agoraFmt()) +
      '</p>';
  }

  function _montarLayout(titulo, conteudoHtml, cfg) {
    const rodape = 'Relatório gerado automaticamente por Google Apps Script (planilha vinculada). ' +
      'Notícias pesquisadas via API Claude (Anthropic)' +
      (cfg ? ', modelo ' + escHtml(cfg.ANTHROPIC_MODEL) + ', com busca na web' : '') + '.';

    return '<!DOCTYPE html><html><head><meta charset="UTF-8"></head>' +
      '<body style="margin:0;padding:0;background:' + COR_FUNDO + ';font-family:Arial,Helvetica,sans-serif;">' +
      '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:' + COR_FUNDO + ';padding:24px 0;">' +
      '<tr><td align="center">' +
      '<table role="presentation" width="640" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:10px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">' +
      '<tr><td style="background:' + COR_PRIMARIA + ';padding:22px 28px;">' +
      '<p style="margin:0;color:#ffffff;font-size:12px;letter-spacing:1px;text-transform:uppercase;opacity:0.85;">' + TITULO + '</p>' +
      '<h1 style="margin:6px 0 0;color:#ffffff;font-size:20px;font-weight:600;">' + escHtml(titulo) + '</h1>' +
      '</td></tr>' +
      '<tr><td style="padding:28px;">' + conteudoHtml + '</td></tr>' +
      '<tr><td style="padding:16px 28px;border-top:1px solid #eef0f2;">' +
      '<p style="margin:0;font-size:11px;color:' + COR_MUTED + ';">' + rodape + '</p>' +
      '</td></tr>' +
      '</table></td></tr></table></body></html>';
  }

  function _renderSeparador() {
    return '<hr style="border:none;border-top:1px solid #e5e7eb;margin:20px 0;">';
  }

  function _renderNoticia(n) {
    return '<div style="margin-bottom:4px;">' +
      '<h2 style="margin:0 0 8px;font-size:16px;color:' + COR_TEXTO + ';line-height:1.4;">' + escHtml(n.titulo || '(sem título)') + '</h2>' +
      '<p style="margin:0 0 10px;font-size:14px;line-height:1.6;color:#333333;">' + escHtml(n.descricao || '') + '</p>' +
      '<p style="margin:0 0 4px;font-size:13px;"><a href="' + escHtml(n.link || '#') + '" style="color:' + COR_PRIMARIA + ';text-decoration:none;">Ler notícia completa &rarr;</a></p>' +
      '<p style="margin:0;font-size:12px;color:' + COR_MUTED + ';">Origem: ' + escHtml(n.origem || 'não informado') +
        ' &middot; Data postagem: ' + escHtml(n.data_postagem || 'não informado') + '</p>' +
      '</div>';
  }

  function _renderSemNoticias() {
    return '<div style="background:#f8f9fb;border-radius:8px;padding:20px;text-align:center;">' +
      '<p style="margin:0;font-size:14px;color:' + COR_MUTED + ';">Nenhuma notícia relevante foi encontrada na janela pesquisada.</p>' +
      '</div>';
  }

  return {
    montarAssuntoSucesso: montarAssuntoSucesso,
    montarAssuntoErro: montarAssuntoErro,
    montarCorpoHtml: montarCorpoHtml,
    montarCorpoSemNoticias: montarCorpoSemNoticias,
    montarCorpoErro: montarCorpoErro
  };
})();
