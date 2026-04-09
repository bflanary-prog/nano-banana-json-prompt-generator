# Nano Banana 2 — JSON Prompt Generator

Convert plain English descriptions into structured JSON prompts for precise AI image generation with Google's Nano Banana 2 (Gemini 3.1 Flash Image / Imagen 4).

## How it works

**Generating:** Your plain English description is sent directly to Imagen 4 (full quality model) — exactly as you typed it, nothing stripped. In parallel, it's also parsed into a structured JSON sidecar saved alongside the image.

**Editing:** Open the `.json` sidecar, tweak a single field, and re-run. Only what you changed will differ — the JSON gives you surgical control over color, lighting, composition, camera, and style independently without rewriting the whole prompt.

This avoids the core problem with plain text editing: change one thing and the AI re-interprets the whole image.

## Project Structure

```
json-prompting/
├── generate.js      # Standalone generator — text → JSON → Imagen → output/ (no server)
├── server.js        # Express server — serves the web UI + calls Gemini API
├── prompt.js        # CLI tool — convert plain English to JSON only (no API call)
├── index.html       # Browser UI — visual prompt builder + image preview
├── research.md      # Research notes on JSON prompting best practices
├── output/          # Generated images saved here (gitignored)
├── .env             # API keys — never commit (gitignored)
├── .vscode/
│   └── tasks.json   # VS Code tasks — auto-starts server, adds Generate Image command
├── .gitignore
└── package.json
```

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Add your Gemini API key to `.env`:
   ```
   GEMINI_API_KEY=your_key_here
   ```
   Get a key at [aistudio.google.com/apikey](https://aistudio.google.com/apikey). Image generation requires a paid plan (~$0.03/image).

## Usage

### Option A — VS Code task (recommended, fully contained)

No browser. No server. One command from inside VS Code.

**Generate:** `Cmd+Ctrl+G` → type your description → press Enter.

The image opens automatically in VS Code and is saved to `output/`. A JSON sidecar (`image-TIMESTAMP.json`) is saved alongside it.

**Edit and regenerate:**
1. Open the `.json` sidecar in `output/`
2. Tweak any field (e.g. `"weather": "clear_skies"` → `"rainy"`, or `"time": "midnight"`)
3. `Cmd+Shift+P` → **Tasks: Run Task** → **Regenerate from JSON** → paste the path
4. New image opens — only what you changed differs

Or from the terminal:
```
node generate.js "a 1950s housewife at a picnic, red checkered dress, holding a Coca-Cola can"
node generate.js --json output/image-1234567890.json
```

### Option B — VS Code Simple Browser (web UI inside VS Code)

1. Open this folder in VS Code — the server starts automatically
2. Press `Cmd+Ctrl+S` to open the app inside VS Code's Simple Browser panel
3. Type a plain English description → Generate JSON → Generate Image
4. Image appears inline and is saved to `output/`

### Option C — Terminal + Browser

```
npm start
```
Then open [http://localhost:3000](http://localhost:3000) in any browser.

### Option D — JSON only (no API, no cost)

```
node prompt.js "a rainy Tokyo alley at night, neon reflections, 35mm film, grain"
```
Converts plain English to JSON and prints it to the terminal. No API key required — useful for building prompts to paste into Gemini manually.

## Using the JSON in Gemini (free, no API key)
If you don't want to use the API, copy the JSON output and paste it into [gemini.google.com](https://gemini.google.com) with:
```
Generate an image based on the following JSON:

{ ...paste JSON here... }
```

## Editing Existing Images (most powerful workflow)
1. Upload a photo to Gemini
2. Prompt: `Analyze this image and output all its details in JSON format`
3. Modify specific fields in the returned JSON (e.g. change `"weather": "rainy"`)
4. Prompt: `Modify the image based on the following JSON:` + paste modified JSON

Only the fields you changed will update — everything else stays consistent.

## Supported Prompt Keywords

| Category | Keywords |
|----------|----------|
| Aspect ratio | `widescreen`, `cinematic`, `portrait`, `square` |
| Style | `anime`, `oil painting`, `watercolor`, `sketch`, `3d render` |
| Resolution | `4K`, `2K`, `1080p` |
| Time of day | `golden hour`, `sunset`, `sunrise`, `midnight`, `blue hour` |
| Weather | `rainy`, `snowy`, `foggy`, `sunny`, `overcast` |
| Lighting | `neon`, `dramatic`, `studio`, `natural`, `candlelight`, `backlit` |
| Camera | `35mm`, `iPhone`, `drone`, `polaroid`, `macro` |
| Lens | `24mm`, `35mm`, `50mm`, `85mm`, `macro`, `fisheye`, `wide angle` |
| Depth of field | `shallow depth`, `bokeh`, `deep focus` |
| Film stock | `kodak`, `fuji`, `grain` |
| Framing | `close-up`, `wide shot`, `full body`, `medium shot` |
| Angle | `low angle`, `bird's eye`, `dutch angle`, `aerial` |
| Aesthetic | `cinematic`, `vintage`, `noir`, `cyberpunk`, `minimalist`, `luxury` |
| Hair | `straight`, `curly`, `wavy`, `blonde`, `brunette`, `auburn` |
| Exclusions | `no people`, `no text`, `no reflections`, `no shadows` |

## VS Code Workflow (Global Convention)

Every project in `~/Projects/` follows this pattern:

| Convention | Details |
|-----------|---------|
| `npm start` | Starts the local server |
| `.vscode/tasks.json` | Auto-starts server when folder opens in VS Code |
| `Cmd+Ctrl+S` | Opens app in VS Code Simple Browser (global keybinding) |
| `Cmd+Ctrl+G` | Runs Generate Image task — prompts for description inline |
| `.env` | Project API keys — never committed |
| `output/` | Generated assets — never committed |

To apply this pattern to a new project: add `"start": "node server.js"` to its `package.json` and copy `.vscode/tasks.json` into it.

## Resources

- [Nano Banana 2 announcement](https://blog.google/innovation-and-ai/technology/ai/nano-banana-2/)
- [AI Studio](https://aistudio.google.com) — test prompts for free in the browser
- [JSON schema reference](https://gist.github.com/alexewerlof/1d13401a7647339469141dc2960e66a9)
- [awesome-nanobanana-pro](https://github.com/ZeroLu/awesome-nanobanana-pro) — community prompt examples
