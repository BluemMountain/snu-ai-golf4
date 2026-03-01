const fs = require('fs');

function investigate() {
    const buffer = fs.readFileSync('scores.csv');
    // Just try decoding with CP949 (since we confirmed b0ad in hex)
    const iconv = require('util').TextDecoder; // Node doesn't have iconv but some environments do
    // Let's use naive decoding or just check commas
    const content = buffer.toString('binary');
    const lines = content.split('\n');

    console.log('Header line:', lines[0]);
    console.log('Row 2 line:', lines[1]);
    console.log('Row 3 line:', lines[2]);

    // Count commas
    lines.forEach((line, i) => {
        if (i < 15) {
            console.log(`Line ${i} commas:`, line.split(',').length - 1);
        }
    });
}

investigate();
