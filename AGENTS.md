# Nano Banana — Image Generation Tool

**This is the image/art generation tool for all projects.** When Brad says "Nano Banana" or asks to generate images, art, thumbnails, banners, or designs — use this project.

**Quick command:**
```bash
cd /Users/bflanary/Projects/nano-banana-json-prompt-generator
node generate.js "plain english description"
```

Output lands in `output/`. Run multiple in parallel with `&` + `wait`.
Write prompts in plain English — no Midjourney syntax (`--ar`, `--v`, etc.).

---

Prompt engineering tool — web UI for generating and testing structured prompts.

## Stack
- **Runtime:** Node.js
- **Frontend:** Vanilla HTML/JS — `index.html`
- **Server:** `server.js`
- **Core logic:** `generate.js`, `prompt.js`
- **Output:** `output/` directory

## Key Files
- `server.js` — Express server entry
- `generate.js` — prompt generation logic
- `prompt.js` — prompt templates/utilities
- `index.html` — UI
- `research.md` — research notes (read before changing approach)

## Conventions
- No build step — vanilla JS served directly
- Generated outputs go in `output/`
- Check `~/.claude/port-registry.md` before changing the server port

## Known Issues (Phase 0.5 Review — 2026-04-16)

**MEDIUM — Fix if the tool ever gets shared or hosted:**
- `index.html` line 790 — `outputArea.innerHTML = syntaxHighlight(lastJSON)`. `JSON.stringify` does not escape `<` or `>`, and `syntaxHighlight()` doesn't HTML-encode before injecting. User input containing `<img src=x onerror=alert(1)>` would execute. Fix: HTML-escape the JSON string before `syntaxHighlight()`, or replace `innerHTML` with `textContent` for the raw string, and use innerHTML only for the span-wrapped output.

**LOW:**
- `server.js` — PORT hardcoded to 3000. Fix: `const PORT = process.env.PORT || 3000`.

**INFO (local dev tool):**
- No auth, no rate limiting — intentional, acceptable for localhost-only tool.

## Notes
- Phase 0.5 review complete
- XSS risk is low in practice (localhost only, self-inflicted payload) but fix before hosting
