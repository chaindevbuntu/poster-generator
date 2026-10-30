const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

const rootDirectory = __dirname;
const appEnvironment = process.env.APP_ENV || "development";
const envFile = path.join(rootDirectory, "env", appEnvironment, "backend-api.env");

// Pasted secrets often arrive wrapped in quotes, and chat apps turn the closing one curly.
function unquoteEnvValue(value) {
  const quoted = /^["'\u201c\u2018]([\s\S]*)["'\u201d\u2019]$/.exec(value);
  return quoted ? quoted[1].trim() : value;
}

function loadEnvironment(filePath) {
  if (!fs.existsSync(filePath)) return;

  fs.readFileSync(filePath, "utf8")
    .split(/\r?\n/)
    .forEach((line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) return;

      const separator = trimmed.indexOf("=");
      if (separator < 1) return;

      const key = trimmed.slice(0, separator).trim();
      const value = unquoteEnvValue(trimmed.slice(separator + 1).trim());
      if (process.env[key] === undefined) process.env[key] = value;
    });
}

loadEnvironment(envFile);

const port = Number(process.env.PORT || 8000);
const supabaseUrl = process.env.SUPABASE_URL?.replace(/\/$/, "");
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const producerBucket = process.env.SUPABASE_PRODUCER_BUCKET || "producer-presets";
let bucketReady = false;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(`Missing Supabase settings in ${envFile}`);
  process.exit(1);
}

const allowedLogoDataUrlPrefixes = ["data:image/svg+xml", "data:image/png"];

const openAiApiKey = process.env.OPENAI_API_KEY;
const removeTextModel = process.env.OPENAI_IMAGE_MODEL || "gpt-image-2";
// 1024x1376 is close to the 427x575 poster ratio and stays within the model's size grid.
const removeTextSize = process.env.OPENAI_IMAGE_SIZE || "1024x1376";
const removeTextQualities = new Set(["low", "medium", "high"]);
const removeTextMaxBodyBytes = 12 * 1024 * 1024;
/* Naming the objects worth keeping (cards, reels, chips...) made the model treat
   them as things to draw, so this states the edit and the invariants instead and
   never enumerates subject matter. */
const removeTextPromptPrefix = [
  "Remove only the overlaid title lettering, studio or provider name, logos and",
  "watermarks that sit on top of the artwork. Do not change any other aspect of",
  "the image. Keep the same subject, pose, composition, framing, art style,",
  "lighting, colour palette and background exactly as they are. Do not add,",
  "invent or introduce any new object, prop, character, symbol, scenery or",
  "decoration that is not already visible in the input image. Lettering that is",
  "physically printed on an object already present must stay unchanged. Where",
  "text is removed, continue the surrounding background behind it.",
].join(" ");

const producerSettingFields = new Set(["producer"]);

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function sendJson(response, status, value) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
  });
  response.end(JSON.stringify(value));
}

async function supabaseStorageRequest(endpoint, options = {}) {
  const response = await fetch(`${supabaseUrl}/storage/v1${endpoint}`, {
    ...options,
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      ...options.headers,
    },
  });

  if (!response.ok) {
    const message = await response.text();
    const error = new Error(`Supabase Storage returned ${response.status}: ${message.slice(0, 240)}`);
    error.status = response.status;
    throw error;
  }

  return response;
}

async function ensureProducerBucket() {
  if (bucketReady) return;

  try {
    await supabaseStorageRequest(`/bucket/${encodeURIComponent(producerBucket)}`);
  } catch (error) {
    const bucketMissing =
      [400, 404].includes(error.status) && error.message.includes("Bucket not found");
    if (!bucketMissing) throw error;

    await supabaseStorageRequest("/bucket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: producerBucket,
        name: producerBucket,
        public: false,
        file_size_limit: 2 * 1024 * 1024,
        allowed_mime_types: ["application/json"],
      }),
    });
  }

  bucketReady = true;
}

function readJsonBody(request, maxBytes = 2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    let size = 0;

    request.on("data", (chunk) => {
      size += chunk.length;
      if (size > maxBytes) {
        reject(new Error("Request body is too large."));
        request.destroy();
        return;
      }
      chunks.push(chunk);
    });
    request.on("end", () => {
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString("utf8") || "{}"));
      } catch (error) {
        reject(new Error("Request body must be valid JSON."));
      }
    });
    request.on("error", reject);
  });
}

