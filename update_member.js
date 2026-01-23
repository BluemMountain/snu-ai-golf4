const supabase = require('./supabaseClient');
(async () => {
    const { data, error } = await supabase.from('members')
        .update({ type: 'executive_plus' })
        .eq('name', '박청산');
    if (error) {
        console.error('Error updating member:', error);
        process.exit(1);
    } else {
        console.log('Update successful:', data);
    }
})();
