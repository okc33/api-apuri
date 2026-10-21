const MODEL = 'gemini-2.5-flash';
const MAX_BODY_BYTES = 16_000;

const allowedCategories = new Set([
  'indoor_stretch',
  'indoor_exercise',
  'indoor_warmup',
  'outdoor_walk'
]);

function json(data, status = 200, origin = '*') {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Headers': 'Content-Type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS'
    }
  });
}

function promptFor(input) {
  return `あなたは安全重視の生活改善アプリのミッション生成AIです。
天気とユーザー希望を読み、実行しやすいミッションを最大3件JSONで生成してください。
大雨・雷雨、最高気温35度以上、最高気温10度未満では屋外活動を提案しないでください。
医療行為、危険な運動、長時間の激しい運動は提案しないでください。
許可カテゴリは indoor_stretch, indoor_exercise, indoor_warmup, outdoor_walk のみです。
所要時間は3〜30分の整数にしてください。
JSON以外は返さず、形式は {"missions":[{"title":string,"description":string,"reason":string,"category":string,"durationMinutes":number,"safetyNote":string}]} としてください。

入力:
${JSON.stringify(input)}`;
}

function extractJson(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');
  if (start < 0 || end <= start) throw new Error('Model did not return JSON');
  return JSON.parse(text.slice(start, end + 1));
}

function validatePayload(payload) {
  if (!payload || !Array.isArray(payload.missions)) throw new Error('Invalid model payload');
  const tempMax = Number(payload.weather?.tempMax);
  const severe = Boolean(payload.weather?.isSevere);
  return payload.missions.slice(0, 3).filter((m) => {
    const duration = Number(m.durationMinutes);
    if (!m.title || !m.description || !m.reason) return false;
    if (!allowedCategories.has(m.category)) return false;
    if (!Number.isInteger(duration) || duration < 3 || duration > 30) return false;
    if ((severe || tempMax >= 35 || tempMax < 10) && m.category === 'outdoor_walk') return false;
    return true;
  });
}

export default {
  async fetch(request, env) {
    const origin = env.ALLOWED_ORIGIN || '*';
    if (request.method === 'OPTIONS') return json({}, 204, origin);
    if (request.method !== 'POST') return json({ error: 'Method not allowed' }, 405, origin);
    if (!env.GEMINI_API_KEY) return json({ error: 'AI service is not configured' }, 503, origin);

    const contentLength = Number(request.headers.get('content-length') || 0);
    if (contentLength > MAX_BODY_BYTES) return json({ error: 'Request too large' }, 413, origin);

    try {
      const input = await request.json();
      const geminiResponse = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${env.GEMINI_API_KEY}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptFor(input) }] }],
            generationConfig: { temperature: 0.7, maxOutputTokens: 900, responseMimeType: 'application/json' }
          })
        }
      );
      if (!geminiResponse.ok) return json({ error: 'Upstream AI request failed' }, 502, origin);
      const modelData = await geminiResponse.json();
      const text = modelData.candidates?.[0]?.content?.parts?.[0]?.text || '';
      const missions = validatePayload({ ...input, ...extractJson(text) });
      if (!missions.length) return json({ error: 'No safe missions generated' }, 502, origin);
      return json({ missions, source: 'gemini' }, 200, origin);
    } catch (error) {
      return json({ error: error instanceof Error ? error.message : 'AI request failed' }, 502, origin);
    }
  }
};
