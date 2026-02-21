const supabase = require('./supabaseClient');

async function checkNames() {
    const targetNames = ['김도열', '현성호'];

    console.log('--- Checking Members Table ---');
    const { data: members, error: mError } = await supabase.from('members').select('name, type');
    if (mError) {
        console.error(mError);
    } else {
        members.forEach(m => {
            if (targetNames.includes(m.name.trim())) {
                console.log(`Member: [${m.name}], Type: [${m.type}]`);
            }
        });
    }

    console.log('\n--- Checking RSVPs Table ---');
    const { data: rsvps, error: rError } = await supabase.from('rsvps').select('name, month, date');
    if (rError) {
        console.error(rError);
    } else {
        rsvps.forEach(r => {
            if (targetNames.includes(r.name.trim())) {
                console.log(`RSVP: [${r.name}], Month: [${r.month}], Date: [${r.date}]`);
            }
        });
    }
}

checkNames();
