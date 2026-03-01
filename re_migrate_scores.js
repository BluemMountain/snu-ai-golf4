const fs = require('fs');
const supabase = require('./supabaseClient');

// Helper to decode from binary to string correctly for Korean if possible, 
// but since we just need the header names and commas, we can be careful.
// We'll read the file buffer and use a naive CP949 to UTF8 mapping or just hardcode the header if we can see it clearly.

async function reMigrate() {
    console.log("Re-migrating scores with correct encoding (EUC-KR)...");

    // 1. Get correct header names from the actual file
    // Based on investigate_csv.js, the header has 51 columns (3 base + 48 names)
    // The last few are: ..., ÀÌÁØ±â, ÀÌÁÖ¹Î, ±èÀºÇö, Ã¤¼ºÈñ, ±èµµ¿­, ÀÌ¿µ±Ô
    // Translated: ..., 이준기, 이주민, 김은현, 채성희, 김도열, 이영규

    // Total names = 48.
    const CORRECT_NAMES = [
        "강순대", "곽노준", "권민오", "김기록", "김대욱", "김태일", "남서우", "문성욱", "박상길", "박철호",
        "박청산", "박희석", "송원득", "신소우", "심민선", "안삼근", "안원익", "이교구", "이대식", "이문형",
        "이상열", "이석환", "이용환", "정대규", "정민호", "정지환", "조중규", "현성호", "박지선", "신수희",
        "김윤석", "이진우", "장병탁", "이성원", "전은미", "최정훈", "김종세", "배태근", "권혁찬", "한예성",
        "최철호", "이재욱", "이준기", "이주민", "김은현", "채성희", "김도열", "이영규"
    ];
    // NOTE: 함종민 was Missing in the CSV header!

    console.log("Correct names count:", CORRECT_NAMES.length);

    const buffer = fs.readFileSync('scores.csv');
    const decoder = new TextDecoder('euc-kr');
    const content = decoder.decode(buffer);
    const lines = content.split('\n').filter(l => l.trim() !== '');

    // Row 0: Header
    // Row 1: 2025 Handicap (ignore here, re-migrate via migrate_h25 later if needed)
    // Row 2+: Round data
    const dataRows = lines.slice(2);

    for (const line of dataRows) {
        const cols = line.split(',');
        const round_count = parseInt(cols[0]) || 0;
        const date = cols[1] ? cols[1].trim() : '';
        const venue = cols[2] ? cols[2].trim() : '';

        if (!date && !venue && isNaN(round_count)) continue;

        const scores_data = {};
        CORRECT_NAMES.forEach((name, idx) => {
            const score = cols[idx + 3];
            if (score && score.trim() !== '' && score.trim() !== '-' && score.trim() !== '0') {
                scores_data[name] = score.trim();
            }
        });

        if (Object.keys(scores_data).length > 0 || date) {
            const { error } = await supabase
                .from('scores')
                .upsert([{
                    round_count,
                    date,
                    venue,
                    scores_data
                }], { onConflict: 'round_count' });

            if (error) console.error(`Error Round ${round_count}:`, error.message);
            else console.log(`Round ${round_count} migrated.`);
        }
    }

    console.log("Migration complete.");
}

reMigrate();
