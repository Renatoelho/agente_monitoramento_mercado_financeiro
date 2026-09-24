/**
 * ClaudeClient.gs
 * Chama a API Claude (Anthropic Messages API) com a tool nativa `web_search`
 * (server-side, executada pela própria Anthropic — não precisa de loop manual de
 * tool_use) e devolve o JSON estruturado de notícias já parseado, mais metadados
 * da chamada (status HTTP, tokens, duração, buscas).
 *
 * Formato de saída esperado do modelo (reforçado no prompts/prompt_system.txt):
 *   { "resumo_geral": "...", "noticias": [
 *       { "titulo", "descricao", "link", "origem", "data_postagem", "prioridade" }
 *   ] }
 */

const ClaudeClient = (function () {

  const ENDPOINT = 'https://api.anthropic.com/v1/messages';

  /**
   * Executa a pesquisa de notícias.
   * Retorna { resultado, meta } — `resultado` é o objeto JSON parseado,
   * `meta` traz { statusCode, tokensInput, tokensOutput, duracaoMs, buscasFeitas, buscasComErro }.
   */
  function pesquisarNoticias(cfg, prompts) {
    const inicio = Date.now();

    const payload = {
      model: cfg.ANTHROPIC_MODEL,
      max_tokens: cfg.ANTHROPIC_MAX_TOKENS,
      system: prompts.system,
      messages: [{ role: 'user', content: prompts.user }],
      tools: [{
        type: 'web_search_20250305',
        name: 'web_search',
        max_uses: cfg.WEB_SEARCH_MAX_USES
      }]
    };

    const options = {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'x-api-key': cfg.ANTHROPIC_API_KEY,
        'anthropic-version': cfg.ANTHROPIC_VERSION
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };

    console.log('[CLAUDE] Chamando API — modelo=' + cfg.ANTHROPIC_MODEL +
      ', max_uses(web_search)=' + cfg.WEB_SEARCH_MAX_USES + ', max_tokens=' + cfg.ANTHROPIC_MAX_TOKENS);

    let response;
    try {
      response = UrlFetchApp.fetch(ENDPOINT, options);
    } catch (err) {
      throw new ClaudeApiError('Falha de rede ao chamar a API Claude: ' + err.message);
    }

    const duracaoMs = Date.now() - inicio;
    const statusCode = response.getResponseCode();
    let body;
    try {
      body = JSON.parse(response.getContentText());
    } catch (err) {
      throw new ClaudeApiError('Resposta da API Claude não é um JSON válido (HTTP ' + statusCode + ').');
    }

    if (statusCode !== 200) {
      throw new ClaudeApiError('HTTP ' + statusCode + ': ' + JSON.stringify(body).substring(0, 500));
    }

    if (body.stop_reason === 'max_tokens') {
      throw new ClaudeApiError('Resposta truncada por limite de max_tokens (ANTHROPIC_MAX_TOKENS=' +
        cfg.ANTHROPIC_MAX_TOKENS + '). Aumente o limite ou reduza MAX_NOTICIAS_RELATORIO.');
    }

    // Com a tool web_search, o modelo pode gerar VÁRIOS blocos de texto (ex.: um
    // comentário tipo "Vou pesquisar..." antes de acionar a busca, e só o ÚLTIMO
    // bloco de texto contém a resposta final em JSON). Concatenar todos os blocos
    // prefixa lixo antes do JSON — por isso usamos só o último.
    const blocosTexto = (body.content || []).filter(function (bloco) { return bloco.type === 'text'; });
    const textoFinal = blocosTexto.length ? blocosTexto[blocosTexto.length - 1].text.trim() : '';

    if (ehVazio(textoFinal)) {
      throw new ClaudeApiError('Resposta da API Claude não contém bloco de texto final.');
    }

    console.log('[CLAUDE] Resposta recebida — HTTP ' + statusCode + ', stop_reason=' + body.stop_reason +
      ', blocos_texto=' + blocosTexto.length +
      ', tokens_input=' + (body.usage ? body.usage.input_tokens : '?') +
      ', tokens_output=' + (body.usage ? body.usage.output_tokens : '?') +
      ', duracao_ms=' + duracaoMs);
    console.log('[CLAUDE] Amostra do texto final (300 chars): ' + textoFinal.substring(0, 300) + '...');

    const buscas = _contarBuscas(body.content || []);
    console.log('[CLAUDE] Buscas web: feitas=' + buscas.feitas + ', com erro=' + buscas.erros.length +
      (buscas.erros.length ? ' (' + buscas.erros.join(', ') + ')' : ''));

    const textoLimpo = _extrairJson(_removerTagsCitacao(textoFinal));

    let resultado;
    try {
      resultado = JSON.parse(textoLimpo);
    } catch (err) {
      throw new ClaudeApiError('Falha ao parsear JSON da resposta do Claude: ' + err.message);
    }

    if (!resultado || !Array.isArray(resultado.noticias)) {
      throw new ClaudeApiError('JSON da resposta não possui a estrutura esperada ({ resumo_geral, noticias[] }).');
    }

    return {
      resultado: resultado,
      meta: {
        statusCode: statusCode,
        tokensInput: body.usage ? body.usage.input_tokens : 0,
        tokensOutput: body.usage ? body.usage.output_tokens : 0,
        duracaoMs: duracaoMs,
        buscasFeitas: buscas.feitas,
        buscasComErro: buscas.erros.length
      }
    };
  }

  /** Conta buscas web feitas (server_tool_use) e as que falharam (com o error_code). */
  function _contarBuscas(blocos) {
    let feitas = 0;
    const erros = [];
    blocos.forEach(function (bloco) {
      if (bloco.type === 'server_tool_use') feitas++;
      if (bloco.type === 'web_search_tool_result' && bloco.content && bloco.content.type === 'web_search_tool_result_error') {
        erros.push(bloco.content.error_code || 'erro_desconhecido');
      }
    });
    return { feitas: feitas, erros: erros };
  }

  /**
   * Remove as tags de citação (`<cite index="...">texto</cite>`) que a API injeta
   * automaticamente no texto quando a tool web_search retorna resultados citados —
   * mantém só o texto interno, sem a tag.
   */
  function _removerTagsCitacao(texto) {
    return texto
      .replace(/<cite[^>]*>/gi, '')
      .replace(/<\/cite>/gi, '');
  }

  /**
   * Remove cercas ```json e qualquer comentário fora do objeto JSON — extrai o
   * trecho do primeiro `{` ao último `}` como rede de segurança, caso o modelo
   * ainda assim insira alguma frase antes/depois do JSON no bloco final.
   */
  function _extrairJson(texto) {
    const semCercas = texto.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```$/i, '').trim();
    const inicio = semCercas.indexOf('{');
    const fim = semCercas.lastIndexOf('}');
    if (inicio === -1 || fim === -1 || fim < inicio) return semCercas;
    return semCercas.substring(inicio, fim + 1);
  }

  return { pesquisarNoticias: pesquisarNoticias };
})();
