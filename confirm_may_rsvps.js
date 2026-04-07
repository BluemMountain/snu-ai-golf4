const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qfzmwlyqezmkkxtpscik.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_KEY) {
    console.error('Supabase key is missing!');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function confirmMayRSVPs() {
    console.log('Confirming all May RSVPs (setting iswaiting to false)...');
    
    // Update all RSVPs for May (5월) whose status is 'attend'
    const { data, error, count } = await supabase
        .from('rsvps')
        .update({ iswaiting: false })
        .eq('month', '5월')
        .eq('date', '5.27')
        .eq('status', 'attend')
        .select('id, name');

    if (error) {
        console.error('Error updating RSVPs:', error);
        return;
    }

    console.log(`Successfully confirmed ${data.length} RSVPs for May 5.27:`);
    data.forEach(item => console.log(`- ${item.name} (${item.id})`));
    console.log('Done.');
}

confirmMayRSVPs();