function sanitizeProducerPreset(input) {
  const name = typeof input.name === "string" ? input.name.trim().slice(0, 80) : "";
  if (!name) throw new Error("Producer preset name is required.");

  const requestedId = typeof input.id === "string" ? input.id : "";
  const id = /^[a-zA-Z0-9-]{8,80}$/.test(requestedId) ? requestedId : randomUUID();
  const settings = {};

  producerSettingFields.forEach((field) => {
    const value = input.settings?.[field];
    if (value === undefined) return;
    settings[field] = typeof value === "boolean" ? value : String(value).slice(0, 240);
  });

  let logo = null;
  if (input.logo?.dataUrl) {
    const dataUrl = String(input.logo.dataUrl);
    const isAllowedType = allowedLogoDataUrlPrefixes.some((prefix) => dataUrl.startsWith(prefix));
    if (!isAllowedType || dataUrl.length > 1.5 * 1024 * 1024) {
      throw new Error("Producer logo must be an SVG or PNG smaller than 1.5 MB.");
    }
    logo = {
      fileName: String(input.logo.fileName || "producer-logo").slice(0, 160),
      dataUrl,
    };
  }

  return {
    version: 1,
    id,
    name,
    settings,
    logo,
    updatedAt: new Date().toISOString(),
  };
}

async function listProducerPresets() {
  await ensureProducerBucket();
  const listResponse = await supabaseStorageRequest(`/object/list/${encodeURIComponent(producerBucket)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      prefix: "presets",
      limit: 100,
      offset: 0,
      sortBy: { column: "updated_at", order: "desc" },
    }),
  });
  const objects = await listResponse.json();
  const presetObjects = objects.filter((object) => object.name?.endsWith(".json"));
  const loadedPresets = await Promise.allSettled(
    presetObjects.map(async (object) => {
      const objectPath = object.name.startsWith("presets/")
        ? object.name
        : `presets/${object.name}`;
      const response = await supabaseStorageRequest(
        `/object/${encodeURIComponent(producerBucket)}/${objectPath}`,
      );
      return response.json();
    }),
  );

  return loadedPresets
    .filter((result) => result.status === "fulfilled")
    .map((result) => result.value)
    .sort((first, second) => String(second.updatedAt).localeCompare(String(first.updatedAt)));
}

async function saveProducerPreset(request) {
  await ensureProducerBucket();
  const input = await readJsonBody(request);
  const preset = sanitizeProducerPreset(input);
  const objectPath = `presets/${preset.id}.json`;

  await supabaseStorageRequest(
    `/object/${encodeURIComponent(producerBucket)}/${objectPath}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-upsert": "true",
      },
      body: JSON.stringify(preset),
    },
  );

  return preset;
}

async function deleteProducerPreset(id) {
  if (!/^[a-zA-Z0-9-]{8,80}$/.test(id)) throw new Error("Invalid producer preset id.");

  await ensureProducerBucket();
  await supabaseStorageRequest(`/object/${encodeURIComponent(producerBucket)}`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: [`presets/${id}.json`] }),
  });
}

function parseImageDataUrl(value) {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(value || ""));
  if (!match) throw new Error("A PNG, JPEG or WebP image is required.");

  return { mimeType: match[1], data: Buffer.from(match[2], "base64") };
}

