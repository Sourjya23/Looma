const { Jimp } = require('jimp');

async function main() {
  try {
    const image = await Jimp.read('/Users/sourjyamitra/.gemini/antigravity-ide/brain/6921024b-3416-482a-9415-058c4246592b/.tempmediaStorage/media_6921024b-3416-482a-9415-058c4246592b_1786224302214.png');
    image.autocrop({ tolerance: 0.1 });
    await image.write('/Users/sourjyamitra/Desktop/StoryWritingAPP/apps/web/public/logo-icon.png');
    console.log('Cropped 753KB image. New dimensions: ' + image.bitmap.width + 'x' + image.bitmap.height);
  } catch (err) {
    console.error('Error cropping:', err);
  }
}

main();
