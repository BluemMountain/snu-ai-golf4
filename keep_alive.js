const https = require('https');

/**
 * Supabase Keep-Alive Script (Lightweight REST version)
 * This script calls Supabase REST API directly using built-in https module
 * to avoid libuv socket closing assertions on process.exit.
 */
function keepAlive() {
    console.log('Starting keep-alive REST query at:', new Date().toISOString());

    const url = 'https://qfzmwlyqezmkkxtpscik.supabase.co/rest/v1/members?limit=1';
    const options = {
        method: 'GET',
        headers: {
            'apikey': 'sb_publishable_mYejtROOg-2JN7z6_RlWdg_PXYSYgFi',
            'Authorization': 'Bearer sb_publishable_mYejtROOg-2JN7z6_RlWdg_PXYSYgFi',
            'User-Agent': 'Mozilla/5.0'
        }
    };

    const req = https.request(url, options, (res) => {
        let body = '';
        res.on('data', (chunk) => body += chunk);
        res.on('end', () => {
            console.log(`Successfully pinged Supabase. Response Status: ${res.statusCode}`);
            if (res.statusCode >= 200 && res.statusCode < 300) {
                console.log('Keep-alive ping successful!');
                process.exit(0);
            } else {
                console.error(`Failed with status: ${res.statusCode}. Body: ${body}`);
                process.exit(1);
            }
        });
    });

    req.on('error', (err) => {
        console.error('Network error during keep-alive ping:', err.message);
        process.exit(1);
    });

    req.end();
}

keepAlive();
