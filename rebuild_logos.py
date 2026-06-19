
import json, os
from pathlib import Path

# Paths adjustment: running from site-antigra/ directory
logo_dir  = Path('public/logos/teams')
meta_file = Path('public/logos/metadata.json')

# Reconstruire basé sur ce qu'il y a dans logo_dir
new = {}
if logo_dir.exists():
    for f in logo_dir.glob('*.png'):
        name = f.stem.replace('_', ' ').title()
        new[name] = {
            'slug':       f.stem,
            'local_path': f'/logos/teams/{f.name}',
            'status':     'downloaded'
        }

# Ensure directory exists
meta_file.parent.mkdir(parents=True, exist_ok=True)

meta_file.write_text(
    json.dumps(new, indent=2, ensure_ascii=False), encoding='utf-8'
)
paths = [v['local_path'] for v in new.values()]
unique = len(set(paths))
print(f'Rebuilt: {len(new)} teams, {unique} unique paths')
