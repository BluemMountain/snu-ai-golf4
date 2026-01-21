const fs = require('fs');
const path = require('path');
const supabase = require('./supabaseClient');

async function migrate() {
    console.log('Starting migration to Supabase...');

    const dataPath = path.join(__dirname, 'snu_golf_restore.json');
    if (!fs.existsSync(dataPath)) {
        console.error('snu_golf_restore.json not found!');
        return;
    }

    const rawData = fs.readFileSync(dataPath);
    const data = JSON.parse(rawData);

    // 1. Migrate Members
    if (data.members && data.members.length > 0) {
        console.log(`Migrating ${data.members.length} members...`);
        // Using upsert to avoid duplicates if re-run, assuming 'name' can be a unique identifier for now
        // Note: In a real app, you'd want a proper ID, but based on the JSON, name is what we have.
        const { error: memberError } = await supabase
            .from('members')
            .upsert(data.members.map(m => ({
                name: m.name,
                type: m.type,
                role: m.role || null
            })));

        if (memberError) {
            console.error('Error migrating members:', memberError);
        } else {
            console.log('Members migrated successfully.');
        }
    }

    // 2. Migrate RSVPs
    if (data.rsvps && data.rsvps.length > 0) {
        console.log(`Migrating ${data.rsvps.length} rsvps...`);
        const { error: rsvpError } = await supabase
            .from('rsvps')
            .insert(data.rsvps.map(r => ({
                name: r.name,
                phone: r.phone,
                status: r.status,
                sponsor: r.sponsor || '',
                month: r.month,
                date: r.date,
                iswaiting: r.isWaiting || false,
                submittedat: r.submittedAt
            })));

        if (rsvpError) {
            console.error('Error migrating rsvps:', rsvpError);
        } else {
            console.log('RSVPs migrated successfully.');
        }
    }

    console.log('Migration finished.');
}

migrate();
