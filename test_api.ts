import fs from 'fs';

async function test() {
  try {
    const res = await fetch('http://localhost:3000/api/search-tabelog?q=' + encodeURIComponent('叙々苑 新宿'));
    const data = await res.json();
    console.log(data);
  } catch (e) {
    console.error(e);
  }
}

test();
