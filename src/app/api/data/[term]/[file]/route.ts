import { promises as fs } from "fs";
import path from "path";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const file = parts[parts.length - 1];
  const term = parts[parts.length - 2];
  if (!/(?:^|\/)(catedras|sections|meets)\.json$/.test(file)) {
    return new Response("Not found", { status: 404 });
  }

  const repoRoot = process.cwd();
  const filePath = path.join(repoRoot, "psico-uba-data", term, file);
  try {
    const data = await fs.readFile(filePath, "utf8");
    return new Response(data, {
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "public, max-age=0, must-revalidate",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}




