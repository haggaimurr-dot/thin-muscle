"""Refresh TFDA snapshot: pip install opencc-python-reimplemented; python scripts/import-food-catalog.py [source.json]."""
import hashlib
import io
import json
import sys
import urllib.request
import zipfile
from datetime import date
from pathlib import Path

from opencc import OpenCC

SOURCE = 'https://data.fda.gov.tw/data/opendata/export/20/json'
if len(sys.argv) > 1:
    raw = Path(sys.argv[1]).read_bytes()
else:
    archive = urllib.request.urlopen(SOURCE, timeout=120).read()
    zipped = zipfile.ZipFile(io.BytesIO(archive))
    raw = zipped.read(zipped.namelist()[0])
rows = json.loads(raw.decode('utf-8-sig'))
convert = OpenCC('t2s').convert
foods = {}
fields = {'熱量': 'kcal', '粗蛋白': 'protein', '總碳水化合物': 'carb', '粗脂肪': 'fat'}
for row in rows:
    nutrient = fields.get(row['分析項'])
    if not nutrient:
        continue
    food = foods.setdefault(row['整合編號'], {
        'id': row['整合編號'],
        'name': convert(row['樣品名稱']),
        'originalName': row['樣品名稱'],
        'aliases': convert(row['俗名'] or ''),
        'category': convert(row['食品分類']),
        'description': convert(row['內容物描述'] or ''),
    })
    try:
        value = float(row['每100克含量'])
        if value >= 0:
            food[nutrient] = value
    except (TypeError, ValueError):
        pass
foods = [f for f in foods.values() if all(k in f for k in fields.values())]
output = {
    'source': '台湾卫生福利部食品药物管理署 · 食品营养成分资料集',
    'url': 'https://data.gov.tw/dataset/8543',
    'downloadUrl': SOURCE,
    'license': '政府资料开放授权条款第1版',
    'retrievedAt': date.today().isoformat(),
    'sha256': hashlib.sha256(raw).hexdigest(),
    'basis': '每100克可食部分；原始热量、粗蛋白、总碳水化合物、粗脂肪。名称转简体，保留原名与来源编号。缺少任一项的食品未收录。',
    'foods': sorted(foods, key=lambda f: f['id']),
}
path = Path(__file__).resolve().parents[1] / 'src/data/food-catalog.json'
path.parent.mkdir(exist_ok=True)
path.write_text(json.dumps(output, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print(f'Imported {len(foods)} foods into {path}')
