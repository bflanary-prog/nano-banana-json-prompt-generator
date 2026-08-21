#!/usr/bin/env node
// generate.js — text → JSON → Gemini Image → output/
// No LLMs. No browser. No server.
// Usage:
//   node generate.js "a rainy Tokyo alley at night, neon, 35mm film"
//   node generate.js --json output/image-1234567890.json   (re-run from saved JSON)
//   node generate.js --model pro "..."                      (opt into a pricier model)

require("dotenv").config();
const https = require("https");
const fs = require("fs");
const path = require("path");
const { spawn } = require("child_process");

// Default is the cheapest, longest-lived model. gemini-2.5-flash-image is
// NOT aliased — it retires 2026-10-02, don't hand anyone an easy handle on
// it (exact-ID passthrough still reaches it if truly needed). Bump quality
// one flag at a time, never by editing this file.
const MODEL_ALIASES = {
  lite: "gemini-3.1-flash-lite-image",
  flash3: "gemini-3.1-flash-image",
  pro: "gemini-3-pro-image",
};
const DEFAULT_MODEL = "gemini-3.1-flash-lite-image";
// Per-model, per-size price ($/image). Keyed by the imageConfig.imageSize
// actually used for the call ("1K" when no size is sent — every model
// renders 1K by default). Source: ai.google.dev/gemini-api/docs/pricing.
const MODEL_PRICING = {
  "gemini-2.5-flash-image": { "1K": 0.039 }, // retiring 2026-10-02; flat rate, ignores imageSize
  "gemini-3.1-flash-lite-image": { "1K": 0.0336 },
  "gemini-3.1-flash-image": { "0.5K": 0.045, "1K": 0.067, "2K": 0.101, "4K": 0.151 },
  "gemini-3-pro-image": { "1K": 0.134, "2K": 0.134, "4K": 0.24 },
};
// Only these two honor generationConfig.imageConfig.imageSize.
// gemini-3.1-flash-lite-image is 1K-only and must never receive the field —
// sending it is not just a no-op risk, it's excluded by design (see the
// resolution-gating note in generateImage). gemini-2.5-flash-image silently
// ignores it and always renders 1024x1024 (verified against the live API).
const SUPPORTS_IMAGE_SIZE = (model) => model === "gemini-3.1-flash-image" || model === "gemini-3-pro-image";

function extractFlag(arr, flag) {
  const i = arr.indexOf(flag);
  if (i === -1) return { value: null, rest: arr };
  const rest = arr.slice();
  const value = rest[i + 1];
  rest.splice(i, 2);
  return { value, rest };
}

const rawArgs = process.argv.slice(2);
const { value: fromJsonFile, rest: argsAfterJson } = extractFlag(rawArgs, "--json");
const { value: modelArg, rest: argsAfterModel } = extractFlag(argsAfterJson, "--model");
const MODEL = modelArg ? (MODEL_ALIASES[modelArg] || modelArg) : DEFAULT_MODEL;
const text = fromJsonFile ? null : argsAfterModel.join(" ").trim();

if (!fromJsonFile && !text) {
  console.error('Usage: node generate.js "your prompt here"');
  console.error('       node generate.js --json output/image-1234567890.json');
  console.error('       node generate.js --model lite|flash3|pro|<model-id> "..."');
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

// meta.resolution ("3840x2160" etc.) → imageConfig.imageSize ("4K" etc.), only
// for models that accept it. Only ever set from an explicit resolution keyword
// the user typed (4k/2k/1080p) — never defaulted, so this can't silently push
// spend above 1K.
function resolutionToImageSize(resolution) {
  if (resolution === "3840x2160") return "4K";
  if (resolution === "2560x1440") return "2K";
  if (resolution === "1920x1080") return "1K";
  return null;
}

// ── Call Gemini Image API ─────────────────────────────────────────────────────

async function generateImage(json, rawText, model) {
  // Use the original text directly when available — JSON round-trip is lossy
  // (clothing, props, and anything not regex-matched gets dropped from buildPromptText)
  let promptText = rawText || buildPromptText(json);

  // generateContent has no negativePrompt param — fold it into the prompt text.
  const negativePrompt = json.advanced?.negative_prompt || [];
  if (negativePrompt.length) promptText += `\nAvoid: ${negativePrompt.join(", ")}.`;

  const imageConfig = { aspectRatio: json.meta?.aspect_ratio || "1:1" };
  const requestedSize = resolutionToImageSize(json.meta?.resolution);
  if (requestedSize && SUPPORTS_IMAGE_SIZE(model)) {
    imageConfig.imageSize = requestedSize;
  } else if (requestedSize && model === "gemini-3.1-flash-lite-image" && requestedSize !== "1K") {
    // Never auto-upgrade the model to satisfy a resolution request — that
    // would silently multiply the per-image cost. Warn and render at 1K.
    const flash3Price = MODEL_PRICING["gemini-3.1-flash-image"]?.[requestedSize];
    console.log(
      `Note: ${model} is 1K-only; ignoring ${requestedSize} request. ` +
      `Use --model flash3 for ${requestedSize}${flash3Price != null ? ` ($${flash3Price}/image)` : ""}.`
    );
  }

  const price = MODEL_PRICING[model]?.[imageConfig.imageSize || "1K"];
  console.log(`\nModel: ${model}${price != null ? ` ($${price}/image)` : ""}`);
  console.log(`Prompt: ${promptText}`);
  console.log("Calling Gemini API...");

  const payload = JSON.stringify({
    contents: [{ parts: [{ text: promptText }] }],
    generationConfig: {
      responseModalities: ["IMAGE"],
      imageConfig,
    },
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: "generativelanguage.googleapis.com",
      path: `/v1beta/models/${model}:generateContent?key=${apiKey}`,
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

          const candidate = parsed?.candidates?.[0];
          const parts = candidate?.content?.parts || [];
          const imgPart = parts.find((p) => p.inlineData || p.inline_data);
          if (imgPart) {
            const img = imgPart.inlineData || imgPart.inline_data;
            return resolve({ data: img.data, mimeType: img.mimeType || img.mime_type || "image/png" });
          }

          // No image part: either a safety refusal (finishReason) or a
          // text-only reply. Surface whichever we have instead of a bare
          // "no image" message.
          const textPart = parts.find((p) => p.text)?.text;
          const reason = candidate?.finishReason;
          const detail = [reason && `finishReason: ${reason}`, textPart].filter(Boolean).join(" — ");
          reject(new Error(`No image returned from API${detail ? ` (${detail})` : ""}`));
        } catch (e) {
          reject(new Error(`Failed to parse API response: ${data.slice(0, 400)}`));
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

    // Pass raw text for new generations so Gemini gets the full unmodified prompt.
    // For --json re-runs, rawText is null and buildPromptText reconstructs from JSON.
    const imageData = await generateImage(json, fromJsonFile ? null : text, MODEL);

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

    // Open the image in Cursor
    spawn("cursor", [imageFile], { detached: true, stdio: "ignore" }).unref();
  } catch (err) {
    console.error(`\nError: ${err.message}`);
    process.exit(1);
  }
})();
