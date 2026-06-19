import os
from PIL import Image

public_dir = "c:/site-antigra/site-antigra/public"
icons_dir = os.path.join(public_dir, "icons")
os.makedirs(icons_dir, exist_ok=True)

# Generate a 192x192 image
img_192 = Image.new("RGB", (192, 192), color="#F59E0B")
img_192.save(os.path.join(icons_dir, "icon-192.png"), "PNG")

# Generate a 512x512 image
img_512 = Image.new("RGB", (512, 512), color="#F59E0B")
img_512.save(os.path.join(icons_dir, "icon-512.png"), "PNG")

# Generate a 32x32 favicon.ico
img_ico = Image.new("RGB", (32, 32), color="#F59E0B")
img_ico.save(os.path.join(public_dir, "favicon.ico"), format="ICO")

print("Icons generated successfully!")
