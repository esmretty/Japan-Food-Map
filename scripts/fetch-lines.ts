import fs from 'fs';
import osmtogeojson from 'osmtogeojson';

async function fetchLines() {
  const query = `
    [out:json][timeout:60];
    (
      relation["route"="subway"]["colour"](35.5,139.5,35.9,139.9);
      relation["route"="train"]["colour"](35.5,139.5,35.9,139.9);
    );
    out body;
    >;
    out skel qt;
  `;
  
  console.log('Fetching from Overpass API...');
  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    body: query
  });
  
  if (!res.ok) {
    console.error('Failed to fetch:', res.status, res.statusText);
    process.exit(1);
  }
  
  const data = await res.json();
  console.log('Converting to GeoJSON...');
  const geojson = osmtogeojson(data);
  
  // Filter out non-LineString features to save space
  geojson.features = geojson.features.filter(f => f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString');
  
  // Keep only necessary properties (colour, name)
  geojson.features = geojson.features.map(f => {
    return {
      ...f,
      properties: {
        name: f.properties.name || f.properties['name:en'] || '',
        colour: f.properties.colour || '#999999',
        route: f.properties.route || ''
      }
    };
  });
  
  fs.writeFileSync('public/tokyo-lines.json', JSON.stringify(geojson));
  console.log('Saved to public/tokyo-lines.json');
}

fetchLines().catch(console.error);
