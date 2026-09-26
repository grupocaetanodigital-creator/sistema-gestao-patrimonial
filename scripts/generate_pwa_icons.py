import zlib
import struct
import os

def make_png(width, height, get_pixel_color):
    """Generates an RGBA PNG using standard library zlib and struct."""
    raw_data = bytearray()
    for y in range(height):
        raw_data.append(0)  # Filter type 0 (None)
        for x in range(width):
            r, g, b, a = get_pixel_color(x, y, width, height)
            raw_data.extend([r, g, b, a])
    
    compressed = zlib.compress(bytes(raw_data), level=9)
    
    def chunk(tag, data):
        c = struct.pack('>I', len(data)) + tag + data
        crc = zlib.crc32(tag + data) & 0xffffffff
        return c + struct.pack('>I', crc)
    
    png = bytearray(b'\x89PNG\r\n\x1a\n')
    ihdr_data = struct.pack('>IIBBBBB', width, height, 8, 6, 0, 0, 0)
    png.extend(chunk(b'IHDR', ihdr_data))
    png.extend(chunk(b'IDAT', compressed))
    png.extend(chunk(b'IEND', b''))
    return bytes(png)

def shield_pixel(x, y, w, h, is_maskable=False):
    # Normalize coordinates to -1.0 to 1.0
    scale = 0.7 if is_maskable else 0.85
    nx = (x / w - 0.5) * 2 / scale
    ny = (y / h - 0.5) * 2 / scale
    
    # Background: dark emerald (#022c22 -> #064e3b)
    bg_factor = (y / h)
    bg_r = int(2 + 4 * bg_factor)
    bg_g = int(44 + 34 * bg_factor)
    bg_b = int(34 + 25 * bg_factor)
    
    # Shield shape formula:
    # Top flat with curve: ny between -0.7 and 0.8
    # abs(nx) <= 0.65
    in_shield = False
    in_border = False
    in_check = False
    
    if -0.75 <= ny <= 0.75 and abs(nx) <= 0.65:
        # Curve downwards towards point (0, 0.75)
        if ny < -0.4:
            # top crest
            roof = -0.65 - 0.1 * (1 - abs(nx) / 0.65)
            if ny >= roof:
                in_shield = True
        else:
            # body tapering to tip
            progress = (ny - (-0.4)) / 1.15
            max_w = 0.65 * (1 - (progress ** 1.35))
            if abs(nx) <= max_w:
                in_shield = True
                
    if in_shield:
        # Shield border check (within 0.07 of edges)
        # Checkmark coordinates:
        # P1: (-0.25, 0.05), P2: (-0.05, 0.25), P3: (0.3, -0.15)
        # Line 1: from (-0.22, 0.05) to (-0.05, 0.22)
        # Line 2: from (-0.05, 0.22) to (0.28, -0.15)
        dist1 = 999
        dist2 = 999
        # segment 1
        x1, y1, x2, y2 = -0.22, 0.05, -0.05, 0.22
        # approximate segment distance
        for t_step in range(15):
            t = t_step / 14.0
            px = x1 + t * (x2 - x1)
            py = y1 + t * (y2 - y1)
            d = ((nx - px)**2 + (ny - py)**2)**0.5
            if d < dist1: dist1 = d
            
        x1, y1, x2, y2 = -0.05, 0.22, 0.28, -0.15
        for t_step in range(25):
            t = t_step / 24.0
            px = x1 + t * (x2 - x1)
            py = y1 + t * (y2 - y1)
            d = ((nx - px)**2 + (ny - py)**2)**0.5
            if d < dist2: dist2 = d
            
        if min(dist1, dist2) < 0.065:
            return (240, 253, 244, 255) # Pure light checkmark
            
        # Inside shield emerald gradient (#059669 -> #047857)
        sy = (ny + 0.75) / 1.5
        sr = int(5 - 1 * sy)
        sg = int(150 - 30 * sy)
        sb = int(105 - 18 * sy)
        return (sr, sg, sb, 255)
    
    return (bg_r, bg_g, bg_b, 255)

os.makedirs('./public', exist_ok=True)

# 1. 192x192
with open('./public/pwa-192x192.png', 'wb') as f:
    f.write(make_png(192, 192, lambda x, y, w, h: shield_pixel(x, y, w, h, False)))

# 2. 512x512
with open('./public/pwa-512x512.png', 'wb') as f:
    f.write(make_png(512, 512, lambda x, y, w, h: shield_pixel(x, y, w, h, False)))

# 3. 512x512 Maskable (with safe zone margin)
with open('./public/pwa-maskable-512x512.png', 'wb') as f:
    f.write(make_png(512, 512, lambda x, y, w, h: shield_pixel(x, y, w, h, True)))

# 4. Apple Touch Icon 180x180
with open('./public/apple-touch-icon.png', 'wb') as f:
    f.write(make_png(180, 180, lambda x, y, w, h: shield_pixel(x, y, w, h, False)))

# 5. Favicon 64x64
with open('./public/favicon.ico', 'wb') as f:
    f.write(make_png(64, 64, lambda x, y, w, h: shield_pixel(x, y, w, h, False)))

print("PWA icons generated successfully!")
