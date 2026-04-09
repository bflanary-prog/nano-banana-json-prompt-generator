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

const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("Error: GEMINI_API_KEY not set in .env");
  process.exit(1);
}

const OUTPUT_DIR = path.join(__dirname, "output");
if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR);

// ── Parse plain English → JSON ──────────────────────────────────────────────

function parsePrompt(text) {
  const t = text.toLowerCase();
  const out = {};

  // Meta
  const meta = {};
  if (/\b(widescreen|cinematic|16.?9|landscape)\b/.test(t))          meta.aspect_ratio = "16:9";
  else if (/\b(portrait|9.?16|vertical|instagram story)\b/.test(t)) meta.aspect_ratio = "9:16";
  else if (/\b(square|1.?1)\b/.test(t))                             meta.aspect_ratio = "1:1";
  else if (/\b(4.?3)\b/.test(t))                                    meta.aspect_ratio = "4:3";
  else                                                               meta.aspect_ratio = "1:1";

  if (/\banime\b/.test(t))             meta.quality = "anime_v6";
  else if (/\boil paint/.test(t))      meta.quality = "oil_painting";
  else if (/\bwatercolor\b/.test(t))   meta.quality = "watercolor";
  else if (/\bsketch\b/.test(t))       meta.quality = "pencil_sketch";
  else if (/\b3d render\b/.test(t))    meta.quality = "3d_render_octane";
  else if (/\bpixel art\b/.test(t))    meta.quality = "pixel_art";
  else                                 meta.quality = "ultra_photorealistic";

  if (/\b4k\b/.test(t))          meta.resolution = "3840x2160";
  else if (/\b2k\b/.test(t))     meta.resolution = "2560x1440";
  else if (/\b1080p?\b/.test(t)) meta.resolution = "1920x1080";

  meta.magic_prompt_enhancer = true;
  out.meta = meta;

  // Subject
  const subject = { id: "main" };
  if (/\b(man|woman|boy|girl|person|people|child|baby|human|housewife|astronaut|model|photographer|warrior|soldier)\b/.test(t))
    subject.type = "person";
  else if (/\b(cat|dog|horse|lion|wolf|bird|animal|bear)\b/.test(t))
    subject.type = "animal";
  else if (/\b(robot|android|cyborg)\b/.test(t))
    subject.type = "robot";
  else
    subject.type = "object";

  subject.description = text.length > 400 ? text.slice(0, 400) + "…" : text;

  if (/\b(smiling|happy|laughing|joy)\b/.test(t))      subject.expression = "smiling, warm";
  else if (/\b(serious|stern|intense)\b/.test(t))      subject.expression = "serious, focused";
  else if (/\b(sad|crying|melancholy)\b/.test(t))      subject.expression = "melancholic, distant";
  else if (/\b(surprised|shocked)\b/.test(t))          subject.expression = "surprised";
  else if (subject.type === "person")                   subject.expression = "natural, relaxed";

  if (subject.type === "person") {
    const hair = {};
    if (/\b(straight hair|straight)\b/.test(t))        hair.style = "straight";
    else if (/\b(curly|curls)\b/.test(t))              hair.style = "curly";
    else if (/\b(wavy)\b/.test(t))                     hair.style = "wavy";
    else if (/\b(short hair|short)\b/.test(t))         hair.style = "short";
    else if (/\b(long hair|long)\b/.test(t))           hair.style = "long";
    else if (/\b(bun|updo)\b/.test(t))                 hair.style = "updo bun";
    else if (/\b(ponytail)\b/.test(t))                 hair.style = "ponytail";
    if (/\b(blonde|blond)\b/.test(t))                  hair.color = "blonde";
    else if (/\b(brunette|brown hair|brown)\b/.test(t)) hair.color = "brown";
    else if (/\b(black hair|black)\b/.test(t))         hair.color = "black";
    else if (/\b(red hair|redhead|auburn)\b/.test(t))  hair.color = "auburn red";
    else if (/\b(grey hair|gray hair|silver)\b/.test(t)) hair.color = "silver grey";
    else if (/\b(white hair)\b/.test(t))               hair.color = "white";
    if (Object.keys(hair).length) subject.hair = hair;
  }

  out.subject = [subject];

  // Scene
  const scene = {};
  const locationMap = [
    [/\b(tokyo|japan)\b/, "Tokyo street"],
    [/\b(alley|alleyway)\b/, "narrow urban alley"],
    [/\b(picnic|park|meadow|field)\b/, "outdoor park setting"],
    [/\b(desert|sand|dune)\b/, "vast desert landscape"],
    [/\b(studio)\b/, "professional photography studio"],
    [/\b(beach|ocean|sea|coast)\b/, "coastal beach"],
    [/\b(forest|woods|jungle)\b/, "dense forest"],
    [/\b(city|urban|street)\b/, "urban cityscape"],
    [/\b(mountain|cliff|highland)\b/, "mountain terrain"],
    [/\b(space|planet|cosmos|galaxy)\b/, "outer space"],
    [/\b(indoor|inside|room|interior|apartment|home)\b/, "indoor interior"],
    [/\b(office|workplace)\b/, "modern office"],
    [/\b(marble|table)\b/, "styled surface"],
  ];
  for (const [re, val] of locationMap) {
    if (re.test(t)) { scene.location = val; break; }
  }
  // leave location unset if nothing matched — "unspecified environment" pollutes the prompt

  if (/\b(golden hour|magic hour)\b/.test(t))    scene.time = "golden_hour";
  else if (/\b(blue hour|dusk)\b/.test(t))        scene.time = "blue_hour";
  else if (/\b(sunrise|dawn)\b/.test(t))          scene.time = "sunrise";
  else if (/\b(sunset)\b/.test(t))                scene.time = "sunset";
  else if (/\b(noon|midday|high noon)\b/.test(t)) scene.time = "high_noon";
  else if (/\b(night|midnight|dark)\b/.test(t))   scene.time = "midnight";
  else if (/\b(morning)\b/.test(t))               scene.time = "sunrise";
  else if (/\b(afternoon)\b/.test(t))             scene.time = "high_noon";
  // leave time unset if nothing matched — defaulting to golden_hour overrides user intent

  if (/\b(rain|rainy|wet|stormy|storm)\b/.test(t))     scene.weather = "rainy";
  else if (/\b(snow|snowy|winter|blizzard)\b/.test(t)) scene.weather = "snowing";
  else if (/\b(fog|foggy|mist|misty)\b/.test(t))       scene.weather = "foggy";
  else if (/\b(sunny|clear|bright)\b/.test(t))          scene.weather = "clear_skies";
  else if (/\b(overcast|cloudy|grey)\b/.test(t))        scene.weather = "overcast";
  else                                                   scene.weather = "clear_skies";

  const lighting = {};
  if (/\b(neon|neon sign|neon light)\b/.test(t))          lighting.type = "neon ambient";
  else if (/\b(dramatic|harsh|high contrast)\b/.test(t))  lighting.type = "dramatic chiaroscuro";
  else if (/\b(studio|ring light)\b/.test(t))             lighting.type = "studio softbox";
  else if (/\b(natural|sunlight|daylight)\b/.test(t))     lighting.type = "natural sunlight";
  else if (/\b(golden|warm light|warm)\b/.test(t))        lighting.type = "warm golden light";
  else if (/\b(soft|diffused|gentle)\b/.test(t))          lighting.type = "soft diffused";
  else if (/\b(backlit|backlight|silhouette)\b/.test(t))  lighting.type = "backlit";
  else if (/\b(candlelight|candle|fire|flame)\b/.test(t)) lighting.type = "warm candlelight";
  else                                                     lighting.type = "natural ambient";

  if (/\b(front.?lit|frontal)\b/.test(t))          lighting.direction = "front";
  else if (/\b(back.?lit|from behind)\b/.test(t))  lighting.direction = "rear";
  else if (/\b(side.?lit|rembrandt)\b/.test(t))    lighting.direction = "45° side";
  else if (/\b(top.?lit|overhead)\b/.test(t))      lighting.direction = "overhead";
  else                                              lighting.direction = "three-quarter";

  scene.lighting = lighting;
  out.scene = scene;

  // Technical
  const tech = {};
  if (/\b(film|35mm|kodak|fuji|analog)\b/.test(t))       tech.camera_model = "35mm film camera";
  else if (/\b(iphone|phone|mobile)\b/.test(t))          tech.camera_model = "iPhone 15 Pro";
  else if (/\b(drone|aerial|bird.?s.?eye)\b/.test(t))    tech.camera_model = "DJI drone";
  else if (/\b(gopro|action cam)\b/.test(t))             tech.camera_model = "GoPro Hero 12";
  else if (/\b(polaroid|instant)\b/.test(t))             tech.camera_model = "Polaroid Now";
  else if (/\b(macro|close.?up)\b/.test(t))              tech.camera_model = "Canon EOS R5";
  else                                                    tech.camera_model = "Sony A7R IV";

  const lensMap = [
    [/\b(24mm)\b/, "24mm wide prime"],
    [/\b(35mm)\b/, "35mm prime"],
    [/\b(50mm)\b/, "50mm standard prime"],
    [/\b(85mm)\b/, "85mm portrait prime"],
    [/\b(135mm)\b/, "135mm telephoto"],
    [/\b(200mm|tele)\b/, "200mm telephoto"],
    [/\b(macro)\b/, "100mm macro"],
    [/\b(fisheye)\b/, "8mm fisheye"],
    [/\b(wide angle|wide.?angle|ultra.?wide)\b/, "16mm ultra-wide"],
    [/\b(zoom)\b/, "24-70mm zoom"],
  ];
  for (const [re, val] of lensMap) {
    if (re.test(t)) { tech.lens = val; break; }
  }
  if (!tech.lens) tech.lens = "50mm standard prime";

  if (/\b(shallow depth|bokeh|f\/1|1\.4|1\.8|f1|blur(red)? background)\b/.test(t))
    tech.aperture = "f/1.8 (shallow depth of field)";
  else if (/\b(deep focus|everything in focus|sharp throughout)\b/.test(t))
    tech.aperture = "f/11 (deep focus)";
  else
    tech.aperture = "f/2.8";

  if (/\b(kodak|portra)\b/.test(t))                    tech.film_stock = "Kodak Portra 400";
  else if (/\b(fuji|velvia)\b/.test(t))                tech.film_stock = "Fujifilm Velvia 50";
  else if (/\b(grain|grainy|film grain)\b/.test(t))    tech.film_stock = "CineStill 800T";

  out.technical = tech;

  // Composition
  const comp = {};
  if (/\b(extreme close.?up|ecu|detail shot)\b/.test(t))       comp.framing = "extreme_close_up";
  else if (/\b(close.?up|cu|headshot|face)\b/.test(t))         comp.framing = "close_up";
  else if (/\b(medium close|waist up)\b/.test(t))              comp.framing = "medium_close_up";
  else if (/\b(medium shot|mid shot|chest up)\b/.test(t))      comp.framing = "medium_shot";
  else if (/\b(full body|full length|head to toe)\b/.test(t))  comp.framing = "full_body";
  else if (/\b(wide shot|ws|establishing)\b/.test(t))          comp.framing = "wide_shot";
  else if (/\b(extreme wide|panorama)\b/.test(t))              comp.framing = "extreme_wide_shot";
  // leave framing unset if nothing matched — defaulting to medium_shot adds noise for product/object shots

  if (/\b(low angle|worm.?s.?eye|from below)\b/.test(t))            comp.angle = "low_angle";
  else if (/\b(high angle|birds.?eye|from above|overhead)\b/.test(t)) comp.angle = "bird_eye_view";
  else if (/\b(dutch angle|tilted|canted)\b/.test(t))               comp.angle = "dutch_angle";
  else if (/\b(drone|aerial)\b/.test(t))                            comp.angle = "aerial";
  else                                                               comp.angle = "eye_level";

  out.composition = comp;

  // Style modifiers
  const style = {};
  style.medium = meta.quality === "ultra_photorealistic" ? "photography" :
                 meta.quality === "anime_v6" ? "anime" :
                 meta.quality === "oil_painting" ? "oil_painting" :
                 meta.quality === "watercolor" ? "watercolor" :
                 meta.quality === "3d_render_octane" ? "3d_render" : "photography";

  const aesthetics = [];
  if (/\b(cinematic)\b/.test(t))                                     aesthetics.push("cinematic");
  if (/\b(noir|black and white|b&w|bw|monochrome)\b/.test(t))       aesthetics.push("noir");
  if (/\b(vintage|retro|1950'?s|1960'?s|1970'?s|1980'?s|old school)\b/.test(t)) aesthetics.push("vintage");
  if (/\b(cyberpunk|neon|futuristic)\b/.test(t))                    aesthetics.push("cyberpunk");
  if (/\b(minimal|minimalist)\b/.test(t))                           aesthetics.push("minimalist");
  if (/\b(luxury|luxurious|high.?end)\b/.test(t))                   aesthetics.push("luxury editorial");
  if (/\b(gritty|street|urban)\b/.test(t))                          aesthetics.push("gritty realism");
  if (aesthetics.length) style.aesthetic = aesthetics;

  if (/\b(warm|golden|amber|orange tones?)\b/.test(t))
    style.color_palette = { tone: "warm", primary: "amber and gold", saturation: 0.8 };
  else if (/\b(cool|blue|teal|cyan tones?)\b/.test(t))
    style.color_palette = { tone: "cool", primary: "teal and blue", saturation: 0.7 };
  else if (/\b(black and white|b&w|monochrome|bw)\b/.test(t))
    style.color_palette = { tone: "monochrome", saturation: 0.0, contrast: 1.4 };
  else if (/\b(pastel|soft colors?|muted)\b/.test(t))
    style.color_palette = { tone: "pastel", saturation: 0.4 };

  out.style_modifiers = style;

  // Advanced
  const negative = [];
  if (/\b(no people|no crowd|empty)\b/.test(t))       negative.push("people in background");
  if (/\b(no blur|sharp)\b/.test(t))                  negative.push("motion blur");
  if (/\b(no text|without text)\b/.test(t))           negative.push("text", "watermarks", "logos");
  if (/\b(no reflection)\b/.test(t))                  negative.push("reflections");
  if (/\b(no shadow)\b/.test(t))                      negative.push("harsh shadows");
  if (/\b(no background|clean background)\b/.test(t)) negative.push("busy background", "distracting elements");
  if (/\b(no grain|clean|noise.?free)\b/.test(t))     negative.push("grain", "noise");
  negative.push("low quality", "blurry", "pixelated", "oversaturated");

  out.advanced = {
    negative_prompt: negative,
    magic_prompt_enhancer: true,
    hdr_mode: true,
  };

  return out;
}

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
