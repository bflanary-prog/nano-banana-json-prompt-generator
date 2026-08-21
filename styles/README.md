# Style Templates

Canonical structured-JSON prompts for repeatable image styles. Each template is
hand-tuned for a specific visual register and locked in once approved.

To use a style template:

    # Convert the structured JSON to plain English prose first
    # (Gemini renders raw JSON as text on the image — the JSON must be flowed
    # into descriptive sentences before being passed to generate.js).
    # See pipeline/templates/thumbnail_prompts.py:dict_to_prose() in the
    # youtube-automation repo for a reference converter.

## Templates

### `anthropomorphic-portrait.json`

**Established:** 2026-05-07 (bull-baseline approved by Brad).

**Visual register:** anthropomorphic gentleman portrait — animal head + tailored
human body, navy suit, charcoal studio backdrop, editorial-photography style
(Annie Leibovitz / Mark Seliger / Platon energy). Anthropomorphism played
straight as photography, not cartoon.

**Reference image:** generated as `output/image-1778185305697.png` (local only —
output/ is gitignored). The structured JSON in this folder is the source of
truth; regenerate from it any time.

**Critical lessons learned during tuning:**
1. Gemini renders raw JSON as literal text on the image. Always convert to
   plain English prose before sending. Drop field labels, resolve hex codes
   to friendly color names.
2. By default, Gemini renders animal heads at FULL ANIMAL ANATOMY size, which
   makes them dominate the frame on a human body. The anthropomorphic-portrait
   template includes an explicit head-sizing constraint repeated 4× across
   different prompt sections to force human-head proportions.
3. Photorealism anchors must be repeated heavily (medium-format camera,
   100MP detail, named photographer references, Kodak Portra grain). One
   mention is not enough — Gemini drifts toward illustration without it.

**Customizing for a different animal:**
- Edit `subject.head_features` — swap in the new animal's anatomical details
  (coat color, eye type, ear shape, distinguishing features). Keep the head-
  sizing constraint language untouched.
- Update `wardrobe` if you want different suit/tie colors. Steel-blue tie on
  navy suit was the approved combination.
- Everything else (composition, lighting, background, style anchors,
  anti-patterns) should stay constant — that's what makes the style
  reproducible across animals.
