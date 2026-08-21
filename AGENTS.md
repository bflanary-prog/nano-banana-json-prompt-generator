# Nano Banana — Image Generation Tool

**This is the image/art generation tool for all projects.** When Brad says "Nano Banana" or asks to generate images, art, thumbnails, banners, or designs — use this project.

**Quick command:**
```bash
cd /Users/bflanary_mini/Projects/nano-banana-json-prompt-generator
node generate.js "plain english description"
```

Output lands in `output/`. Run multiple in parallel with `&` + `wait`.
Write prompts in plain English — no Midjourney syntax (`--ar`, `--v`, etc.).

## Models and Cost

| flag | model | cost |
|---|---|---|
| *(none — default)* | `gemini-3.1-flash-lite-image` | $0.0336 / image (1K only) |
| `--model flash3` | `gemini-3.1-flash-image` | $0.067 / 1K, $0.101 / 2K, $0.151 / 4K |
| `--model pro` | `gemini-3-pro-image` | $0.134 / 1K–2K, $0.24 / 4K |

**Default to the default.** Only reach for `flash3` or `pro` when the job actually needs it — `pro` is 4× the default per image. These channels are under active cost control. Note: 2K/4K requests on the lite default are ignored; they require `--model flash3`.

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
- `edit_pose.js` — reference-conditioned image edit; pins `gemini-3-pro-image` for character consistency
- `research.md` — historical notes (Imagen 4 era, superseded); see `PLAN-2026-08-21.md` for current API reference

## Conventions
- No build step — vanilla JS served directly
- Generated outputs go in `output/`
- Check `~/.claude/port-registry.md` before changing the server port
- **Aspect ratio:** controlled by the API parameter (`imageConfig.aspectRatio`), not by keywords in the prompt text. "widescreen", "portrait", "square" no longer change the canvas (verified A/B test 2026-08-21).
- **Negative prompts:** use semantic negatives — describe what you want ("an empty street with no traffic") rather than what you don't ("no cars"). The `negativePrompt` API parameter no longer exists.

## Known Issues (Phase 0.5 Review — 2026-04-16)

**MEDIUM — Fix if the tool ever gets shared or hosted:**
- `index.html` line 790 — `outputArea.innerHTML = syntaxHighlight(lastJSON)`. `JSON.stringify` does not escape `<` or `>`, and `syntaxHighlight()` doesn't HTML-encode before injecting. User input containing `<img src=x onerror=alert(1)>` would execute. Fix: HTML-escape the JSON string before `syntaxHighlight()`, or replace `innerHTML` with `textContent` for the raw string, and use innerHTML only for the span-wrapped output.

**LOW:**
- `server.js` — PORT hardcoded to 3000. Fix: `const PORT = process.env.PORT || 3000`.

**INFO (local dev tool):**
- No auth, no rate limiting — intentional, acceptable for localhost-only tool.

## Notes
- **2026-08-21:** Migrated from Imagen 4 (shut down 2026-08-17) to Gemini `:generateContent` endpoint. Models, pricing, and aspect-ratio behavior all changed — review this file before running.
- Phase 0.5 review complete
- XSS risk is low in practice (localhost only, self-inflicted payload) but fix before hosting
