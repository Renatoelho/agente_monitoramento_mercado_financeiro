/**
 * PromptBuilder.gs
 * Lê os arquivos de prompt (system/user) do Google Drive e substitui os
 * placeholders pelos dados da execução atual.
 *
 * Placeholders esperados em `prompt_user.txt`:
 *   {{JANELA_HORAS}}        — janela de pesquisa em horas (cfg.JANELA_HORAS, default 24)
 *   {{DATA_HORA_EXECUCAO}}  — timestamp da execução (fuso America/Sao_Paulo)
 *
 * Os modelos ficam versionados em `prompts/` no repositório; a cópia usada em
 * produção é a do Drive (editável sem redeploy).
 */

const PromptBuilder = (function () {

  /** Monta { system, user } prontos para a chamada à API Claude. */
  function montar(cfg) {
    try {
      const promptSystem = _lerArquivoDrive(cfg.DRIVE_FILE_ID_PROMPT_SYSTEM, 'prompt_system');
      const promptUserModelo = _lerArquivoDrive(cfg.DRIVE_FILE_ID_PROMPT_USER, 'prompt_user');

      const promptUser = promptUserModelo
        .replace(/{{JANELA_HORAS}}/g, String(cfg.JANELA_HORAS))
        .replace(/{{DATA_HORA_EXECUCAO}}/g, agoraFmt());

      console.log('[PROMPT] Prompt system lido (' + promptSystem.length + ' chars).');
      console.log('[PROMPT] Prompt user montado (' + promptUser.length + ' chars), janela=' + cfg.JANELA_HORAS + 'h.');
      console.log('[PROMPT] Amostra do prompt user (300 chars): ' + promptUser.substring(0, 300) + '...');

      return { system: promptSystem, user: promptUser };
    } catch (err) {
      throw new PromptError(err.message);
    }
  }

  function _lerArquivoDrive(fileId, nomeArquivo) {
    const arquivo = DriveApp.getFileById(fileId);
    const texto = arquivo.getBlob().getDataAsString('UTF-8');
    if (ehVazio(texto)) throw new Error('Arquivo "' + nomeArquivo + '" (ID: ' + fileId + ') está vazio.');
    return texto;
  }

  return { montar: montar };
})();
