import fs from 'node:fs';
import sharp from 'sharp';
import { ParsingContext } from 'scripts/parsers/ParsingContext';

export async function convertDocsImagesToPublic() {
  if (!ParsingContext.images.length) {
    console.log('No images to convert');
    return;
  }

  if (!fs.existsSync('./data/assets/FactoryGame')) {
    console.log('No FactoryGame folder found in data/assets');
    return;
  }

  if (fs.existsSync('./public/images/game')) {
    fs.rmSync('./public/images/game', { recursive: true });
  }
  fs.mkdirSync('./public/images/game');

  const images = ParsingContext.images;
  for (const image of images) {
    const { resourcePath, imageName } = image;
    const imagePath = decodeResourcePath(resourcePath);
    const publicPath = `./public/images/game/${imageName}`;

    console.log(`Copying ${imagePath} to ${publicPath}`);
    await sharp(imagePath).resize(256).toFile(publicPath);
    await sharp(imagePath)
      .resize(64)
      .toFile(publicPath.replace('_256.png', '_64.png'));
    // fs.copyFileSync(imagePath, publicPath);
  }

  console.log('Images converted');
}

function decodeResourcePath(resourcePath: string) {
  let path = resourcePath;
  path = path.replace('Texture2D /Game/FactoryGame/', '');
  path = path.replace(/\.(.*)$/, '.png');

  return `./data/assets/FactoryGame/Content/FactoryGame/${path}`;
}
