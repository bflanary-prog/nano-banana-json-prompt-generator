#!/usr/bin/env node
// generate.js — text → JSON → Gemini Imagen → output/
// No LLMs. No browser. No server.
// Usage:
//   node generate.js "a rainy Tokyo alley at night, neon, 35mm film"
//   node generate.js --json output/image-1234567890.json   (re-run from saved JSON)

require("dotenv").config();
const https = require("https");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

const args = process.argv.slice(2);
const jsonFlagIndex = args.indexOf("--json");
const fromJsonFile = jsonFlagIndex !== -1 ? args[jsonFlagIndex + 1] : null;
const text = fromJsonFile ? null : args.join(" ").trim();

if (!fromJsonFile && !text) {
  console.error('Usage: node generate.js "your prompt here"');
  console.error('       node generate.js --json output/image-1234567890.json');
  process.exit(1);
}

function geminiKey() {
  // Env first, then macOS Keychain (service=nano-banana, account=gemini_api_key).
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  try {
    return require("child_process")
      .execSync("security find-generic-password -s nano-banana -a gemini_api_key -w", { encoding: "utf8" })
      .trim() || null;
  } catch { return null; }
}
const apiKey = geminiKey();
if (!apiKey) {
  console.error("Error: GEMINI_API_KEY not set (.env or Keychain nano-banana/gemini_api_key)");
  process.exit(1);
}

const OUTPUT_DIR = path.join(__dirname, "output");
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

// ── Parse plain English → JSON ──────────────────────────────────────────────

const { parsePrompt } = require("./parsePrompt");

// ── Convert JSON → natural language prompt ───────────────────────────────────

function buildPromptText(json) {
  const parts = [];
  const s = json.subject?.[0];
  const scene = json.scene;
  const tech = json.technical;
  const comp = json.composition;
  const style = json.style_modifiers;
  const meta = json.meta;

  if (s?.description)   parts.push(s.description);
  if (s?.hair)          parts.push(`${s.hair.color || ""} ${s.hair.style || ""} hair`.trim());
  if (s?.expression)    parts.push(s.expression + " expression");
  if (scene?.location)  parts.push(scene.location);
  if (scene?.time)      parts.push(scene.time.replace(/_/g, " "));
  if (scene?.weather && scene.weather !== "clear_skies") parts.push(scene.weather.replace(/_/g, " ") + " weather");
  if (scene?.lighting?.type) parts.push(scene.lighting.type + " lighting");
  if (tech?.lens)       parts.push(tech.lens);
  if (tech?.aperture)   parts.push(tech.aperture);
  if (tech?.film_stock) parts.push(tech.film_stock + " film");
  if (comp?.framing) {
    const f = comp.framing.replace(/_/g, " ");
    parts.push(f.endsWith("shot") ? f : f + " shot");
  }
  if (comp?.angle && comp.angle !== "eye_level") parts.push(comp.angle.replace(/_/g, " ") + " angle");
  if (style?.aesthetic?.length) parts.push(style.aesthetic.join(", "));
  if (style?.color_palette?.tone) parts.push(style.color_palette.tone + " color tones");
  if (meta?.quality && meta.quality !== "ultra_photorealistic") parts.push(meta.quality.replace(/_/g, " "));
  if (meta?.resolution) parts.push(meta.resolution + " resolution");

  return parts.join(", ");
}

// ── Call Gemini Imagen API ────────────────────────────────────────────────────

async function generateImage(json, rawText) {
  // Use the original text directly when available — JSON round-trip is lossy
  // (clothing, props, and anything not regex-matched gets dropped from buildPromptText)
  const promptText = rawText || buildPromptText(json);
  const negativePrompt = (json.advanced?.negative_prompt || []).join(", ");

  console.log(`\nPrompt: ${promptText}`);
  console.log("Calling Imagen API...");

  const payload = JSON.stringify({
    instances: [{ prompt: promptText, negativePrompt }],
    parameters: {
      sampleCount: 1,
      aspectRatio: json.meta?.aspect_ratio || "1:1",
    },
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: "generativelanguage.googleapis.com",
      path: `/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(payload),
      },
    };

    const request = https.request(options, (response) => {
      let data = "";
      response.on("data", (chunk) => (data += chunk));
      response.on("end", () => {
        try {
          const parsed = JSON.parse(data);
          if (parsed.error) return reject(new Error(parsed.error.message));
          const prediction = parsed?.predictions?.[0];
          if (!prediction?.bytesBase64Encoded) return reject(new Error("No image returned from API"));
          resolve({ data: prediction.bytesBase64Encoded, mimeType: prediction.mimeType || "image/png" });
        } catch (e) {
          reject(new Error("Failed to parse API response"));
        }
      });
    });

    request.on("error", reject);
    request.write(payload);
    request.end();
  });
}

// ── Main ─────────────────────────────────────────────────────────────────────

(async () => {
  try {
    let json;
    if (fromJsonFile) {
      const raw = fs.readFileSync(path.resolve(fromJsonFile), "utf8");
      json = JSON.parse(raw);
      console.log(`\nUsing JSON: ${fromJsonFile}`);
    } else {
      json = parsePrompt(text);
    }

    // Pass raw text for new generations so Imagen gets the full unmodified prompt.
    // For --json re-runs, rawText is null and buildPromptText reconstructs from JSON.
    const imageData = await generateImage(json, fromJsonFile ? null : text);

    const timestamp = Date.now();
    const ext = imageData.mimeType.split("/")[1] || "png";
    const basename = `image-${timestamp}`;
    const imageFile = path.join(OUTPUT_DIR, `${basename}.${ext}`);
    const jsonFile  = path.join(OUTPUT_DIR, `${basename}.json`);

    fs.writeFileSync(imageFile, Buffer.from(imageData.data, "base64"));
    fs.writeFileSync(jsonFile, JSON.stringify(json, null, 2));

    console.log(`\nSaved:  output/${basename}.${ext}`);
    console.log(`JSON:   output/${basename}.json`);
    console.log(`\nTo edit and regenerate: node generate.js --json output/${basename}.json`);

    // Open the image in VS Code
    spawn("code", [imageFile], { detached: true, stdio: "ignore" }).unref();
  } catch (err) {
    console.error(`\nError: ${err.message}`);
    process.exit(1);
  }
})();
