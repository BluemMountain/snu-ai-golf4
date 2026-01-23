/**
 * Updates the member summary bar based on explicit IDs in the admin page.
 * IDs: count-total, count-exec, count-regular, count-associate, count-special
 */
// Check if current logged-in admin is super admin
function isSuperAdmin() {
    return sessionStorage.getItem('userRole') === 'super';
}

async function updateMemberSummary() {
    try {
        console.log('Fetching member summary...');
        const { data, error } = await supabaseClient.from('members').select('type');

        if (error) throw error;

        const stats = {
            total: data.length,
            executive: 0,
            jeong: 0,
            jun: 0,
            special: 0,
            ilban: 0
        };

        data.forEach(m => {
            if (m.type === 'executive_plus') {
                stats.executive++;
            } else if (stats.hasOwnProperty(m.type)) {
                stats[m.type]++;
            }
        });

        // Update HTML elements by ID
        const elements = {
            'count-total': stats.total,
            'count-exec': stats.executive,
            'count-regular': stats.jeong,
            'count-associate': stats.jun,
            'count-special': stats.special
        };

        for (const [id, value] of Object.entries(elements)) {
            const el = document.getElementById(id);
            if (el) {
                el.innerText = value;
            }
        }

        console.log('Member summary updated successfully:', stats);
    } catch (err) {
        console.error('Failed to update member summary:', err);
    }
}

// Export to window for access from other scripts
window.updateMemberSummary = updateMemberSummary;
