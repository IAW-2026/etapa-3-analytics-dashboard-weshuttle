const fs = require('fs');
let content = fs.readFileSync('src/app/page.tsx', 'utf8');
content = content.replaceAll('<div className="flex flex-col gap-2 max-h-[260px] overflow-y-auto pr-1">', '<div className="flex flex-col justify-evenly h-full gap-2 py-2">');
content = content.replaceAll('<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">', '<div className="flex flex-col justify-evenly h-full gap-2 py-2">');
content = content.replaceAll('<div className="flex flex-col gap-2">', '<div className="flex flex-col justify-evenly h-full gap-2 py-2">');
fs.writeFileSync('src/app/page.tsx', content);
console.log('done');
