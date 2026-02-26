/* =============================================
   api.js — Anthropic Claude API wrapper
   브라우저에서 직접 Anthropic API를 호출합니다.
   ============================================= */

const API = (() => {
  const ENDPOINT = 'https://api.anthropic.com/v1/messages';
  const STORAGE_KEY = 'el_sisters_api_key';
  const MODEL_KEY   = 'el_sisters_model';

  function getKey()   { return localStorage.getItem(STORAGE_KEY) || ''; }
  function setKey(k)  { localStorage.setItem(STORAGE_KEY, k); }
  function getModel() { return localStorage.getItem(MODEL_KEY) || 'claude-sonnet-4-6'; }
  function setModel(m){ localStorage.setItem(MODEL_KEY, m); }

  /**
   * Claude API 호출 (스트리밍 지원)
   * @param {string} systemPrompt - 역할 시스템 프롬프트
   * @param {string} userMessage  - 사용자 메시지
   * @param {Function|null} onChunk - 스트리밍 콜백 (text, fullText) => void
   * @returns {Promise<string>} - 완성된 응답 텍스트
   */
  async function call(systemPrompt, userMessage, onChunk = null) {
    const apiKey = getKey();
    if (!apiKey) {
      throw new Error('API 키가 설정되지 않았습니다. 우측 상단 [설정]에서 Anthropic API 키를 입력해 주세요.');
    }

    const useStream = typeof onChunk === 'function';
    const body = {
      model: getModel(),
      max_tokens: 8192,
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      stream: useStream
    };

    let response;
    try {
      response = await fetch(ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify(body)
      });
    } catch (networkErr) {
      throw new Error(`네트워크 오류: ${networkErr.message}`);
    }

    if (!response.ok) {
      let errMsg = `HTTP ${response.status}`;
      try {
        const errJson = await response.json();
        errMsg = errJson.error?.message || errMsg;
      } catch (_) {}
      if (response.status === 401) errMsg = 'API 키가 유효하지 않습니다. 설정에서 다시 확인해 주세요.';
      if (response.status === 429) errMsg = 'API 요청 한도 초과입니다. 잠시 후 다시 시도해 주세요.';
      throw new Error(errMsg);
    }

    // ── 스트리밍 모드 ──────────────────────────────────
    if (useStream) {
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let fullText = '';
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // 마지막 불완전 줄 보존

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const dataStr = line.slice(6).trim();
          if (dataStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(dataStr);
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              fullText += parsed.delta.text;
              onChunk(parsed.delta.text, fullText);
            }
          } catch (_) {
            // 파싱 실패한 청크는 무시
          }
        }
      }
      return fullText;
    }

    // ── 일반 모드 ──────────────────────────────────────
    const data = await response.json();
    return data.content[0].text;
  }

  return { getKey, setKey, getModel, setModel, call };
})();
