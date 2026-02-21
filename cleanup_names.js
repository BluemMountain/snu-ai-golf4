const supabase = require('./supabaseClient');

async function cleanupNames() {
    console.log('Fetching all RSVPs to cleanup names...');
    const { data: rsvps, error } = await supabase.from('rsvps').select('id, name');

    if (error) {
        console.error('Error fetching RSVPs:', error);
        return;
    }

    console.log(`Checking ${rsvps.length} records...`);
    let updateCount = 0;

    for (const rsvp of rsvps) {
        const originalName = rsvp.name || '';
        const trimmedName = originalName.trim();

        if (originalName !== trimmedName) {
            console.log(`Cleaning up: [${originalName}] -> [${trimmedName}]`);
            const { error: updateError } = await supabase
                .from('rsvps')
                .update({ name: trimmedName })
                .eq('id', rsvp.id);

            if (updateError) {
                console.error(`Error updating record ${rsvp.id}:`, updateError);
            } else {
                updateCount++;
            }
        }
    }

    console.log(`Cleanup finished. Total records updated: ${updateCount}`);
}

cleanupNames();
