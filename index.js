// stitch.js
import fs from "fs";
import path from "path";
import sharp from "sharp";

async function stitchPNGs() {
  // Change this if your desktop path differs
  const desktopPath = path.join(process.env.HOME || process.env.USERPROFILE, "Desktop");

  // Get PNG files
  let files = fs.readdirSync(desktopPath)
    .filter(file => file.toLowerCase().endsWith(".png"))
    .map(file => {
      const filePath = path.join(desktopPath, file);
      const stats = fs.statSync(filePath);
      return { file: filePath, time: stats.mtime }; // modified time
    });

  if (files.length === 0) {
    console.log("No PNG files found on Desktop.");
    return;
  }

  // Sort by timestamp
  files.sort((a, b) => a.time - b.time);

  // Load images into buffers
  const images = await Promise.all(files.map(f => sharp(f.file).toBuffer()));

  // Get metadata to align them properly
  const metas = await Promise.all(images.map(img => sharp(img).metadata()));

  // Place them vertically (you could also place horizontally by changing extend direction)
  const totalHeight = metas.reduce((sum, m) => sum + m.height, 0);
  const maxWidth = Math.max(...metas.map(m => m.width));

  // Create a big canvas
  let y = 0;
  let compositeList = [];
  for (let i = 0; i < images.length; i++) {
    compositeList.push({
      input: images[i],
      top: y,
      left: 0,
    });
    y += metas[i].height;
  }

  // Stitch them together
  await sharp({
    create: {
      width: maxWidth,
      height: totalHeight,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 }
    }
  })
    .composite(compositeList)
    .toFile(path.join(desktopPath, "stitched.png"));

  console.log("✅ Stitched image saved as stitched.png on Desktop");
}

stitchPNGs().catch(console.error);
