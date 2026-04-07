const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://qfzmwlyqezmkkxtpscik.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_KEY;

if (!SUPABASE_KEY) {
    console.error('Supabase key is missing!');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

const newSponsors = [
    {
        name: '현성호',
        month: '4월',
        date: '4.3',
        status: 'attend',
        sponsor: '모듬 과일 2박스, 쌀 2포대, 김 셋트',
        submittedat: new Date().toISOString()
    },
    {
        name: '김대욱',
        month: '4월',
        date: '4.22',
        status: 'attend',
        sponsor: '골프공',
        submittedat: new Date().toISOString()
    },
    {
        name: '정민호',
        month: '4월',
        date: '4.22',
        status: 'attend',
        sponsor: '공진단 1박스',
        submittedat: new Date().toISOString()
    },
    {
        name: '김대욱',
        month: '5월',
        date: '5.27',
        status: 'attend',
        sponsor: '100만원',
        submittedat: new Date().toISOString()
    },
    {
        name: '정민호',
        month: '5월',
        date: '5.27',
        status: 'attend',
        sponsor: '공진단 3박스(60만원 * 3 = 180만원 상당)',
        submittedat: new Date().toISOString()
    },
    {
        name: '김대욱',
        month: '3월',
        date: '3.25',
        status: 'attend',
        sponsor: '사과 3박스',
        submittedat: new Date().toISOString()
    },
    {
        name: '박철호',
        month: '3월',
        date: '3.25',
        status: 'attend',
        sponsor: '사과 3박스',
        submittedat: new Date().toISOString()
    },
    {
        name: '정진우',
        month: '3월',
        date: '3.25',
        status: 'attend',
        sponsor: '10만원 상품권 3장, 인형 2개',
        submittedat: new Date().toISOString()
    }
];

async function addSponsors() {
    console.log('Adding/Updating sponsor RSVPs...');
    
    for (const s of newSponsors) {
        // First check if RSVP exists for that name, month, date
        const { data: existing, error: checkError } = await supabase
            .from('rsvps')
            .select('id')
            .eq('name', s.name)
            .eq('month', s.month)
            .eq('date', s.date)
            .maybeSingle();
            
        if (checkError) {
            console.error(`Error checking for ${s.name}:`, checkError);
            continue;
        }
        
        if (existing) {
            console.log(`Updating ${s.name} for ${s.month} ${s.date}...`);
            const { error: updateError } = await supabase
                .from('rsvps')
                .update({ sponsor: s.sponsor, status: 'attend' })
                .eq('id', existing.id);
            if (updateError) console.error(`Error updating ${s.name}:`, updateError);
        } else {
            console.log(`Inserting ${s.name} for ${s.month} ${s.date}...`);
            const { error: insertError } = await supabase
                .from('rsvps')
                .insert([s]);
            if (insertError) console.error(`Error inserting ${s.name}:`, insertError);
        }
    }
    console.log('Done.');
}

addSponsors();
