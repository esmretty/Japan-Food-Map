const fs = require('fs');
const data = JSON.parse(fs.readFileSync('public/restaurants.json', 'utf8'));
console.log(data.length);
