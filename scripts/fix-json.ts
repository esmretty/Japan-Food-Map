import fs from 'fs';
import path from 'path';

function fixJsonFile(filePath: string) {
  console.log(`Fixing ${filePath}...`);
  let content = fs.readFileSync(filePath, 'utf8');
  
  // Find the last complete object by looking for the last "},"
  const lastCompleteIndex = content.lastIndexOf('},');
  if (lastCompleteIndex !== -1) {
    // Cut off everything after the last complete object and close the array
    content = content.substring(0, lastCompleteIndex + 1) + '\n]';
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Fixed ${filePath}`);
  } else {
    console.log(`Could not find a complete object in ${filePath}`);
  }
}

for (let i = 1; i <= 4; i++) {
  const filePath = path.join(process.cwd(), 'src', 'data', `tabelog_retry_part${i}.json`);
  if (fs.existsSync(filePath)) {
    fixJsonFile(filePath);
  }
}
