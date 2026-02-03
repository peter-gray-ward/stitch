// stitch.js
import fs from "fs";
import path from "path";
import sharp from "sharp";

async function stitchPNGs() {
  // Get number of columns from command line
  const cols = parseInt(process.argv[2]) || 1; // Default = 1 column
  if (cols < 1) {
    console.error("❌ Invalid column count. Please provide a number >= 1.");
    return;
  }

  // Desktop path
  const desktopPath = path.join(process.env.HOME || process.env.USERPROFILE, "Desktop");

  // Get PNG files
  let files = fs.readdirSync(desktopPath)
    .filter(file => file.toLowerCase().endsWith(".png"))
    .map(file => {
      const filePath = path.join(desktopPath, file);
      const stats = fs.statSync(filePath);
      return { file: filePath, time: stats.mtime };
    });

  if (files.length === 0) {
    console.log("No PNG files found on Desktop.");
    return;
  }

  // Sort by timestamp
  files.sort((a, b) => a.time - b.time);

  // Load images and metadata
  const images = await Promise.all(files.map(f => sharp(f.file).toBuffer()));
  const metas = await Promise.all(images.map(img => sharp(img).metadata()));

  // Calculate grid layout
  const rows = Math.ceil(images.length / cols);
  const maxWidths = [];
  const rowHeights = [];

  for (let r = 0; r < rows; r++) {
    let start = r * cols;
    let end = Math.min(start + cols, images.length);
    const rowMeta = metas.slice(start, end);
    maxWidths[r] = rowMeta.reduce((sum, m) => sum + m.width, 0);
    rowHeights[r] = Math.max(...rowMeta.map(m => m.height));
  }

  const totalWidth = Math.max(...maxWidths);
  const totalHeight = rowHeights.reduce((sum, h) => sum + h, 0);

  // Create composite positions
  let compositeList = [];
  let y = 0;

  for (let r = 0; r < rows; r++) {
    let x = 0;
    for (let c = 0; c < cols; c++) {
      const idx = r * cols + c;
      if (idx >= images.length) break;
      compositeList.push({
        input: images[idx],
        left: x,
        top: y
      });
      x += metas[idx].width;
    }
    y += rowHeights[r];
  }

  // Stitch
  await sharp({
    create: {
      width: totalWidth,
      height: totalHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
    .composite(compositeList)
    .toFile(path.join(desktopPath, "stitched.png"));

  console.log(`✅ Stitched image saved as stitched.png (${cols} columns per row)`);
}

stitchPNGs().catch(console.error);
