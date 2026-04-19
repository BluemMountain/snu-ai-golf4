const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qfzmwlyqezmkkxtpscik.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function findMarchDate() {
    const { data, error } = await supabase
        .from('rsvps')
        .select('date')
        .eq('month', '3월')
        .limit(1);
    
    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Date found:', data[0] ? data[0].date : 'Not found');
    }
}

findMarchDate();
