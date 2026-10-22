"""Create pixel-identical web images; retain all original pictures and fonts.

Requires Pillow. Run from the repository root. An optional
.local/performance-pages.json inventory prioritizes the currently used screens.
"""
import hashlib
import io
import json
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'assets' / 'optimized'
OUT.mkdir(exist_ok=True)
digest = lambda b: hashlib.sha256(b).hexdigest()
inventory = ROOT / '.local' / 'performance-pages.json'
priority = json.loads(inventory.read_text('utf-8'))['assets'] if inventory.exists() else []
paths = list(dict.fromkeys(priority + [p.relative_to(ROOT).as_posix() for p in sorted((ROOT / 'assets').glob('*.png'))]))


def encode(path):
    original = ROOT / path
    raw = original.read_bytes()
    if len(raw) < 12000:
        return None
    image = Image.open(original).convert('RGBA')
    data = io.BytesIO()
    image.save(data, format='WEBP', lossless=True, exact=True, method=4,
        icc_profile=image.info.get('icc_profile', b''), exif=image.info.get('exif', b''))
    encoded = data.getvalue()
    if len(encoded) >= len(raw) * .8:
        return None
    restored = Image.open(io.BytesIO(encoded)).convert('RGBA')
    if image.size != restored.size or image.tobytes() != restored.tobytes():
        raise RuntimeError('Lossless verification failed: ' + path)
    return path, encoded, {'file': 'assets/optimized/' + original.stem + '.webp', 'width': image.width,
        'height': image.height, 'originalBytes': len(raw), 'bytes': len(encoded),
        'originalSha256': digest(raw), 'sha256': digest(encoded), 'rgbaSha256': digest(image.tobytes())}


images, total = {}, 0
# Keep the public site below Pages' size limit while retaining old PNG URLs.
if '--reuse-images' in sys.argv:
    for target in sorted(OUT.glob('*.webp')):
        original = ROOT / 'assets' / (target.stem + '.png')
        raw, data = original.read_bytes(), target.read_bytes()
        image, restored = Image.open(original).convert('RGBA'), Image.open(target).convert('RGBA')
        assert image.size == restored.size and image.tobytes() == restored.tobytes(), str(target)
        images[original.relative_to(ROOT).as_posix()] = {'file': target.relative_to(ROOT).as_posix(),
            'width': image.width, 'height': image.height, 'originalBytes': len(raw), 'bytes': len(data),
            'originalSha256': digest(raw), 'sha256': digest(data), 'rgbaSha256': digest(image.tobytes())}
        total += len(data)
    print(json.dumps({'verifiedImages': len(images), 'webpBytes': total}), flush=True)
else:
    with ThreadPoolExecutor(max_workers=4) as pool:
        for start in range(0, len(paths), 16):
            for result in pool.map(encode, paths[start:start + 16]):
                if result:
                    path, data, entry = result
                    if total + len(data) <= 130_000_000:
                        (ROOT / entry['file']).write_bytes(data)
                        images[path] = entry
                        total += len(data)
            print(json.dumps({'processed': min(start + 16, len(paths)), 'images': len(images), 'webpBytes': total}), flush=True)
            if total >= 129_000_000:
                break


manifest = {'version': 1, 'images': images}
(OUT / 'manifest.json').write_text(json.dumps(manifest, ensure_ascii=False, separators=(',', ':')) + '\n', 'utf-8')
print(json.dumps({'images': len(images), 'webpBytes': total, 'originalImageBytes': sum(e['originalBytes'] for e in images.values()), 'pixelsIdentical': True}), flush=True)
