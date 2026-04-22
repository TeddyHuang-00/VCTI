import fs from "node:fs";
import path from "node:path";
import sharp from "sharp";

const EXTENSIONS = new Set([".png", ".jpg", ".jpeg"]);

async function compressFile(filePath: string): Promise<void> {
  const ext = path.extname(filePath).toLowerCase();
  if (!EXTENSIONS.has(ext)) return;

  const input = fs.readFileSync(filePath);
  const originalSize = input.length;

  let pipeline = sharp(input);

  if (ext === ".png") {
    pipeline = pipeline.png({ compressionLevel: 9, palette: true });
  } else {
    pipeline = pipeline.jpeg({ quality: 80, mozjpeg: true });
  }

  const output = await pipeline.toBuffer();

  // Only overwrite if compression actually reduced size
  if (output.length < originalSize) {
    fs.writeFileSync(filePath, output);
    const saved = ((1 - output.length / originalSize) * 100).toFixed(1);
    console.log(
      `  compressed ${path.basename(filePath)}: ${(originalSize / 1024).toFixed(0)}K → ${(output.length / 1024).toFixed(0)}K (${saved}% saved)`
    );
  }
}

async function walkDir(dir: string): Promise<string[]> {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walkDir(fullPath)));
    } else {
      files.push(fullPath);
    }
  }
  return files;
}

export async function compressAssets(dir: string): Promise<void> {
  if (!fs.existsSync(dir)) return;

  const files = await walkDir(dir);
  console.log(`compressing ${files.length} assets in ${dir}...`);
  await Promise.all(files.map(compressFile));
}
