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

/**
 * Advanced Statistics & Intelligence Logic
 */

function openStatsModal(title, html) {
    document.getElementById('stats-modal-title').innerText = title;
    document.getElementById('stats-modal-content').innerHTML = html;
    document.getElementById('stats-result-modal').style.display = 'flex';
}

function closeStatsModal() {
    document.getElementById('stats-result-modal').style.display = 'none';
}

async function showHandicapRanking() {
    try {
        const year = document.getElementById('stats-year').value;
        const yearPrefix = year.substring(2); // "26" for 2026
        
        openStatsModal(`${year}년 핸디캡 랭킹`, '<div style="text-align:center; padding:20px;">공식 스코어 기반 분석 중...</div>');

        if (typeof supabaseClient === 'undefined') {
            throw new Error('데이터베이스 연결 준비가 되지 않았습니다.');
        }

        const [{ data: scores, error: scoreError }, { data: members, error: memberError }] = await Promise.all([
            supabaseClient.from('scores').select('*').order('round_count', { ascending: true }),
            supabaseClient.from('members').select('name, h25')
        ]);

        if (scoreError || memberError) throw scoreError || memberError;

        // Aggregate scores from JSONB field in 'scores' table
        const memberScores = {};
        scores.forEach(s => {
            // Filter by year prefix (YYMMDD format)
            if (s.date && !s.date.toString().startsWith(yearPrefix)) return;
            if (s.round_count === 0) return; // Skip baseline

            const data = s.scores_data || {};
            Object.entries(data).forEach(([name, val]) => {
                const sVal = parseInt(val);
                if (isNaN(sVal) || sVal <= 0) return;
                const n = name.trim();
                if (!memberScores[n]) memberScores[n] = [];
                memberScores[n].push(sVal);
            });
        });

        const ranking = members.map(m => {
            const name = (m.name || '').trim();
            const sList = memberScores[name] || [];
            const avgScore = sList.length > 0 ? sList.reduce((a, b) => a + b, 0) / sList.length : null;
            
            // 2026 Handicap Calculation
            const h26 = avgScore ? ((avgScore - 72) * 0.8).toFixed(1) : "N/A";
            
            return { name, h25: m.h25, h26, avgScore: avgScore?.toFixed(1) || "N/A", rounds: sList.length };
        }).filter(m => m.h26 !== "N/A" || m.h25);

        ranking.sort((a, b) => {
            if (a.h26 === "N/A") return 1;
            if (b.h26 === "N/A") return -1;
            return parseFloat(a.h26) - parseFloat(b.h26);
        });

        let html = `
            <table style="width:100%; border-collapse:collapse; margin-top:10px;">
                <thead>
                    <tr style="background:#f4f4f4; border-bottom:2px solid #ddd;">
                        <th style="padding:10px; text-align:left;">순위</th>
                        <th style="padding:10px; text-align:left;">성함</th>
                        <th style="padding:10px; text-align:right;">26년 핸디</th>
                        <th style="padding:10px; text-align:right;">평균 타수</th>
                        <th style="padding:10px; text-align:right;">라운드</th>
                    </tr>
                </thead>
                <tbody>
        `;

        ranking.forEach((m, i) => {
            html += `
                <tr style="border-bottom:1px solid #eee;">
                    <td style="padding:10px;">${i + 1}</td>
                    <td style="padding:10px; font-weight:bold;">${m.name}</td>
                    <td style="padding:10px; text-align:right; color:#577b2d; font-weight:bold;">${m.h26}</td>
                    <td style="padding:10px; text-align:right;">${m.avgScore}</td>
                    <td style="padding:10px; text-align:right;">${m.rounds}회</td>
                </tr>
            `;
        });

        html += `</tbody></table>`;
        openStatsModal(`${year}년 핸디캡 랭킹`, html);
    } catch (err) {
        console.error('Stats error:', err);
        openStatsModal('오류 발생', `<div style="color:red; text-align:center; padding:20px;">${err.message || '데이터를 불러오는 중 오류가 발생했습니다.'}</div>`);
    }
}

