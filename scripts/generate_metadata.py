import json
import os

logos_dir = 'public/logos/teams'
output_file = 'public/logos/metadata.json'

metadata = {}
if os.path.exists(logos_dir):
    for filename in os.listdir(logos_dir):
        if filename.endswith('.png'):
            slug = filename.replace('.png', '')
            # Création d'un nom lisible pour l'équipe (exemple: paris_saint-germain -> Paris Saint-Germain)
            name = slug.replace('_', ' ').title()
            metadata[name] = {
                "team": name,
                "slug": slug,
                "local_path": f"/logos/teams/{filename}",
                "status": "cached"
            }

with open(output_file, 'w', encoding='utf-8') as f:
    json.dump(metadata, f, indent=2, ensure_ascii=False)
print(f"Generated {len(metadata)} entries in {output_file}")
