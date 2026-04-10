import fs from 'fs';
import path from 'path';

async function downloadFile(fileId: string, filename: string) {
  const url = `https://drive.google.com/uc?export=download&id=${fileId}`;
  const dest = path.join(process.cwd(), 'src', 'data', filename);

  console.log(`Downloading ${filename} from:`, url);
  const response = await fetch(url);
  
  const text = await response.text();
  
  if (text.trim().startsWith('<')) {
     console.log('Got HTML, likely a virus scan warning. Extracting confirm token...');
     const match = text.match(/confirm=([a-zA-Z0-9_-]+)/);
     if (match) {
        const confirmUrl = `${url}&confirm=${match[1]}`;
        console.log('Retrying with confirm token:', confirmUrl);
        const res2 = await fetch(confirmUrl);
        const buffer = await res2.arrayBuffer();
        fs.writeFileSync(dest, Buffer.from(buffer));
        console.log(`${filename} downloaded successfully with confirm token.`);
     } else {
        console.log(`Failed to parse JSON for ${filename}. Content preview:`, text.substring(0, 200));
     }
  } else {
     fs.writeFileSync(dest, text);
     console.log(`${filename} downloaded successfully.`);
  }
}

async function main() {
  const files = [
    { id: '1wDwqAKCaUqvaWHhgwlYwuDOh6RviH6G7', name: 'tabelog_retry_part2.json' },
    { id: '1LoxVLXbmfhJkFKtzwTlJqrhKVYhrfPyZ', name: 'tabelog_retry_part3.json' },
    { id: '1PVhikSiJM1KcM-8_aFSLAMtDnHqhT6wn', name: 'tabelog_retry_part4.json' }
  ];

  for (const file of files) {
    await downloadFile(file.id, file.name);
  }
}

main().catch(console.error);
