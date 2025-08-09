import { NextRequest } from "next/server";
import { promises as fs } from "fs";
import path from "path";

export async function GET(_req: NextRequest, {
  params,
}: { params: { term: string; file: string } }) {
  const { term, file } = params;
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




