const supabase = require('./supabaseClient');

const CSV_HEADER = ", ,Name,강순대,곽노준,권민오,김기록,김대욱,김태일,남서우,문성욱,박상길,박철호,박청산,박희석,송원득,신소우,심민선,안삼근,안원익,이교구,이대식,이문형,이상열,이석환,이용환,정대규,정민호,정지환,조중규,현성호,박지선,신수희,김윤석,이진우,장병탁,이성원,전은미,최정훈,김종세,배태근,권혁찬,한예성,최철호,이재욱,이준기,이주민,김은현,채성희,김도열,이영규,함종민";

async function diagnose() {
    const csvNames = CSV_HEADER.split(',').slice(3).map(n => n.trim());
    console.log('CSV Names Count:', csvNames.length);

    const { data: dbMembers, error } = await supabase.from('members').select('name');
    if (error) {
        console.error(error);
        return;
    }

    const dbNames = dbMembers.map(m => m.name.trim());
    console.log('DB Names Count:', dbNames.length);

    const missingInDB = csvNames.filter(n => !dbNames.includes(n));
    const extraInDB = dbNames.filter(n => !csvNames.includes(n));

    console.log('Missing in DB (from CSV):', missingInDB);
    console.log('Extra in DB (not in CSV):', extraInDB);

    // Also check sorting of a small subset
    const testNames = ['이주민', '이준기'];
    testNames.sort((a, b) => a.localeCompare(b, 'ko'));
    console.log('Test sorting [이주민, 이준기]:', testNames);
}

diagnose();
