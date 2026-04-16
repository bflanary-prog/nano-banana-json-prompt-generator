# json-prompting

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

## Notes
- Deep code review pending (Phase 0.5)