async function removeTextFromImage(request) {
  if (!openAiApiKey) {
    const error = new Error("Image redraw is unavailable: OPENAI_API_KEY is not set on the server.");
    error.status = 503;
    throw error;
  }

  // A key with stray quotes or spaces would otherwise fail deep inside the header encoder.
  if (!/^[\x21-\x7e]+$/.test(openAiApiKey)) {
    const error = new Error(
      "Image redraw is unavailable: OPENAI_API_KEY contains characters that cannot be sent in a request header. Store the key on its own, without quotes.",
    );
    error.status = 503;
    throw error;
  }

  const input = await readJsonBody(request, removeTextMaxBodyBytes);
  const { mimeType, data } = parseImageDataUrl(input.imageDataUrl);
  const instruction = typeof input.prompt === "string" ? input.prompt.trim().slice(0, 600) : "";
  const quality = removeTextQualities.has(input.quality) ? input.quality : "medium";
  const form = new FormData();

  form.append("model", removeTextModel);
  form.append("size", removeTextSize);
  form.append("quality", quality);
  form.append("n", "1");
  form.append(
    "prompt",
    instruction ? `${removeTextPromptPrefix}\n\n${instruction}` : removeTextPromptPrefix,
  );
  form.append(
    "image",
    new Blob([data], { type: mimeType }),
    `background.${mimeType.slice("image/".length)}`,
  );

  const openAiResponse = await fetch("https://api.openai.com/v1/images/edits", {
    method: "POST",
    headers: { Authorization: `Bearer ${openAiApiKey}` },
    body: form,
  });
  const result = await openAiResponse.json().catch(() => null);

  if (!openAiResponse.ok) {
    const error = new Error(result?.error?.message || `OpenAI returned ${openAiResponse.status}.`);
    error.status = 502;
    throw error;
  }

  const encodedImage = result?.data?.[0]?.b64_json;
  if (!encodedImage) {
    const error = new Error("OpenAI did not return an image.");
    error.status = 502;
    throw error;
  }

  return `data:image/png;base64,${encodedImage}`;
}

// Batch import uses a fixed CDN boundary; arbitrary remote URLs are never proxied.
const batchCdnOrigin = "https://cdn.zmsfnxxx.xyz";
const batchCatalogCache = new Map();

function validateBatchCdnUrl(value, kind) {
  let url;
  try { url = new URL(value); } catch { throw Object.assign(new Error("Invalid CDN URL."), { status: 400 }); }
  const validPath = kind === "catalog"
    ? /^\/l\/[a-zA-Z0-9_-]+\.json$/.test(url.pathname)
    : /^\/i\/s6\/[a-zA-Z0-9_-]+\/[^/]+\.png$/.test(url.pathname);
  let decoded;
  try { decoded = decodeURIComponent(url.pathname); } catch { decoded = ""; }
  if (url.origin !== batchCdnOrigin || url.username || url.password || url.search || url.hash || !validPath ||
      !decoded || decoded.includes("\\") || decoded.split("/").some(part => part === "." || part === "..") ||
      (kind === "image" && decoded.split("/").length !== 5)) {
    throw Object.assign(new Error("Use a catalog or image URL from the configured game CDN."), { status: 400 });
  }
  return url;
}

async function readBatchCdn(url, maxBytes) {
  const result = await fetch(url, { redirect: "manual", signal: AbortSignal.timeout(45000) });
  if (!result.ok) { await result.body?.cancel(); throw Object.assign(new Error(`CDN returned ${result.status}.`), { status: 502 }); }
  if (Number(result.headers.get("content-length")) > maxBytes) {
    await result.body?.cancel();
    throw Object.assign(new Error("CDN file is too large."), { status: 413 });
  }
  const chunks = [];
  let bytes = 0;
  for await (const chunk of result.body) {
    bytes += chunk.length;
    if (bytes > maxBytes) throw Object.assign(new Error("CDN file is too large."), { status: 413 });
    chunks.push(chunk);
  }
  return { data: Buffer.concat(chunks), type: (result.headers.get("content-type") || "").split(";")[0] };
}

function normalizeBatchCatalog(input) {
  const rows = Array.isArray(input) ? input : input?.games;
  if (!Array.isArray(rows)) throw Object.assign(new Error("Catalog must be an array or a games array."), { status: 400 });
  const seen = new Set();
  const games = [];
  for (const row of rows) {
    if (!row || typeof row.identifier !== "string" || typeof row.title !== "string") continue;
    const separator = row.identifier.indexOf(":");
    const folder = row.identifier.slice(0, separator);
    const id = row.identifier.slice(separator + 1);
    if (separator < 1 || !/^[a-zA-Z0-9_-]+$/.test(folder) || !id || id.length > 240 ||
        /[/\\\x00-\x1f]/.test(id) || id === "." || id === ".." || seen.has(row.identifier)) continue;
    seen.add(row.identifier);
    games.push({ key: row.identifier, id, name: row.title.slice(0, 240), producer: String(row.producer || folder).slice(0, 100),
      folder, imageUrl: `${batchCdnOrigin}/i/s6/${folder}/${encodeURIComponent(id)}.png` });
  }
  if (!games.length) throw Object.assign(new Error("No usable title / identifier records in this catalog."), { status: 400 });
  return { games, skipped: rows.length - games.length };
}

