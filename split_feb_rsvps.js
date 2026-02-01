const https = require('https');

const SUPABASE_URL = 'https://qfzmwlyqezmkkxtpscik.supabase.co';
const SUPABASE_KEY = 'sb_publishable_mYejtROOg-2JN7z6_RlWdg_PXYSYgFi'; // Anon Key

function request(path, method, body = null) {
    return new Promise((resolve, reject) => {
        const url = new URL(path, SUPABASE_URL);
        const options = {
            method: method,
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=representation'
            }
        };

        const req = https.request(url, options, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                if (res.statusCode >= 200 && res.statusCode < 300) {
                    resolve(data ? JSON.parse(data) : null);
                } else {
                    reject(new Error(`Status: ${res.statusCode}, Body: ${data}`));
                }
            });
        });

        req.on('error', reject);
        if (body) req.write(JSON.stringify(body));
        req.end();
    });
}

async function run() {
    try {
        console.log('Fetching 2월 Event records...');
        const rsvps = await request('/rest/v1/rsvps?month=eq.2월&date=eq.Event', 'GET');
        console.log(`Found ${rsvps.length} records.`);

        if (rsvps.length === 0) {
            console.log('No records found to split.');
            return;
        }

        // 1. Update existing records to 2.7
        console.log('Updating records to 2.7...');
        await request('/rest/v1/rsvps?month=eq.2월&date=eq.Event', 'PATCH', { date: '2.7' });
        console.log('Records updated to 2.7.');

        // 2. Duplicate records for 2.8
        console.log('Duplicating records for 2.8...');
        const newRecords = rsvps.map(r => {
            const { id, created_at, ...rest } = r; // Remove original id and timestamp
            return { ...rest, date: '2.8', submittedat: new Date().toISOString() };
        });

        await request('/rest/v1/rsvps', 'POST', newRecords);
        console.log('Records duplicated for 2.8.');

        console.log('Migration completed successfully.');
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    }
}

run();
