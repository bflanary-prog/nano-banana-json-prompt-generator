# CASH - Plainspoke Mascot Reel

Director handoff for building Cash as a consistent 2.5D retro rubber-hose mascot reel.

Primary brand references:

- `../../plainspoke/brand/rig/expressions.png`
- `../../plainspoke/brand/rig/dollar_hero.svg`
- `../../plainspoke/brand/rig/blender/mascot_build.py`

## Timing Lock

- Frame rate: 24 fps
- Total runtime: 552 frames / 23 seconds
- Resolution: 1920x1080, with 1024x1024 square adaptation allowed
- Camera: locked orthographic, straight-on

Important correction: source spec lists shot 1 as `3.5 sec` and also `frames 1-60`. At 24 fps, 60 frames is 2.5 seconds. This package preserves the requested 3.5-second timing, so shot 1 is frames `1-84`. Shot 5 mirrors that exactly.

## Character Lock

Cash must stay identical across every frame:

- Body silhouette is a chunky Arial Black dollar-sign glyph, not a generic rounded pillar.
- Teal body gradient from bright top `#48ecd6` through body teal `#27c8b4` to deep lower teal `#149083`.
- Center cream stripe is the same dollar-sign glyph clipped to the vertical center strip, with cream highlight `#fcefce` and warm cream shadow `#eccd95`.
- Lower-right bevel/extrusion reads peach-orange/warm cream, consistent with the expression sheet.
- Dark facial linework and pupils use `#16202e`.
- Soft cheek blush uses warm coral/pink, low opacity.
- Big eyes with tall oval pupils
- Rubber-hose teal arms
- Stubby teal legs
- Friendly, encouraging grin

Do not alter proportions between shots. Do not redraw Cash as a coin, blob, rectangle, or plain vertical mascot. Keep the dollar-sign negative spaces and the two vertical strokes intact. Do not flip bevel direction during profile turns; the lower-right warm extrusion remains the visual anchor.

## Scene Lock

Use a dark warm background gradient close to the rig source, from `#42301d` to `#140e07`, subtle vignette, one soft key from upper-left, and a soft amber rim glow. Render flat cel planes with clean 2.5D bevel illusion. No texture noise, no shifting light, no camera move.

Grounding depends on the shadow. Use one soft oval drop shadow under Cash for the entire reel. The shadow compresses wider on contact/squash and shrinks at jump apex, but it never detaches or drifts.

## Shot Plan

### 1. Walk In From Right - Frames 1-84

Cash starts fully off-screen right in left profile. Use a 16-frame contact/down/passing/up walk cycle. Body dips at contact and rises at passing/up. Arms counter-swing naturally. Feet must plant, push, then release; never translate both feet together.

Frames `69-76` decelerate with shorter steps and reduced bob. Frames `77-84` turn from profile to three-quarter to front. Eyes lead the turn, then body follows.

### 2. Presenter Idle - Frames 85-132

Front-facing idle. Use 1-2 percent breathing squash/stretch only. Add one blink, max 6 frames. Tiny eye micro-movements are allowed. Body center and drop shadow stay locked.

### 3. Presentation Pose Cycle - Frames 133-300

Eight pose blocks, 21 frames each:

1. Happy, hands on hips.
2. Confident, sunglasses from the expression sheet allowed, but keep grin friendly and not smug.
3. Thinking, hand to chin, eyes up-left.
4. Excited, arms raised, star pupils only briefly.
5. Point left, clear extension and slight torso lean.
6. Point right, mirrored.
7. Present, both palms open to viewer.
8. Wave, two smooth rubber-hose arcs.

For each block: 3 frames anticipation, 6 frames ease in, brief readable hold, then overlapping ease out. Arms may overlap body for elasticity. Feet stay planted.

### 4. Double Jump Celebration - Frames 301-396

Two 48-frame jumps. Each jump has:

- Anticipation: 6-8 frames, 10-15 percent squash, arms swing down, shadow widens.
- Launch: 6 frames, stretch vertically, arms whip upward, feet clearly leave ground.
- Apex: 6-9 frames, fists overhead, hang-time, smallest shadow.
- Landing: 8 frames, strong squash, shadow expands.
- Rebound: settle back to neutral.

Second jump should not feel copy-pasted. Vary the apex by a few pixels and use a slight asymmetric fist pump.

### 5. Walk In From Left - Frames 397-480

Mirror shot 1. Same stride length, same cycle timing, same deceleration timing, same turn duration. Cash is right profile while entering. Foot locks and body bob must match shot 1.

### 6. Final Fist Pump - Frames 481-552

Front-facing hero pose. Both fists at chest/shoulder height, big excited smile, two small celebratory bounce compressions, then stable freeze-worthy hold. No drift in the final 36 frames.

## AI Video Prompt

Use this as the master prompt with a reference image of Cash:

```text
Create a 23 second 2.5D retro rubber-hose cartoon mascot reel for Cash, the Plainspoke mascot. Locked orthographic camera, straight-on, 1920x1080, 24 fps. Cash is a chunky Arial Black dollar-sign glyph mascot, not a generic pillar. Preserve the exact dollar-sign silhouette with negative spaces, two vertical strokes, teal body gradient #48ecd6 to #27c8b4 to #149083, center cream dollar-sign stripe clipped vertically with #fcefce and #eccd95, warm peach-orange lower-right bevel/extrusion, dark facial linework #16202e, oval eyes, brows, subtle cheek blush, rubber-hose teal arms, stubby teal legs, friendly encouraging grin. Background gradient #42301d to #140e07 with subtle vignette. Single soft upper-left key light and soft amber rim glow. Flat cel shading, no texture noise.

Sequence: Cash walks in from off-screen right in left profile with planted feet and natural body bob, turns to front, holds presenter idle, cycles through happy, confident, thinking, excited, point left, point right, present, and wave poses, performs two celebration jumps with clear airborne feet and squash/stretch landings, walks in from off-screen left in right profile with matching timing, turns front, and ends in a fist-pump hero pose.

Maintain identical character model from the expression sheet, exact color hex values, same lower-right bevel direction, same upper-left lighting, no model drift, no proportion changes, no camera movement, no background change. Feet plant and push off visibly. Shadow stays anchored to feet.
```

Negative prompt:

```text
no perspective distortion, no camera zoom, no logo, no text, no watermark, no extra limbs, no extra fingers, no color shifts, no lighting change, no morphing, no jitter, no foot sliding, no shadow detachment, no texture noise, no smug expression, no generic mascot body, no coin character, no plain rectangle body, no missing dollar-sign cutouts
```

## Reference-Pose Workflow

If no approved Cash still exists yet, generate one from the base reference JSON:

```bash
node generate.js --json cash-reel/base-reference.json
```

Use existing `edit_pose.js` to generate pose references from one approved Cash still before attempting video generation.

```bash
node cash-reel/pose-prompts.js path/to/cash-reference.png
```

The utility prints `edit_pose.js` commands for a small approved pose board. Add `--run` to execute the commands. Generate those stills first, reject any that drift off model, then feed approved stills into the animation tool as reference images.

## Export QC

Before final export:

- Feet never slide.
- Drop shadow always touches ground under feet.
- Dollar-sign silhouette and negative spaces remain readable.
- Cream center stripe remains clipped to the dollar glyph and vertically centered.
- Warm bevel/extrusion remains lower-right.
- Pupils stay tall oval except brief star-pupil effect.
- No lighting flip or camera move.
- No jitter between frames.
- Walk stride length matches from both directions.
- Smile reads "I've got you," not smug or salesy.
