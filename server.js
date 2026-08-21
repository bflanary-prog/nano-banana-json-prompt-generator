require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const https = require("https");

function geminiKey() {
  // Env first, then macOS Keychain (service=nano-banana, account=gemini_api_key).
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  try {
    return require("child_process")
      .execSync("security find-generic-password -s nano-banana -a gemini_api_key -w", { encoding: "utf8" })
      .trim() || null;
  } catch { return null; }
}

// Default is the cheapest, longest-lived model. gemini-2.5-flash-image is
// NOT aliased — it retires 2026-10-02, don't hand anyone an easy handle on
// it (exact-ID passthrough still reaches it if truly needed). Same alias
// map as generate.js.
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
// resolution-gating note in the /generate handler). gemini-2.5-flash-image
// silently ignores it and always renders 1024x1024 (verified live).
const SUPPORTS_IMAGE_SIZE = (model) => model === "gemini-3.1-flash-image" || model === "gemini-3-pro-image";

// meta.resolution ("3840x2160" etc.) → imageConfig.imageSize ("4K" etc.), only
// for models that accept it. Only ever set from an explicit resolution keyword
// the user typed (4k/2k/1080p) — never defaulted.
function resolutionToImageSize(resolution) {
  if (resolution === "3840x2160") return "4K";
  if (resolution === "2560x1440") return "2K";
  if (resolution === "1920x1080") return "1K";
  return null;
}

const app = express();
const PORT = 3000;
const OUTPUT_DIR = path.join(__dirname, "output");
const GEMINI_KEY = geminiKey();

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

app.use(express.json());
app.use(express.static(__dirname));
app.use("/output", express.static(OUTPUT_DIR));

// Generate image from JSON prompt via Gemini API
app.post("/generate", async (req, res) => {
  const { json, rawText, model: modelArg } = req.body;
  const apiKey = GEMINI_KEY;
  const model = modelArg ? (MODEL_ALIASES[modelArg] || modelArg) : DEFAULT_MODEL;

  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY not set (.env or Keychain nano-banana/gemini_api_key)" });
  }

  // Convert JSON fields into a clean natural language prompt for Gemini
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
  if (comp?.framing)    parts.push(comp.framing.replace(/_/g, " ") + " shot");
  if (comp?.angle && comp.angle !== "eye_level") parts.push(comp.angle.replace(/_/g, " ") + " angle");
  if (style?.aesthetic?.length) parts.push(style.aesthetic.join(", "));
  if (style?.color_palette?.tone) parts.push(style.color_palette.tone + " color tones");
  if (meta?.quality && meta.quality !== "ultra_photorealistic") parts.push(meta.quality.replace(/_/g, " "));
  if (meta?.resolution) parts.push(meta.resolution + " resolution");

  // Prefer the original text — JSON round-trip is lossy (clothing, props, and
  // anything not regex-matched gets dropped). Same rule as generate.js.
  let promptText = (rawText && rawText.trim()) || parts.join(", ");

  // generateContent has no negativePrompt param — fold it into the prompt text.
  const negativePrompt = json.advanced?.negative_prompt || [];
  if (negativePrompt.length) promptText += `\nAvoid: ${negativePrompt.join(", ")}.`;

  const imageConfig = { aspectRatio: meta?.aspect_ratio || "1:1" };
  const requestedSize = resolutionToImageSize(meta?.resolution);
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

  const payload = JSON.stringify({
    contents: [{ parts: [{ text: promptText }] }],
    generationConfig: {
      responseModalities: ["IMAGE"],
      imageConfig,
    },
  });

  const options = {
    hostname: "generativelanguage.googleapis.com",
    path: `/v1beta/models/${model}:generateContent?key=${apiKey}`,
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(payload),
    },
  };

  try {
    const imageData = await new Promise((resolve, reject) => {
      const request = https.request(options, (response) => {
        let data = "";
        response.on("data", (chunk) => (data += chunk));
        response.on("end", () => {
          try {
            const parsed = JSON.parse(data);
            if (parsed.error) return reject(new Error(parsed.error.message));

            const candidate = parsed?.candidates?.[0];
            const responseParts = candidate?.content?.parts || [];
            const imgPart = responseParts.find((p) => p.inlineData || p.inline_data);
            if (imgPart) {
              const img = imgPart.inlineData || imgPart.inline_data;
              return resolve({ data: img.data, mimeType: img.mimeType || img.mime_type || "image/png" });
            }

            const textPart = responseParts.find((p) => p.text)?.text;
            const reason = candidate?.finishReason;
            const detail = [reason && `finishReason: ${reason}`, textPart].filter(Boolean).join(" — ");
            reject(new Error(`No image returned${detail ? ` (${detail})` : ""}`));
          } catch (e) {
            reject(new Error(`Failed to parse response: ${data.slice(0, 400)}`));
          }
        });
      });
      request.on("error", reject);
      request.write(payload);
      request.end();
    });

    // Save image to output/
    const ext = imageData.mimeType.split("/")[1] || "png";
    const filename = `image-${Date.now()}.${ext}`;
    const filepath = path.join(OUTPUT_DIR, filename);
    fs.writeFileSync(filepath, Buffer.from(imageData.data, "base64"));

    res.json({ filename, url: `/output/${filename}` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// List saved images
app.get("/images", (_req, res) => {
  const files = fs.existsSync(OUTPUT_DIR)
    ? fs.readdirSync(OUTPUT_DIR).filter((f) => /\.(png|jpg|jpeg|webp)$/i.test(f)).reverse()
    : [];
  res.json(files.map((f) => ({ filename: f, url: `/output/${f}` })));
});

app.listen(PORT, () => {
  console.log(`\n✅ JSON Prompt Generator running at http://localhost:${PORT}\n`);
});
