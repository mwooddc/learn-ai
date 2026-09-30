# learn-ai

Learn AI from the ground up: an interactive journey that explains how AI works, pitched so a Year 7 student can understand it without being patronised. Each stop is one short, hands-on page that builds on the last.

## Structure

```
index.html              journey home page (list of stops)
assets/css/base.css     shared design tokens and components
assets/js/site.js       shared helpers (section reveal, progress)
stops/NN-name/          one folder per stop: index.html, stop.css, stop.js
```

Plain HTML, CSS and JavaScript, with no build step. Any static host works (deployed on Vercel).

## Local preview

```bash
node .claude/serve.js
```

Then open http://localhost:5173.