async function showSponsorSummary() {
    try {
        const year = document.getElementById('stats-year').value;
        openStatsModal(`${year}년 스폰서 내역 요약`, '<div style="text-align:center; padding:20px;">데이터를 불러오는 중...</div>');

        const { data: rsvps, error } = await supabaseClient
            .from('rsvps')
            .select('name, sponsor, month, date, status')
            .not('sponsor', 'is', null)
            .not('sponsor', 'eq', '');

        if (error) throw error;

        const sponsors = {};
        rsvps.forEach(r => {
            const name = (r.name || '').trim();
            if (!name) return;
            if (!sponsors[name]) sponsors[name] = [];
            sponsors[name].push({ month: r.month, date: r.date, item: r.sponsor, isAbsent: r.status === 'absent' });
        });

        let html = '<div style="display:flex; flex-direction:column; gap:15px; margin-top:10px;">';
        Object.entries(sponsors).forEach(([name, items]) => {
            html += `
                <div style="padding:15px; background:#f9f9f9; border-radius:8px; border-left:4px solid #8e44ad;">
                    <div style="font-weight:bold; color:#1e3a2b; font-size:1.1rem; margin-bottom:8px;">${name} 원우님</div>
                    <ul style="margin:0; padding-left:20px; color:#555; line-height:1.6;">
                        ${items.map(i => `
                            <li>
                                <span style="color:#888;">[${i.month} ${i.date}]</span> ${i.item}
                                ${i.isAbsent ? '<span style="color:#e67e22; font-size:0.8rem; margin-left:8px; font-weight:bold;">(미참석)</span>' : ''}
                            </li>
                        `).join('')}
                    </ul>
                </div>
            `;
        });
        html += '</div>';

        if (Object.keys(sponsors).length === 0) html = '<p style="text-align:center; padding:20px; color:#888;">데이터가 없습니다.</p>';

        openStatsModal(`${year}년 스폰서 내역 요약`, html);
    } catch (err) {
        console.error('Stats error:', err);
        openStatsModal('오류 발생', `<div style="color:red; text-align:center; padding:20px;">${err.message}</div>`);
    }
}

async function showAttendanceStats() {
    try {
        const year = document.getElementById('stats-year').value;
        openStatsModal(`${year}년 최다 참석자 통계`, '<div style="text-align:center; padding:20px;">계산 중입니다...</div>');

        const { data: rsvps, error } = await supabaseClient
            .from('rsvps')
            .select('name, month, date')
            .eq('status', 'attend');

        if (error) throw error;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const counts = {};
        rsvps.forEach(r => {
            // Filter by date (Current/Past only)
            const monthMatch = r.month.match(/(\d+)월/);
            const dateMatch = r.date.match(/(\d+)\.(\d+)/);
            if (monthMatch && dateMatch) {
                const eventDate = new Date(parseInt(year), parseInt(monthMatch[1]) - 1, parseInt(dateMatch[2]));
                if (eventDate > today) return; // Skip future rounds
            }

            const name = (r.name || '').trim();
            if (!name) return;
            counts[name] = (counts[name] || 0) + 1;
        });

        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

        let html = `
            <div style="margin-bottom:15px; font-size:0.9rem; color:#666; background:#f0f7f4; padding:10px; border-radius:6px;">
                💡 오늘(${today.toLocaleDateString()})까지 개최된 라운드 기준 통계입니다.
            </div>
            <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap:10px;">
                ${sorted.map(([name, count]) => `
                    <div style="padding:12px; background:#fff; border:1px solid #e0e0e0; border-radius:8px; text-align:center; box-shadow:0 2px 4px rgba(0,0,0,0.05);">
                        <div style="font-size:1.1rem; font-weight:bold; color:#1e3a2b;">${name}</div>
                        <div style="color:#577b2d; font-size:0.9rem; font-weight:bold;">${count}회 참석</div>
                    </div>
                `).join('')}
            </div>
        `;
        openStatsModal(`${year}년 최다 참석자 통계`, html);
    } catch (err) {
        console.error('Stats error:', err);
        openStatsModal('오류 발생', `<div style="color:red; text-align:center; padding:20px;">${err.message}</div>`);
    }
}

async function handleSmartQuery() {
    const query = document.getElementById('smart-query-input').value;
    if (!query) return;

    const normalized = query.toLowerCase();

    if (normalized.includes('핸디') || normalized.includes('랭킹') || normalized.includes('순위')) {
        showHandicapRanking();
    } else if (normalized.includes('스폰') || normalized.includes('찬조') || normalized.includes('물품')) {
        showSponsorSummary();
    } else if (normalized.includes('참석') || normalized.includes('개근')) {
        showAttendanceStats();
    } else {
        alert('질문을 이해하지 못했습니다. "핸디캡", "스폰서", "참석" 등의 키워드를 포함해 주세요.');
    }
}

// Export functions to window
window.handleSmartQuery = handleSmartQuery;
window.showHandicapRanking = showHandicapRanking;
window.showSponsorSummary = showSponsorSummary;
window.showAttendanceStats = showAttendanceStats;
window.closeStatsModal = closeStatsModal;
