const fs = require('fs');
const path = require('path');

// Usage: node write-file.js <relative-path> <content-file>
// Reads content from content-file and writes to relative-path

const relPath = process.argv[2];
const contentFile = process.argv[3];

const fullPath = path.join(__dirname, '..', relPath);
const content = fs.readFileSync(contentFile, 'utf8');

// Ensure directory exists
const dir = path.dirname(fullPath);
fs.mkdirSync(dir, { recursive: true });

fs.writeFileSync(fullPath, content, 'utf8');
console.log('Wrote', content.length, 'chars to', relPath);