async function handleBatchApi(request, response, pathname) {
  const query = new URL(request.url, "http://localhost").searchParams;
  if (pathname === "/api/batch/catalog") {
    const url = validateBatchCdnUrl(query.get("url"), "catalog");
    const cache = batchCatalogCache.get(url.href);
    if (cache && Date.now() - cache.at < 300000) { sendJson(response, 200, cache.catalog); return; }
    const { data } = await readBatchCdn(url, 12 * 1024 * 1024);
    let source;
    try { source = JSON.parse(data.toString("utf8")); } catch { throw Object.assign(new Error("CDN did not return valid JSON."), { status: 502 }); }
    const catalog = normalizeBatchCatalog(source);
    if (batchCatalogCache.size >= 64) batchCatalogCache.delete(batchCatalogCache.keys().next().value);
    batchCatalogCache.set(url.href, { at: Date.now(), catalog });
    sendJson(response, 200, catalog);
    return;
  }
  const url = validateBatchCdnUrl(query.get("url"), "image");
  const { data, type } = await readBatchCdn(url, 20 * 1024 * 1024);
  if (!["image/png", "image/jpeg", "image/webp"].includes(type)) {
    throw Object.assign(new Error("CDN did not return a supported image."), { status: 502 });
  }
  response.writeHead(200, { "Content-Type": type, "Content-Length": data.length, "Cache-Control": "private, max-age=3600", "X-Content-Type-Options": "nosniff" });
  response.end(data);
}


async function handleApi(request, response, pathname) {
  try {
    if (["/api/batch/catalog", "/api/batch/image"].includes(pathname) && request.method === "GET") {
      await handleBatchApi(request, response, pathname);
      return;
    }

    if (pathname === "/api/producer-presets" && request.method === "GET") {
      sendJson(response, 200, { presets: await listProducerPresets() });
      return;
    }

    if (pathname === "/api/producer-presets" && request.method === "POST") {
      sendJson(response, 200, { preset: await saveProducerPreset(request) });
      return;
    }

    if (pathname.startsWith("/api/producer-presets/") && request.method === "DELETE") {
      const id = decodeURIComponent(pathname.slice("/api/producer-presets/".length));
      await deleteProducerPreset(id);
      sendJson(response, 200, { ok: true });
      return;
    }

    if (pathname === "/api/remove-text" && request.method === "POST") {
      sendJson(response, 200, { imageDataUrl: await removeTextFromImage(request) });
      return;
    }

    sendJson(response, 404, { error: "API endpoint not found." });
  } catch (error) {
    console.error(error.message);
    const fallbackStatus =
      error.message.includes("required") || error.message.includes("Invalid") ? 400 : 500;
    sendJson(response, error.status || fallbackStatus, { error: error.message });
  }
}

function serveStaticFile(response, pathname) {
  const requestedPath = pathname === "/" ? "index.html" : decodeURIComponent(pathname.slice(1));
  const filePath = path.resolve(rootDirectory, requestedPath);

  if (!filePath.startsWith(`${rootDirectory}${path.sep}`) || !fs.existsSync(filePath)) {
    sendJson(response, 404, { error: "File not found." });
    return;
  }

  const stat = fs.statSync(filePath);
  if (!stat.isFile()) {
    sendJson(response, 404, { error: "File not found." });
    return;
  }

  response.writeHead(200, {
    "Content-Type": contentTypes[path.extname(filePath).toLowerCase()] || "application/octet-stream",
    "Cache-Control": "no-cache",
  });
  fs.createReadStream(filePath).pipe(response);
}

const server = http.createServer(async (request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host || "localhost"}`);

  if (requestUrl.pathname.startsWith("/api/")) {
    await handleApi(request, response, requestUrl.pathname);
    return;
  }

  if (!["GET", "HEAD"].includes(request.method)) {
    sendJson(response, 405, { error: "Method not allowed." });
    return;
  }

  serveStaticFile(response, requestUrl.pathname);
});

server.listen(port, () => {
  console.log(`Poster app running at http://localhost:${port}`);
});
