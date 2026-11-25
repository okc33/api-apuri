# Life Pilot: Reboot AI Worker

This Cloudflare Worker keeps the Gemini API key off the GitHub Pages client.

1. Install Wrangler and authenticate with Cloudflare.
2. From `worker/`, run `wrangler secret put GEMINI_API_KEY`.
3. Set `ALLOWED_ORIGIN` in `wrangler.toml` to the exact deployed site origin.
4. Deploy with `wrangler deploy`.
5. Copy the resulting Worker URL into `ai-config.js` as:

```js
window.WEATHER_MISSION_AI_ENDPOINT = 'https://<worker-subdomain>.workers.dev/api/missions';
```

After deployment, verify the Worker with:

```text
GET https://<worker-subdomain>.workers.dev/api/health
```

The response includes `geminiConfigured: true` when the `GEMINI_API_KEY` secret is available. Never put the key in `ai-config.js`.

The client intentionally has no default AI endpoint. This avoids making a request
to a GitHub Pages 404 endpoint and makes the unconfigured state explicit in the UI.

The Worker validates categories, duration, and dangerous-weather restrictions again
before returning candidates. The client also validates the response, so a failed or
malformed AI response falls back to the fixed mission.
