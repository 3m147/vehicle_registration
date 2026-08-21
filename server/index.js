import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const publicDir = fileURLToPath(new URL("../public/", import.meta.url));

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
};

function getSafeFilePath(pathname) {
  const decodedPath = decodeURIComponent(pathname);
  const normalizedPath = normalize(decodedPath).replace(/^(\.\.[/\\])+/, "");
  const relativePath = normalizedPath === "/" || normalizedPath === "." ? "index.html" : normalizedPath.replace(/^[/\\]/, "");
  const filePath = join(publicDir, relativePath);

  if (!filePath.startsWith(publicDir)) {
    return join(publicDir, "index.html");
  }

  return filePath;
}

async function serveStaticFile(request) {
  const url = new URL(request.url);
  let filePath = getSafeFilePath(url.pathname);

  if (!existsSync(filePath) || (await stat(filePath)).isDirectory()) {
    filePath = join(publicDir, "index.html");
  }

  const headers = {
    "content-type": contentTypes[extname(filePath)] || "application/octet-stream"
  };

  return new Response(createReadStream(filePath), { headers });
}

export default {
  fetch: serveStaticFile
};

if (process.env.PORT) {
  const server = createServer(async (request, response) => {
    const body = await serveStaticFile(new Request(`http://localhost${request.url}`));
    response.writeHead(body.status, Object.fromEntries(body.headers));
    response.end(Buffer.from(await body.arrayBuffer()));
  });

  server.listen(Number(process.env.PORT));
}
