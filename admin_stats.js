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

        // 1. 최다 수상자 랭킹 집계 (중복 방지 적용)
        const awardCounts = {};
        const visitedAwards = new Set();

        filteredRsvps.forEach(r => {
            const name = (r.name || '').trim();
            const award = (r.roundaward || '').trim();
            if (!name || !award) return;

            // 동일 회원의 동일 날짜의 동일 시상 중복 방지
            const key = `${name}|${r.month.trim()}|${r.date.trim()}|${award}`;
            if (visitedAwards.has(key)) return;
            visitedAwards.add(key);

            awardCounts[name] = (awardCounts[name] || 0) + 1;
        });

        // 횟수별 그룹화 및 내림차순 정렬
        const countGroups = {};
        Object.entries(awardCounts).forEach(([name, count]) => {
            if (!countGroups[count]) countGroups[count] = [];
            countGroups[count].push(name);
        });

        const sortedCounts = Object.keys(countGroups)
            .map(Number)
            .sort((a, b) => b - a);

        let rankingHtml = '';
        if (sortedCounts.length > 0) {
            rankingHtml += `
                <div style="padding:22px; background:#fffdf5; border:2px solid #f1c40f; border-radius:12px; box-shadow:0 6px 16px rgba(241, 196, 15, 0.08); margin-bottom:25px;">
                    <div style="font-weight:bold; color:#d35400; font-size:1.2rem; margin-bottom:15px; display:flex; align-items:center; gap:8px; border-bottom:2px dashed #f5e3a8; padding-bottom:8px;">
                        <span>🏆</span>
                        <span>2026년 최다 수상자 랭킹 (Top 3)</span>
                    </div>
                    <div style="display:flex; flex-direction:column; gap:12px;">
            `;

            const rankMedals = ["🥇 1위", "🥈 2위", "🥉 3위"];
            const limit = Math.min(sortedCounts.length, 3);

            for (let i = 0; i < limit; i++) {
                const count = sortedCounts[i];
                const names = countGroups[count].join(', ');
                rankingHtml += `
                    <div style="display:flex; align-items:flex-start; font-size:1rem; border-bottom:1px solid #faf5e6; padding-bottom:8px; gap:10px;">
                        <div style="flex-shrink:0; min-width:130px; white-space:nowrap;">
                            <span style="font-weight:bold; color:#d35400; margin-right:6px;">${rankMedals[i]}</span>
                            <span style="color:#666; font-size:0.9rem;">(총 ${count}회)</span>
                        </div>
                        <div style="flex:1; font-weight:bold; color:#2c3e50; font-size:1.02rem; line-height:1.4;">
                            ${names}
                        </div>
                    </div>
                `;
            }

            rankingHtml += `</div></div>`;
        }

        // 정적 수상 상세 데이터 (m, 개수 등 DB에 누락된 거리/개수 정보 보정 사전)
        const awardDetails = {
            // 3월
            "3월|3.25|남서우|롱기스트": "250m",
            "3월|3.25|조중규|니어리스트": "1.5m",
            "3월|3.25|이성원|다버디": "1개",
            "3월|3.25|정지환|다파": "8개",
            "3월|3.25|김도열|다보기": "12개",
            // 4월 (4/3 회장단 라운드)
            "4월|4.3|정민호|롱기스트": "275m",
            "4월|4.3|김도열|니어리스트": "1m",
            // 4월 (4/22 정기 라운드)
            "4월|4.22|남서우|니어리스트": "1.2m", // X 남서우
            "4월|4.22|박철호|다버디": "2개",
            "4월|4.22|이성원|다파": "12개",
            "4월|4.22|이영규|다보기": "13개",
            "4월|4.22|전은미|다따블": "9개",
            "4월|4.22|전은미|다더블": "9개",
            // 6월
            "6월|6.24|정지환|롱기스트": "212m",
            "6월|6.24|전은미|니어리스트": "1.6m",
            "6월|6.24|이문형|다파": "9개",
            "6월|6.24|신소우|다보기": "9개",
            "6월|6.24|정민호|다따블": "9개",
            "6월|6.24|정민호|다더블": "9개"
        };

        // 2. 분류 데이터 구조 정의
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
            
            const item = { name, award, score, month: r.month, date: r.date, dateStr, extra: '' };

            // 보정 사전 매칭 키 정의
            const lookupKey = `${r.month.trim()}|${r.date.trim()}|${name}|${award}`;
            if (awardDetails[lookupKey]) {
                item.extra = awardDetails[lookupKey];
            }

            // 분류 매칭
            if (award.includes('메달') || award === '메달리스트') {
                categories.medal.list.push(item);
            } else if (award.includes('신페리오')) {
                categories.newperio.list.push(item);
            } else if (award.includes('롱기스트')) {
                if (!item.extra) {
                    const distMatch = award.match(/(\d+(\.\d+)?\s*(m|미터)?)/i);
                    item.extra = distMatch ? distMatch[1] : '';
                }
                categories.longest.list.push(item);
            } else if (award.includes('니어리스트')) {
                if (!item.extra) {
                    const distMatch = award.match(/(\d+(\.\d+)?\s*(m|미터|cm)?)/i);
                    item.extra = distMatch ? distMatch[1] : '';
                }
                categories.nearest.list.push(item);
            } else if (award.includes('다버디') || award.includes('다파') || award.includes('다보기') || award.includes('다더블') || award.includes('다따블') || award.includes('다떠블')) {
                if (!item.extra) {
                    const countMatch = award.match(/(\d+\s*개)/);
                    item.extra = countMatch ? countMatch[1] : '';
                }
                categories.multishot.list.push(item);
            } else {
                categories.others.list.push(item);
            }
        });

        // 다버디/다파/다보기 정렬 가중치 정의
        const getAwardPriority = (awardName) => {
            if (awardName.includes('다버디')) return 1;
            if (awardName.includes('다파')) return 2;
            if (awardName.includes('다보기')) return 3;
            if (awardName.includes('다따블') || awardName.includes('다더블') || awardName.includes('다떠블')) return 4;
            return 5;
        };

        // 3. 날짜 내림차순 정렬 (최신 라운드 우선)
        const sortDesc = (list, isMultishot = false) => {
            list.sort((a, b) => {
                const parseDate = (item) => {
                    const mmMatch = item.month.match(/(\d+)월/);
                    const ddMatch = item.date.match(/(\d+)\.(\d+)/);
                    if (mmMatch && ddMatch) {
                        return new Date(2026, parseInt(mmMatch[1]) - 1, parseInt(ddMatch[2]));
                    }
                    return new Date(0);
                };
                const dateDiff = parseDate(b) - parseDate(a);
                if (dateDiff !== 0) return dateDiff; // 날짜가 다르면 날짜 최신순

                // 동일 날짜 시 다버디 -> 다파 -> 다보기 순서 강제
                if (isMultishot) {
                    return getAwardPriority(a.award) - getAwardPriority(b.award);
                }
                return 0;
            });
        };

        Object.keys(categories).forEach(k => {
            sortDesc(categories[k].list, k === 'multishot');
        });

        // 4. HTML 렌더링
        let html = rankingHtml; // 최다 수상자 랭킹 레이아웃을 가장 상단에 얹음
        html += '<div style="display:flex; flex-direction:column; gap:20px; margin-top:10px;">';

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
