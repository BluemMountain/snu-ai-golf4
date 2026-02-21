const supabase = require('./supabaseClient');

async function checkSponsors() {
    console.log('Fetching all RSVPs with sponsor information...');
    const { data: rsvps, error } = await supabase
        .from('rsvps')
        .select('name, month, date, sponsor')
        .not('sponsor', 'is', null)
        .neq('sponsor', '');

    if (error) {
        console.error('Error fetching sponsors:', error);
        return;
    }

    if (rsvps.length === 0) {
        console.log('No sponsor data found in RSVPs table.');
    } else {
        console.log(`Found ${rsvps.length} sponsors:`);
        rsvps.forEach(r => {
            console.log(`- [${r.month} ${r.date}] ${r.name}: ${r.sponsor}`);
        });
    }
}

checkSponsors();
