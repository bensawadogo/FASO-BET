const m = require('./public/logos/metadata.json');
const teams = ['PSG','Lyon','Liverpool','Arsenal','Real Madrid','Barcelona','Sénégal','Maroc'];

function slugify(s) {
  return s.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s\-.\'\/]+/g, '_')
    .replace(/[^a-z0-9_]/g, '')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

const aliases = {
  psg: 'paris_saint-germain',
  lyon: 'olympique_lyonnais',
  barcelona: 'fc_barcelona',
  barca: 'fc_barcelona',
};

teams.forEach(t => {
  let found = null;
  if (m[t]) found = m[t].local_path;
  if (!found && aliases[slugify(t)]) found = m[aliases[slugify(t)]].local_path;
  if (!found) {
    const s = slugify(t);
    for (const [k, v] of Object.entries(m)) {
      if (v.slug === s) { found = v.local_path; break; }
      if (slugify(k).includes(s) || s.includes(slugify(k))) {
        found = v.local_path; break;
      }
    }
  }
  console.log(t + ' -> ' + (found || 'NOT FOUND'));
});
