/**
 * Notifier.gs
 * Envio do e-mail de monitoramento via MailApp para todos os destinatários
 * configurados em EMAILS_NOTIFICACAO (aba `config`). Falha no envio é logada e
 * relançada como EmailError.
 */

const Notifier = (function () {

  /** Envia o e-mail HTML para todos os destinatários configurados. */
  function enviar(cfg, assunto, corpoHtml) {
    const destinatarios = cfg.EMAILS_NOTIFICACAO.join(',');
    try {
      MailApp.sendEmail({
        to: destinatarios,
        subject: assunto,
        htmlBody: corpoHtml
      });
      console.log('[EMAIL] Enviado para ' + destinatarios + ' — assunto: ' + assunto);
    } catch (err) {
      console.error('[EMAIL] Falha ao enviar para ' + destinatarios + ': ' + err.message);
      throw new EmailError(err.message);
    }
  }

  return { enviar: enviar };
})();
