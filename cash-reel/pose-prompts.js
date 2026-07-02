#!/usr/bin/env node
const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");

const repoRoot = path.resolve(__dirname, "..");
const editPose = path.join(repoRoot, "edit_pose.js");
const args = process.argv.slice(2);
const run = args.includes("--run");
const ref = args.find((arg) => arg !== "--run");

if (!ref) {
  console.error("Usage: node cash-reel/pose-prompts.js <cash-reference.png> [--run]");
  process.exit(1);
}

const refPath = path.resolve(ref);
if (!fs.existsSync(refPath)) {
  console.error(`Reference image not found: ${refPath}`);
  process.exit(1);
}

const consistency = [
  "Use the supplied reference image as the exact Cash model and match the Plainspoke expression-sheet style.",
  "Cash is a chunky Arial Black dollar-sign glyph mascot with readable negative spaces, not a generic pillar, coin, or rounded rectangle.",
  "Preserve identical proportions, teal top highlight #48ecd6, teal base #27c8b4, teal lower shadow #149083, center cream stripe #fcefce to #eccd95 clipped to the dollar-sign vertical strokes, warm peach-orange lower-right bevel #f88652, and dark facial linework #16202e.",
  "Keep locked orthographic straight-on camera, flat cel shading, soft upper-left key light, warm dark gradient background, subtle cheek blush, expressive brows, and grounded oval drop shadow.",
  "No text, logo, watermark, extra limbs, extra fingers, color shift, lighting shift, perspective distortion, morphing, missing dollar-sign cutouts, or off-model face."
].join(" ");

const poses = [
  {
    name: "cash_pose_01_front_idle",
    prompt: "Front-facing presenter idle. Cash stands centered as the dollar-sign mascot with relaxed curved arms, tiny friendly grin, tall oval pupils, brows neutral, stubby legs planted, steady grounded drop shadow."
  },
  {
    name: "cash_pose_02_left_profile_walk_contact",
    prompt: "Left profile walk-cycle contact pose, entering from screen right. One foot planted flat and visibly supporting weight, opposite foot back about to push off, arms counter-swing, body slightly squashed on contact, drop shadow compressed under planted foot."
  },
  {
    name: "cash_pose_03_right_profile_walk_contact",
    prompt: "Right profile walk-cycle contact pose, entering from screen left. Mirror of left profile contact pose with same stride length and body squash, planted foot locked, arms counter-swing, drop shadow compressed under planted foot."
  },
  {
    name: "cash_pose_04_happy_hands_on_hips",
    prompt: "Happy presentation pose from the expression sheet. Front-facing Cash with both hands on hips, chest lifted, bright friendly grin, eyes open and encouraging, feet planted, no smugness."
  },
  {
    name: "cash_pose_04b_confident_sunglasses",
    prompt: "Confident presentation pose from the expression sheet. Front-facing Cash wears black sunglasses, both hands on hips, relaxed cool grin but not smug, feet planted, dollar-sign silhouette unchanged."
  },
  {
    name: "cash_pose_05_thinking",
    prompt: "Thinking pose from the expression sheet. Front-facing Cash with one rubber-hose hand touching chin, brows curious, eyes looking up-left, soft curious smile, other arm relaxed behind body, feet planted, cream stripe centered."
  },
  {
    name: "cash_pose_06_excited_star_pupils",
    prompt: "Excited pose. Front-facing Cash with both arms raised overhead, brief star-shaped pupils inside original eye shapes, big delighted grin, body slightly stretched upward, feet planted, shadow slightly narrower."
  },
  {
    name: "cash_pose_07_point_left",
    prompt: "Point-left pose. Front-facing Cash leaning slightly left, left arm extended clearly toward screen left, right arm balancing near body, friendly presenter smile, feet planted, shadow still anchored."
  },
  {
    name: "cash_pose_08_point_right",
    prompt: "Point-right pose. Front-facing Cash leaning slightly right, right arm extended clearly toward screen right, left arm balancing near body, friendly presenter smile, feet planted, shadow still anchored."
  },
  {
    name: "cash_pose_09_present_palms",
    prompt: "Present pose. Front-facing Cash with both palms open toward viewer, elbows soft and rubber-hose curved, inviting grin, stable centered body, grounded drop shadow."
  },
  {
    name: "cash_pose_10_jump_apex",
    prompt: "Celebration jump apex pose. Cash fully airborne, both fists pumped overhead, big excited grin, body slightly stretched, feet clearly off ground, shadow small and centered below."
  },
  {
    name: "cash_pose_11_jump_landing",
    prompt: "Celebration landing pose. Cash has just landed with strong squash, arms settling outward, big happy grin, feet planted wide, shadow widest and compressed directly under feet."
  },
  {
    name: "cash_pose_12_final_fist_pump",
    prompt: "Final hero pose. Front-facing Cash with both fists at chest to shoulder height, big excited encouraging smile, stable freeze-frame silhouette, feet planted, centered shadow."
  }
];

function shellQuote(value) {
  return `'${String(value).replace(/'/g, "'\\''")}'`;
}

function fullPrompt(pose) {
  return `${pose.prompt} ${consistency}`;
}

if (!run) {
  console.log("# Dry run. Review commands, then append --run to execute.");
  for (const pose of poses) {
    console.log(
      `node edit_pose.js ${shellQuote(refPath)} ${shellQuote(pose.name)} ${shellQuote(fullPrompt(pose))}`
    );
  }
  process.exit(0);
}

for (const pose of poses) {
  console.log(`\nGenerating ${pose.name}...`);
  const result = spawnSync(process.execPath, [editPose, refPath, pose.name, fullPrompt(pose)], {
    cwd: repoRoot,
    stdio: "inherit"
  });

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}
