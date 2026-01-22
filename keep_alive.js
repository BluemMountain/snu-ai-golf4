const supabase = require('./supabaseClient');

/**
 * Supabase Keep-Alive Script
 * This script performs a simple SELECT query to keep the Supabase project active.
 */
async function keepAlive() {
    console.log('Starting keep-alive query at:', new Date().toISOString());

    try {
        const { data, error } = await supabase
            .from('members')
            .select('*')
            .limit(1);

        if (error) {
            console.error('Error querying Supabase:', error.message);
            process.exit(1);
        }

        console.log('Successfully queried Supabase.');
        if (data && data.length > 0) {
            console.log('Status: Table is accessible.');
        } else {
            console.log('Status: Table is accessible but empty.');
        }
        process.exit(0);
    } catch (err) {
        console.error('Unexpected error:', err.message);
        process.exit(1);
    }
}

keepAlive();
