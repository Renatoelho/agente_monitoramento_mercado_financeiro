/**
 * Triggers.gs
 * Instalação do gatilho diário (time-driven) que executa monitorarMercadoFinanceiro()
 * na hora definida em HORA_EXECUCAO (aba `config`, padrão 7h, fuso America/Sao_Paulo
 * definido em appsscript.json).
 *
 * Observação do Apps Script: `atHour(h)` dispara em algum momento entre h:00 e h:59.
 */

const HANDLER_MONITORAMENTO = 'monitorarMercadoFinanceiro';

/** Instala (ou reinstala) o gatilho diário. Retorna a hora configurada. */
function instalarGatilhoDiario() {
  const cfg = Config.carregar();
  const hora = cfg.HORA_EXECUCAO;
  if (hora < 0 || hora > 23) throw new ConfigError('HORA_EXECUCAO deve estar entre 0 e 23 (atual: ' + hora + ').');

  removerGatilhoDiario();
  ScriptApp.newTrigger(HANDLER_MONITORAMENTO)
    .timeBased()
    .atHour(hora)
    .everyDays(1)
    .create();

  console.log('✅ Gatilho instalado — ' + HANDLER_MONITORAMENTO + ', todos os dias por volta das ' + hora + 'h.');
  return hora;
}

/** Remove o gatilho diário do monitoramento, se existir. */
function removerGatilhoDiario() {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (t.getHandlerFunction() === HANDLER_MONITORAMENTO) ScriptApp.deleteTrigger(t);
  });
  console.log('Gatilho(s) de monitoramento removido(s).');
}

/** Lista os gatilhos instalados no projeto (console). */
function listarGatilhos() {
  const gatilhos = ScriptApp.getProjectTriggers();
  if (!gatilhos.length) { console.log('Nenhum gatilho instalado.'); return; }
  gatilhos.forEach(function (t) {
    console.log(t.getHandlerFunction() + ' — ' + t.getEventType() + ' — ' + t.getTriggerSource());
  });
}
