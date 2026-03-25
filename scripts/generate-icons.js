// アイコン生成スクリプト（Node.jsで実行）
// このスクリプトは、SVGアイコンからPNGアイコンを生成します
// 実行には sharp パッケージが必要です: npm install sharp

const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const sizes = [192, 512];

async function generateIcons() {
  const svgPath = path.join(__dirname, '../public/icon.svg');
  const outputDir = path.join(__dirname, '../public');

  if (!fs.existsSync(svgPath)) {
    console.error('icon.svg not found!');
    return;
  }

  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
    try {
      await sharp(svgPath)
        .resize(size, size)
        .png()
        .toFile(outputPath);
      console.log(`✓ Generated ${outputPath}`);
    } catch (error) {
      console.error(`Error generating ${outputPath}:`, error);
    }
  }
}

generateIcons();

