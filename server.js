require("dotenv").config();
const express = require("express");
const fs = require("fs");
const path = require("path");
const https = require("https");

const app = express();
const PORT = 3000;
const OUTPUT_DIR = path.join(__dirname, "output");

if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

app.use(express.json());
app.use(express.static(__dirname));
app.use("/output", express.static(OUTPUT_DIR));

// Generate image from JSON prompt via Gemini API
app.post("/generate", async (req, res) => {
  const { json } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "GEMINI_API_KEY not set in .env" });
  }

  // Convert JSON fields into a clean natural language prompt for Imagen
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

  const promptText = parts.join(", ");
  const negativePrompt = (json.advanced?.negative_prompt || []).join(", ");

  const payload = JSON.stringify({
    instances: [{ prompt: promptText, negativePrompt }],
    parameters: {
      sampleCount: 1,
      aspectRatio: meta?.aspect_ratio || "1:1",
    },
  });

  const options = {
    hostname: "generativelanguage.googleapis.com",
    path: `/v1beta/models/imagen-4.0-generate-001:predict?key=${apiKey}`,
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
            const prediction = parsed?.predictions?.[0];
            if (!prediction?.bytesBase64Encoded) return reject(new Error("No image returned"));
            resolve({ data: prediction.bytesBase64Encoded, mimeType: prediction.mimeType || "image/png" });
          } catch (e) {
            reject(new Error("Failed to parse response"));
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
