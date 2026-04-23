// Updates the Images column in assets/trip.csv with curated Unsplash URLs
const fs = require('fs');
const path = require('path');
const Papa = require('papaparse');

const csvPath = path.join(__dirname, '..', 'assets', 'trip.csv');
const content = fs.readFileSync(csvPath, 'utf8');
const parsed = Papa.parse(content, { header: true, skipEmptyLines: true });

const IMAGE_BY_DAY = {
  1: 'https://images.unsplash.com/photo-1641546373508-635403c24289?auto=format&fit=crop&w=1600&q=75',
  2: 'https://images.unsplash.com/photo-1534008897995-27a23e859048?auto=format&fit=crop&w=1600&q=75',
  3: 'https://images.unsplash.com/photo-1757489810186-0456b4aa61ba?auto=format&fit=crop&w=1600&q=75',
  4: 'https://images.unsplash.com/photo-1671591239011-332e3e7d746c?auto=format&fit=crop&w=1600&q=75',
  5: 'https://images.unsplash.com/photo-1532370184535-22cec5ca8480?auto=format&fit=crop&w=1600&q=75',
  6: 'https://images.unsplash.com/photo-1530948990335-1eb93cbe6430?auto=format&fit=crop&w=1600&q=75',
  7: 'https://images.unsplash.com/photo-1533604145636-765f22ac7352?auto=format&fit=crop&w=1600&q=75',
  8: 'https://images.unsplash.com/photo-1577375837944-47617314bfd9?auto=format&fit=crop&w=1600&q=75',
  9: 'https://images.unsplash.com/photo-1582541537694-965be7aed707?auto=format&fit=crop&w=1600&q=75',
  10: 'https://images.unsplash.com/photo-1613672803979-a6edfc5a179b?auto=format&fit=crop&w=1600&q=75',
  11: 'https://images.unsplash.com/photo-1759770176679-159a90565c50?auto=format&fit=crop&w=1600&q=75',
  12: 'https://images.unsplash.com/photo-1735926005134-2ad67e8cf9e7?auto=format&fit=crop&w=1600&q=75',
  13: 'https://images.unsplash.com/photo-1698584109673-12d97bc70d08?auto=format&fit=crop&w=1600&q=75',
};

const rows = parsed.data.map((r) => {
  const day = parseInt(String(r.Day || '').trim(), 10);
  if (Number.isFinite(day) && IMAGE_BY_DAY[day]) {
    r.Images = IMAGE_BY_DAY[day];
  }
  return r;
});

const csv = Papa.unparse(rows, { columns: parsed.meta.fields });
fs.writeFileSync(csvPath, csv);
console.log(`Updated images in ${csvPath} (${Object.keys(IMAGE_BY_DAY).length} days)`);
