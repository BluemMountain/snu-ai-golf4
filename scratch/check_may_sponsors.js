const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qfzmwlyqezmkkxtpscik.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkSponsors() {
    const { data, error } = await supabase
        .from('rsvps')
        .select('*')
        .eq('month', '5월')
        .not('sponsor', 'is', null)
        .neq('sponsor', '');

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log('May Sponsors in DB:');
    data.forEach(s => {
        console.log(`- ${s.name}: ${s.sponsor}`);
    });
}

checkSponsors();
