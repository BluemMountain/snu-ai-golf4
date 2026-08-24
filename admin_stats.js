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
            supabaseClient.from('members').select('name')
        ]);

               // Aggregate scores from JSONB field in 'scores' table (Overall vs Shinwon CC)
        const memberScores = {};
        const memberShinwonScores = {};

        scores.forEach(s => {
            // Filter by year prefix (YYMMDD format)
            if (s.date && !s.date.toString().startsWith(yearPrefix)) return;
            if (s.round_count === 0) return; // Skip baseline

            const isShinwon = s.venue && s.venue.includes('신원');
            const data = s.scores_data || {};

            Object.entries(data).forEach(([name, val]) => {
                const sVal = parseInt(val);
                if (isNaN(sVal) || sVal <= 0) return;
                const n = name.trim();

                // Overall scores
                if (!memberScores[n]) memberScores[n] = [];
                memberScores[n].push(sVal);

                // Shinwon-only scores
                if (isShinwon) {
                    if (!memberShinwonScores[n]) memberShinwonScores[n] = [];
                    memberShinwonScores[n].push(sVal);
                }
            });
        });

        const ranking = members.map(m => {
            const name = (m.name || '').trim();
            
            // Overall calculations
            const sList = memberScores[name] || [];
            const avgScore = sList.length > 0 ? sList.reduce((a, b) => a + b, 0) / sList.length : null;
            const h26_total = avgScore ? ((avgScore - 72.0) * 113 / 125).toFixed(1) : "N/A";
            
            // Shinwon calculations
            const shinwonSList = memberShinwonScores[name] || [];
            const shinwonAvgScore = shinwonSList.length > 0 ? shinwonSList.reduce((a, b) => a + b, 0) / shinwonSList.length : null;
            const h26_shinwon = shinwonAvgScore ? ((shinwonAvgScore - 72.0) * 113 / 125).toFixed(1) : "N/A";
            
            return { 
                name, 
                h26_total, 
                h26_shinwon, 
                avgScore: avgScore?.toFixed(1) || "N/A", 
                rounds: sList.length,
                shinwonRounds: shinwonSList.length
            };
        }).filter(m => m.h26_total !== "N/A");

        // Sort by overall handicap index
        ranking.sort((a, b) => {
            if (a.h26_total === "N/A") return 1;
            if (b.h26_total === "N/A") return -1;
            return parseFloat(a.h26_total) - parseFloat(b.h26_total);
        });

        let html = `
            <div style="margin-bottom:20px; padding:15px; background:#f8f9fa; border-radius:8px; font-size:0.85rem; color:#444; border-left:4px solid #577b2d; line-height:1.6;">
                <strong>📊 핸디캡 산정 공식 (Handicap Differential)</strong><br>
                공식 핸디캡 인덱스 디퍼렌셜 방식으로 계산하며, 신원 CC의 난이도 상수를 일반적인 평균값(Course Rating: 72.0, Slope Rating: 125)으로 적용했습니다.<br>
                <code style="display:block; margin-top:8px; color:#1e3a2b; font-weight:bold;">Differential = ((스코어 - 72.0) × 113) ÷ 125</code>
                <span style="color:#666; font-size:0.8rem;">* 예시: 84타일 경우 ((84 - 72.0) × 113) ÷ 125 ≈ 10.8</span>
            </div>
            <table style="width:100%; border-collapse:collapse; margin-top:10px;">
                <thead>
                    <tr style="background:#f4f4f4; border-bottom:2px solid #ddd;">
                        <th style="padding:10px; text-align:left;">순위</th>
                        <th style="padding:10px; text-align:left;">성함</th>
                        <th style="padding:10px; text-align:right;">핸디캡 (전체)</th>
                        <th style="padding:10px; text-align:right;">핸디캡 (신원)</th>
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
                    <td style="padding:10px; text-align:right; color:#2c3e50; font-weight:bold;">${m.h26_total}</td>
                    <td style="padding:10px; text-align:right; color:#577b2d; font-weight:bold;">${m.h26_shinwon}</td>
                    <td style="padding:10px; text-align:right;">${m.avgScore}</td>
                    <td style="padding:10px; text-align:right;">${m.rounds}회(신원 ${m.shinwonRounds}회)</td>
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

        // Sort sponsors by sponsorship count descending (most active sponsor first)
        const sortedSponsors = Object.entries(sponsors).sort((a, b) => b[1].length - a[1].length);

        let html = '<div style="display:flex; flex-direction:column; gap:15px; margin-top:10px;">';
        sortedSponsors.forEach(([name, items]) => {
            // 최신 날짜순 정렬 (8월 -> 6월 -> 5월 ...)
            items.sort((a, b) => {
                const parseDateVal = (item) => {
                    const mmMatch = item.month.match(/(\d+)월/);
                    const ddMatch = item.date.match(/(\d+)\.(\d+)/);
                    if (mmMatch && ddMatch) {
                        return new Date(2026, parseInt(mmMatch[1]) - 1, parseInt(ddMatch[2]));
                    }
                    return new Date(0);
                };
                return parseDateVal(b) - parseDateVal(a);
            });

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

        const [{ data: rsvps, error: rsvpError }, { data: scores, error: scoreError }] = await Promise.all([
            supabaseClient.from('rsvps').select('name, month, date').eq('status', 'attend'),
            supabaseClient.from('scores').select('date, venue')
        ]);

        if (rsvpError || scoreError) throw rsvpError || scoreError;

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const shinwonRounds = [];
        scores.forEach(s => {
            if (s.venue && s.venue.includes('신원')) {
                if (s.date && s.date.length === 6 && !isNaN(parseInt(s.date))) {
                    const mm = parseInt(s.date.substring(2, 4), 10);
                    const dd = parseInt(s.date.substring(4, 6), 10);
                    shinwonRounds.push({ month: mm, day: dd });
                }
            }
        });

        const counts = {};
        const visitedRounds = new Set();
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

            // 동일 회원의 동일 라운드 중복 집계 방지 (스폰서 중복 레코드 등 배제)
            const visitKey = `${name}|${r.month.trim()}|${r.date.trim()}`;
            if (visitedRounds.has(visitKey)) return;
            visitedRounds.add(visitKey);

            // RSVP의 월/일 파싱
            const rMonthMatch = r.month.match(/(\d+)월/);
            const rDateMatch = r.date.match(/(\d+)\.(\d+)/);
            let isShinwon = false;

            if (rMonthMatch && rDateMatch) {
                const rM = parseInt(rMonthMatch[1], 10);
                const rD = parseInt(rDateMatch[2], 10);
                // 월이 일치하고 개최일 차이가 5일 이내인 경우 동일 라운드로 판단 (일정 변동 극복)
                isShinwon = shinwonRounds.some(sr => sr.month === rM && Math.abs(sr.day - rD) <= 5);
            }

            if (!counts[name]) {
                counts[name] = { total: 0, shinwon: 0 };
            }
            counts[name].total += 1;
            if (isShinwon) {
                counts[name].shinwon += 1;
            }
        });

        const sorted = Object.entries(counts).sort((a, b) => b[1].total - a[1].total);

        let html = `
            <div style="margin-bottom:15px; font-size:0.9rem; color:#666; background:#f0f7f4; padding:10px; border-radius:6px;">
                💡 오늘(${today.toLocaleDateString()})까지 개최된 라운드 기준 통계입니다.
            </div>
            <div style="display:grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap:10px;">
                ${sorted.map(([name, stat]) => `
                    <div style="padding:12px; background:#fff; border:1px solid #e0e0e0; border-radius:8px; text-align:center; box-shadow:0 2px 4px rgba(0,0,0,0.05);">
                        <div style="font-size:1.1rem; font-weight:bold; color:#1e3a2b;">${name}</div>
                        <div style="color:#577b2d; font-size:0.9rem; font-weight:bold;">총 ${stat.total}회 참석</div>
                        <div style="color:#666; font-size:0.8rem; margin-top:4px; font-weight:500;">(신원CC ${stat.shinwon}회)</div>
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

async function showAwardSummary() {
    try {
        const year = document.getElementById('stats-year').value;
        openStatsModal(`${year}년 수상자 내역 요약`, '<div style="text-align:center; padding:20px;">데이터를 불러오는 중...</div>');

        const { data: rsvps, error } = await supabaseClient
            .from('rsvps')
            .select('name, month, date, roundscore, roundaward, status')
            .not('roundaward', 'is', null)
            .not('roundaward', 'eq', '');

        if (error) throw error;

        // 2026년도 데이터만 필터링
        const filteredRsvps = rsvps.filter(r => {
            const monthMatch = r.month.match(/(\d+)월/);
            const dateMatch = r.date.match(/(\d+)\.(\d+)/);
            if (monthMatch && dateMatch) {
                return true;
            }
            return false;
        });

        // 1. 분류 데이터 구조 정의
        const categories = {
            medal: { title: "🏅 역대 메달리스트", list: [], icon: "🥇" },
            newperio: { title: "🏆 신페리오 우승", list: [], icon: "🏆" },
            longest: { title: "🏌️ 롱기스트", list: [], icon: "🎯" },
            nearest: { title: "⛳ 니어리스트", list: [], icon: "⛳" },
            multishot: { title: "📊 다관왕 (다버디/다파/다보기 등)", list: [], icon: "📊" },
            others: { title: "🎁 기타 시상 (준우승/행운상/발전상 등)", list: [], icon: "🎁" }
        };

        filteredRsvps.forEach(r => {
            const name = (r.name || '').trim();
            const award = (r.roundaward || '').trim();
            const score = r.roundscore;
            const dateStr = `${r.month} ${r.date}`;
            
            const item = { name, award, score, month: r.month, date: r.date, dateStr };

            // 분류 매칭
            if (award.includes('메달') || award === '메달리스트') {
                categories.medal.list.push(item);
            } else if (award.includes('신페리오')) {
                categories.newperio.list.push(item);
            } else if (award.includes('롱기스트')) {
                // 거리 추출
                const distMatch = award.match(/(\d+(\.\d+)?\s*(m|미터)?)/i);
                item.extra = distMatch ? distMatch[1] : '';
                categories.longest.list.push(item);
            } else if (award.includes('니어리스트')) {
                // 거리 추출
                const distMatch = award.match(/(\d+(\.\d+)?\s*(m|미터|cm)?)/i);
                item.extra = distMatch ? distMatch[1] : '';
                categories.nearest.list.push(item);
            } else if (award.includes('다버디') || award.includes('다파') || award.includes('다보기') || award.includes('다더블') || award.includes('다따블')) {
                // 개수 추출
                const countMatch = award.match(/(\d+\s*개)/);
                item.extra = countMatch ? countMatch[1] : '';
                categories.multishot.list.push(item);
            } else {
                categories.others.list.push(item);
            }
        });

        // 2. 날짜 내림차순 정렬 (최신 라운드 우선)
        const sortDesc = (list) => {
            list.sort((a, b) => {
                const parseDate = (item) => {
                    const mmMatch = item.month.match(/(\d+)월/);
                    const ddMatch = item.date.match(/(\d+)\.(\d+)/);
                    if (mmMatch && ddMatch) {
                        return new Date(2026, parseInt(mmMatch[1]) - 1, parseInt(ddMatch[2]));
                    }
                    return new Date(0);
                };
                return parseDate(b) - parseDate(a);
            });
        };

        Object.keys(categories).forEach(k => sortDesc(categories[k].list));

        // 3. HTML 렌더링
        let html = '<div style="display:flex; flex-direction:column; gap:20px; margin-top:10px;">';

        Object.values(categories).forEach(cat => {
            if (cat.list.length === 0) return; // 내용이 없는 카테고리는 생략

            html += `
                <div style="padding:20px; background:#fff; border:1px solid #e0c58a; border-radius:12px; box-shadow:0 4px 12px rgba(197, 160, 89, 0.08);">
                    <div style="font-weight:bold; color:#1e3a2b; font-size:1.15rem; margin-bottom:12px; border-bottom:2px solid #f0e6d2; padding-bottom:8px; display:flex; align-items:center; gap:8px;">
                        <span>${cat.icon}</span>
                        <span>${cat.title}</span>
                    </div>
                    <ul style="margin:0; padding-left:20px; color:#444; line-height:1.8;">
            `;

            cat.list.forEach(i => {
                let detail = '';
                if (cat === categories.medal || cat === categories.newperio) {
                    detail = i.score ? `<strong>${i.score}타</strong>` : '';
                } else if (cat === categories.longest || cat === categories.nearest || cat === categories.multishot) {
                    const awardNameOnly = i.award.replace(/[\(\)]/g, '').replace(/\d+(\.\d+)?\s*(m|미터|cm|개)?/gi, '').trim();
                    detail = `${awardNameOnly} ${i.extra ? `<strong style="color:#c5a059;">(${i.extra})</strong>` : ''}`;
                } else {
                    detail = `<strong>${i.award}</strong>`;
                }

                html += `
                    <li style="margin-bottom:6px;">
                        <span style="color:#888; font-size:0.85rem; margin-right:8px;">[${i.dateStr}]</span>
                        <span style="font-weight:bold; color:#333; margin-right:6px;">${i.name}</span>
                        <span>${detail}</span>
                    </li>
                `;
            });

            html += `</ul></div>`;
        });

        html += '</div>';

        openStatsModal(`${year}년 수상자 내역 요약`, html);

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
    } else if (normalized.includes('수상') || normalized.includes('우승') || normalized.includes('시상') || normalized.includes('롱기') || normalized.includes('니어')) {
        showAwardSummary();
    } else {
        alert('질문을 이해하지 못했습니다. "핸디캡", "스폰서", "참석", "수상" 등의 키워드를 포함해 주세요.');
    }
}

// Export functions to window
window.handleSmartQuery = handleSmartQuery;
window.showHandicapRanking = showHandicapRanking;
window.showSponsorSummary = showSponsorSummary;
window.showAttendanceStats = showAttendanceStats;
window.showAwardSummary = showAwardSummary;
window.closeStatsModal = closeStatsModal;
