import fs from 'fs';
import path from 'path';

function compareFiles() {
  const files = [
    'tabelog_retry_part1.json',
    'tabelog_retry_part2.json',
    'tabelog_retry_part3.json',
    'tabelog_retry_part4.json'
  ];

  const allIds = new Set();
  const fileStats: any = {};
  let totalDuplicates = 0;

  for (const file of files) {
    const filePath = path.join(process.cwd(), 'src', 'data', file);
    if (!fs.existsSync(filePath)) {
      console.log(`File missing: ${file}`);
      continue;
    }

    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    let duplicatesInFile = 0;

    for (const restaurant of data) {
      if (allIds.has(restaurant.id)) {
        duplicatesInFile++;
        totalDuplicates++;
      } else {
        allIds.add(restaurant.id);
      }
    }

    fileStats[file] = {
      totalRecords: data.length,
      duplicatesFound: duplicatesInFile
    };
  }

  console.log('--- Comparison Results ---');
  console.table(fileStats);
  console.log(`\nTotal unique records across all files: ${allIds.size}`);
  console.log(`Total duplicate records found: ${totalDuplicates}`);
  
  if (totalDuplicates === 0) {
    console.log('✅ All files contain completely unique records. No duplicates found.');
  } else {
    console.log('⚠️ Warning: Duplicates found across the files.');
  }
}

compareFiles();
