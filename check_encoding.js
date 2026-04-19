const fs = require('fs');

function checkEncoding(filePath) {
    const buffer = fs.readFileSync(filePath);
    console.log('Hex head:', buffer.slice(0, 10).toString('hex'));

    // Try different encodings
    const utf8 = buffer.toString('utf8');
    const utf16le = buffer.toString('utf16le');

    console.log('UTF8 head (first 100 chars):', utf8.slice(0, 100));
}

checkEncoding('scores.csv');
