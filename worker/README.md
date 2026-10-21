# Weather Mission AI Worker

This Cloudflare Worker keeps the Gemini API key off the GitHub Pages client.

1. Install Wrangler and authenticate with Cloudflare.
2. From `worker/`, run `wrangler secret put GEMINI_API_KEY`.
3. Set `ALLOWED_ORIGIN` in `wrangler.toml` to the exact deployed site origin.
4. Deploy with `wrangler deploy`.

The client calls `/api/missions` by default. If the Worker is deployed on a separate
origin, define this before loading `app.js`:

```html
<script>
  window.WEATHER_MISSION_AI_ENDPOINT = 'https://your-worker.workers.dev/api/missions';
</script>
```

The Worker validates categories, duration, and dangerous-weather restrictions again
before returning candidates. The client also validates the response, so a failed or
malformed AI response falls back to the fixed mission.
