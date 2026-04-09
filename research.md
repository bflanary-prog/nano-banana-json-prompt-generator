# JSON Prompting for Nano Banana 2 — Research Notes

> Compiled from: YouTube transcripts (143K+ views), Reddit (r/PromptEngineering, r/AIArt, r/GoogleGemini), GitHub repos, and web sources.
> Last updated: April 2026

---

## What is Nano Banana 2?

Nano Banana 2 is Google's latest AI image generation model, technically **Gemini 3.1 Flash Image**. It combines the advanced capabilities of Nano Banana Pro with the speed of Gemini Flash.

**Key capabilities:**
- Advanced world knowledge (pulls from Gemini's real-world knowledge base)
- Subject consistency — maintain up to 5 characters and 14 objects across a workflow
- Text rendering — accurate, legible text for mockups and greeting cards
- Resolution support — 512px to 4K, multiple aspect ratios
- Available via: Gemini app, AI Studio, Gemini API, Vertex API, Antigravity (Google's IDE)

---

## What is JSON Prompting?

JSON prompting is a structured technique where instead of writing a plain English description, you describe an image using a JSON object with specific named fields. Each field maps to a distinct visual property.

**Why it works better than plain text:**

Plain text prompts cause the AI to treat your description as a whole, so changing one element often "bleeds" into others — update the weather and the lighting changes too, move the subject and the background shifts. JSON isolates each variable into its own field, so the AI can make surgical edits.

> *"The JSON file is basically the DNA of your image."* — The Tech Changer (YouTube)

> *"For example, here when I asked the AI to change the color of the sofa without JSON prompting, you can also see that the lamp changes."* — Artturi Explores (YouTube)

**Key benefits (per community research):**
- Precision improvement on color, lighting, and composition accuracy
- 40% reduction in processing time for multi-image batches (JSON templates are reusable)
- Reproducibility — same JSON = consistent results across sessions
- Brand consistency — lock in visual identity across many images

---

## The Two Core Workflows

### Workflow 1: Generate a new image from scratch

1. Build your JSON prompt (manually or with a tool like this app)
2. Go to Gemini / AI Studio, select Nano Banana 2
3. Paste this prompt:

```
Generate an image based on the following JSON:

{ ...your JSON here... }
```

---

### Workflow 2: Edit an existing image with full control (most powerful)

This is the technique that went viral (31K+ views on the "JSON Control Hack" video).

**Step 1 — Extract the image DNA:**
Upload your photo, then send:
```
Analyze this image and output all its details in JSON format — include subject,
lighting, colors, composition, camera settings, weather, and background elements.
```

**Step 2 — Modify only what you want:**
Take the JSON Gemini returns. Change a single field (e.g. `"weather": "rainy"`, or `"sofa_color": "light blue"`).

**Step 3 — Regenerate with control:**
```
Modify the image based on the following JSON:

{ ...your modified JSON here... }
```

Result: only the field you changed is different. Everything else stays consistent.

---

## The JSON Schema (Full Reference)

Based on the community-standard schema (alexewerlof GitHub gist + multiple tutorials):

```json
{
  "meta": {
    "aspect_ratio": "16:9 | 9:16 | 1:1 | 4:3 | 3:4 | 21:9 | 3:2",
    "quality": "ultra_photorealistic | anime_v6 | oil_painting | watercolor | pencil_sketch | 3d_render_octane | pixel_art",
    "resolution": "3840x2160 | 2560x1440 | 1920x1080 | 1024x1024",
    "seed": null,
    "steps": 40,
    "guidance_scale": 7.5,
    "magic_prompt_enhancer": true
  },
  "subject": [
    {
      "id": "main",
      "type": "person | animal | robot | cyborg | object | vehicle",
      "description": "plain English description of the subject",
      "name": "optional character name",
      "age": "optional",
      "gender": "optional",
      "hair": { "style": "wavy", "color": "blonde" },
      "position": "center frame",
      "pose": "standing, facing camera",
      "expression": "smiling, warm",
      "clothing": [
        { "item": "dress", "color": "red", "fabric": "linen", "fit": "fitted" }
      ],
      "accessories": [
        { "item": "sunglasses", "material": "gold frame", "location": "on face" }
      ]
    }
  ],
  "scene": {
    "location": "description of environment",
    "time": "golden_hour | blue_hour | high_noon | midnight | sunrise | sunset | twilight",
    "weather": "clear_skies | overcast | rainy | stormy | snowing | foggy | hazy",
    "lighting": {
      "type": "natural sunlight | studio softbox | dramatic chiaroscuro | neon ambient | warm candlelight",
      "direction": "front | rear | 45° side | overhead | three-quarter"
    },
    "background_elements": ["cherry blossom trees", "wooden bench", "distant mountains"]
  },
  "technical": {
    "camera_model": "Sony A7R IV | iPhone 15 Pro | Leica M6 | Hasselblad X2D | 35mm film camera | GoPro Hero 12",
    "lens": "16mm ultra-wide | 35mm prime | 50mm standard prime | 85mm portrait prime | 100mm macro | 200mm telephoto",
    "aperture": "f/1.4 | f/1.8 | f/2.8 | f/8 | f/11",
    "shutter_speed": "1/1000 | 1/500 | 1/60 | long_exposure_bulb",
    "iso": 400,
    "film_stock": "Kodak Portra 400 | Fujifilm Velvia 50 | CineStill 800T"
  },
  "composition": {
    "framing": "extreme_close_up | close_up | medium_close_up | medium_shot | full_body | wide_shot | extreme_wide_shot",
    "angle": "eye_level | low_angle | high_angle | dutch_angle | bird_eye_view | aerial",
    "focus_point": "face | eyes | hands | whole_scene | foreground_object"
  },
  "text_rendering": {
    "enabled": false,
    "text_content": "short text (under 5 words works best)",
    "placement": "neon_sign_on_wall | printed_on_tshirt | floating_in_air | graffiti_on_wall",
    "font_style": "bold_sans_serif | elegant_serif | handwritten | cyberpunk_digital",
    "color": "white with glow"
  },
  "style_modifiers": {
    "medium": "photography | 3d_render | oil_painting | watercolor | anime | pencil_sketch",
    "aesthetic": ["cinematic", "vintage", "noir", "cyberpunk", "minimalist", "luxury editorial"],
    "color_palette": {
      "tone": "warm | cool | monochrome | pastel | vivid",
      "primary": "amber and gold",
      "saturation": 0.8,
      "contrast": 1.2
    },
    "artist_reference": ["Gregory Crewdson", "Annie Leibovitz"]
  },
  "advanced": {
    "negative_prompt": ["low quality", "blurry", "pixelated", "oversaturated"],
    "magic_prompt_enhancer": true,
    "hdr_mode": true
  }
}
```

---

## Key Fields Cheat Sheet

| Field | What it controls | Example values |
|-------|-----------------|----------------|
| `meta.aspect_ratio` | Canvas shape | `16:9`, `9:16`, `1:1` |
| `meta.quality` | Rendering style | `ultra_photorealistic`, `anime_v6` |
| `subject.type` | What the main subject is | `person`, `animal`, `object` |
| `subject.expression` | Facial emotion | `smiling, warm`, `serious, focused` |
| `scene.time` | Lighting mood via time | `golden_hour`, `midnight` |
| `scene.weather` | Atmosphere | `rainy`, `foggy`, `clear_skies` |
| `scene.lighting.type` | Light source | `dramatic chiaroscuro`, `studio softbox` |
| `technical.lens` | Focal length / look | `85mm portrait prime`, `16mm ultra-wide` |
| `technical.aperture` | Depth of field | `f/1.8` (blurry bg), `f/11` (sharp throughout) |
| `technical.film_stock` | Analog color grade | `Kodak Portra 400`, `CineStill 800T` |
| `composition.framing` | Shot size | `close_up`, `wide_shot`, `full_body` |
| `composition.angle` | Camera angle | `low_angle`, `bird_eye_view`, `eye_level` |
| `style_modifiers.aesthetic` | Overall vibe | `["cinematic", "vintage"]` |
| `advanced.negative_prompt` | What to exclude | `["blurry", "people in background"]` |

---

## Best Practices (from community)

1. **Always define canvas first** — set `meta.aspect_ratio` and `meta.quality` before anything else. Without it, Nano Banana picks randomly.

2. **Upload reference images** — you can upload up to 14 reference images and use JSON to specify exactly what to take from each (pose, clothing, style, etc.)

3. **Use `negative_prompt` aggressively** — always include `"low quality"`, `"blurry"`, `"pixelated"`. Add specific exclusions for your scene (e.g. `"people in background"`, `"harsh shadows"`).

4. **Keep `text_content` under 5 words** — Nano Banana 2 handles text better than most models, but accuracy drops above 5 words.

5. **`magic_prompt_enhancer: true`** — leave this on. It lets the model intelligently fill gaps in your prompt.

6. **Isolate variables when editing** — when editing an existing image, change only one or two fields at a time to maintain consistency.

7. **`seed` for reproducibility** — once you find a result you like, note the seed value and lock it in for future variations.

---

## What the Community Is Saying

**Reddit (r/PromptEngineering):**
> Someone shipped a live tool at z42.at/ai-art-prompter — a JSON string generator specifically optimized for Gemini/Nano Banana, confirming the community is actively building around this technique.

**Reddit (r/scintai):**
> Developers are sharing complete named schemas like `portraitstruct_v1` with task types like `vision_to_json` — the technique is maturing toward reusable, version-controlled prompt templates.

**YouTube (zapiwala ai — 31,878 views):**
> "Stop editing images in Google's Gemini Nano Banana using plain text prompts." The video demonstrates changing object colors, seasons, weather, camera angles, time of day, and age — all from a single JSON modification.

**YouTube (renderdrop — 103,731 views):**
> "We've all been there. You generate an almost perfect AI image and you just want to change one tiny detail. But the moment you adjust the prompt, the AI ruins the entire image."
> JSON prompting solves exactly this.

---

## GitHub Resources

- **awesome-nanobanana-pro** (ZeroLu) — curated prompt examples
- **awesome-nano-banana-pro-prompts** (YouMind-OpenLab) — 10,000+ prompts with preview images, 16 languages
- **gemini-image-prompting-handbook** (pauhu) — open source JSON schema for structured Gemini image prompts
- **Nano Banana structured JSON prompt Schema** (alexewerlof gist) — the community reference schema

---

## Sources

- YouTube: zapiwala ai, renderdrop, AI4Next, Artturi Explores, The Tech Changer
- Reddit: r/PromptEngineering, r/AIArt, r/GoogleGemini, r/StableDiffusion, r/scintai
- Web: aiformarketings.com, fofr.ai, atlabs.ai, cloud.google.com, eesel.ai, miraflow.ai
- GitHub: ZeroLu/awesome-nanobanana-pro, YouMind-OpenLab/awesome-nano-banana-pro-prompts, pauhu/gemini-image-prompting-handbook, alexewerlof gist
