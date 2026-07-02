// edit_pose.js — reference-conditioned image edit via Gemini 2.5 Flash Image
// ("Nano Banana" proper). Feeds a reference PNG + a prompt so the SAME character
// is re-posed, keeping colors/shading/proportions.
//
//   node edit_pose.js <ref.png> <out_name> "<prompt>"
const fs = require("fs");
const https = require("https");
const { execSync, spawn } = require("child_process");
const path = require("path");

const OUT = path.join(__dirname, "output");
const MODEL = "gemini-3-pro-image";

function key() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  return execSync("security find-generic-password -s nano-banana -a gemini_api_key -w",
    { encoding: "utf8" }).trim();
}

function call(body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: "generativelanguage.googleapis.com",
      path: `/v1beta/models/${MODEL}:generateContent?key=${key()}`,
      method: "POST",
      headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(data) },
    }, (res) => {
      let buf = "";
      res.on("data", (d) => (buf += d));
      res.on("end", () => {
        try {
          const j = JSON.parse(buf);
          const parts = j?.candidates?.[0]?.content?.parts || [];
          const img = parts.find((p) => p.inlineData || p.inline_data);
          if (!img) return reject(new Error("No image in response: " + buf.slice(0, 400)));
          resolve((img.inlineData || img.inline_data).data);
        } catch (e) { reject(new Error(e.message + " :: " + buf.slice(0, 400))); }
      });
    });
    req.on("error", reject);
    req.write(data); req.end();
  });
}

(async () => {
  const [ref, name, prompt] = process.argv.slice(2);
  if (!ref || !name || !prompt) {
    console.error('usage: node edit_pose.js <ref.png> <out_name> "<prompt>"'); process.exit(1);
  }
  const refB64 = fs.readFileSync(ref).toString("base64");
  console.log(`Editing ${ref} -> ${name} ...`);
  const b64 = await call({
    contents: [{ parts: [
      { inline_data: { mime_type: "image/png", data: refB64 } },
      { text: prompt },
    ] }],
  });
  fs.mkdirSync(OUT, { recursive: true });
  const file = path.join(OUT, `${name}.png`);
  fs.writeFileSync(file, Buffer.from(b64, "base64"));
  console.log("Wrote " + file);
  spawn("cursor", [file], { detached: true, stdio: "ignore" }).unref();
})();
