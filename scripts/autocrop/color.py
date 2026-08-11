from PIL import Image
im = Image.open('/Users/sourjyamitra/Desktop/StoryWritingAPP/apps/web/public/preloader.gif')
rgb_im = im.convert('RGB')
r, g, b = rgb_im.getpixel((0, 0))
print(f"#{r:02x}{g:02x}{b:02x}")
