const http = require("node:http");
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

const rootDirectory = __dirname;
const appEnvironment = process.env.APP_ENV || "development";
const envFile = path.join(rootDirectory, "env", appEnvironment, "backend-api.env");

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
      const value = trimmed.slice(separator + 1).trim();
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

const producerSettingFields = new Set([
  "producer",
  "producerFont",
  "overlayProducer",
  "theme",
  "producerPosition",
  "producerHorizontal",
  "producerNameVertical",
  "producerLogoHorizontal",
  "producerSize",
  "producerLogoSize",
  "showProducer",
]);

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
        reject(new Error("Producer preset is too large."));
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
    if (!dataUrl.startsWith("data:image/svg+xml") || dataUrl.length > 1.5 * 1024 * 1024) {
      throw new Error("Producer logo must be an SVG smaller than 1.5 MB.");
    }
    logo = {
      fileName: String(input.logo.fileName || "producer.svg").slice(0, 160),
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

async function handleApi(request, response, pathname) {
  try {
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

    sendJson(response, 404, { error: "API endpoint not found." });
  } catch (error) {
    console.error(error.message);
    const status = error.message.includes("required") || error.message.includes("Invalid") ? 400 : 500;
    sendJson(response, status, { error: error.message });
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
