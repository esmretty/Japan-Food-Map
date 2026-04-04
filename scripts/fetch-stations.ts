import fs from 'fs';
import https from 'https';

const query = `
[out:json][timeout:25];
area["name"="東京都"]->.searchArea;
(
  node["railway"="station"]["subway"="yes"](area.searchArea);
  node["railway"="station"]["network"~"JR"](area.searchArea);
);
out body;
>;
out skel qt;
`;

const url = 'https://overpass-api.de/api/interpreter?data=' + encodeURIComponent(query);

https.get(url, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    const json = JSON.parse(data);
    const features = json.elements.filter((e: any) => e.type === 'node' && e.tags && e.tags.name).map((e: any) => ({
      type: 'Feature',
      properties: {
        name: e.tags?.name || 'Unknown',
        name_en: e.tags?.['name:en'] || '',
        network: e.tags?.network || '',
        railway: e.tags?.railway || ''
      },
      geometry: {
        type: 'Point',
        coordinates: [e.lon, e.lat]
      }
    }));
    
    const geojson = {
      type: 'FeatureCollection',
      features: features
    };
    
    fs.writeFileSync('public/tokyo-stations.json', JSON.stringify(geojson));
    console.log('Stations saved to public/tokyo-stations.json');
  });
}).on('error', (err) => {
  console.error('Error fetching data:', err);
});
