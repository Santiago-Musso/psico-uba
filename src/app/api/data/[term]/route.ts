import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";

async function readJson(filePath: string) {
  const data = await fs.readFile(filePath, "utf8");
  return new Response(data, {
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=0, must-revalidate",
    },
  });
}

export async function GET(req: NextRequest, { params }: { params: { term: string } }) {
  const url = new URL(req.url);
  const file = url.pathname.split("/").pop();
  const term = params.term;

  if (!file || !/(catedras|sections|meets)\.json$/.test(file)) {
    return new Response("Not found", { status: 404 });
  }

  // Serve directly from the local psico-uba-data workspace folder
  const repoRoot = process.cwd();
  const dataPath = path.join(repoRoot, "psico-uba-data", term, file);
  try {
    return await readJson(dataPath);
  } catch (e) {
    return new Response("Not found", { status: 404 });
  }
}




