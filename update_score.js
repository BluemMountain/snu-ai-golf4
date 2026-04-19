const supabase = require('./supabaseClient');

(async () => {
    try {
        const { data, error } = await supabase
            .from('scores')
            .select('*')
            .eq('round_count', 14)
            .single();

        if (error) {
            console.error('Error fetching round 14:', error);
            process.exit(1);
        }

        if (!data) {
            console.error('Round 14 not found.');
            process.exit(1);
        }

        console.log('Original Data:', data);

        const updatedScoresData = { ...data.scores_data };
        updatedScoresData['김대욱'] = '89'; // "김대욱" 점수를 89로 업데이트

        const { data: updateData, error: updateError } = await supabase
            .from('scores')
            .update({ scores_data: updatedScoresData })
            .eq('round_count', 14);

        if (updateError) {
            console.error('Error updating round 14:', updateError);
            process.exit(1);
        }

        console.log('Update Successful:', updateData);
        process.exit(0);

    } catch (err) {
        console.error('Unexpected error:', err);
        process.exit(1);
    }
})();
