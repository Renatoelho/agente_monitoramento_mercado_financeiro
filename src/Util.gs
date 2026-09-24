/**
 * Util.gs
 * Utilitários transversais: data/hora no fuso America/Sao_Paulo, helpers de valor.
 */

const TZ = 'America/Sao_Paulo';

/** Data/hora atual formatada `dd/MM/yyyy HH:mm:ss` no fuso de SP. */
function agoraFmt() {
  return Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy HH:mm:ss');
}

/** Data atual formatada `dd/MM/yyyy` no fuso de SP. */
function hojeFmt() {
  return Utilities.formatDate(new Date(), TZ, 'dd/MM/yyyy');
}

/** true quando o valor é nulo/indefinido ou string vazia após trim. */
function ehVazio(valor) {
  return valor === null || valor === undefined || String(valor).trim() === '';
}

/** Converte para inteiro seguro (default informado). */
function paraInt(valor, def) {
  const n = parseInt(valor, 10);
  return isNaN(n) ? (def || 0) : n;
}

/** Escapa HTML básico (evita quebra de layout/XSS no corpo do e-mail). */
function escHtml(valor) {
  return String(valor === null || valor === undefined ? '' : valor)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
