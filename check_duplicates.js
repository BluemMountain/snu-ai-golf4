const supabase = require('./supabaseClient');

async function checkDuplicates() {
    console.log('Fetching all members to check for duplicates...');
    const { data: members, error } = await supabase.from('members').select('*');

    if (error) {
        console.error('Error fetching members:', error);
        return;
    }

    const types = {};
    members.forEach(m => {
        types[m.type] = (types[m.type] || 0) + 1;
    });
    console.log('Member counts by type:', types);
    console.log('Full list of types found:', Object.keys(types));

    const { data: rsvps, error: error2 } = await supabase.from('rsvps').select('*').limit(1);
    console.log('RSVP keys:', rsvps && rsvps.length > 0 ? Object.keys(rsvps[0]) : 'no data');

    // Check if there's any other table we might be missing
    // Since we don't have a direct "list tables" permission usually, let's just confirm the member count one more time.
    const { count, error: countError } = await supabase.from('members').select('*', { count: 'exact', head: true });
    console.log('Total member count from Supabase:', count);
}

checkDuplicates();
