// Supabase Configuration
const SUPABASE_URL = 'https://qfzmwlyqezmkkxtpscik.supabase.co';
const SUPABASE_KEY = 'sb_publishable_mYejtROOg-2JN7z6_RlWdg_PXYSYgFi'; // Anon Key
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Force cleanup of legacy local login state to ensure sessionStorage takes over
if (localStorage.getItem('snu_golf_logged_in')) {
    const wasLoggedIn = localStorage.getItem('snu_golf_logged_in');
    if (wasLoggedIn === 'true') {
        sessionStorage.setItem('snu_golf_logged_in', 'true');
    }
    localStorage.removeItem('snu_golf_logged_in');
}

// Global CSV Data for Stats lookup (Sorted Alphabetically)
const CSV_DATA_STRING = `
, ,Name,강순대,곽노준,권민오,김기록,김대욱,김태일,남서우,문성욱,박상길,박철호,박청산,박희석,송원득,신소우,심민선,안삼근,안원익,이교구,이대식,이문형,이상열,이석환,이용환,정대규,정민호,정지환,조중규,현성호,박지선,신수희,김윤석,이진우,장병탁,이성원,전은미,최정훈,김종세,배태근,권혁찬,한예성,최철호,이재욱,이준기,이주민,김은현,채성희,김도열,이영규
count,Date,CC/HD,92.5,88.7,97.3,87.5,87,89.5,90.6,91,83.2,86.6,89.4,88,87.4,101.5,98.3,100.3,0,93,90,86,98,83.3,106.7,93,94.3,88.3,92.6,82.3,105,96.7,0,111,90,78.3,94.5,77.7,88,85.5,101,0,87,101,93,94.7,98.5,100,87,97
1,250427,알펜시아,99,93,97,90,93,96,94,91,86,88,85,92,94,101,103,106,0,90,96,86,98,85,112,99,100,91,92,53,,,,,,,,,,,,,,,,,,,,
2,250625,힐드로사이,,91,,,89,,,,75,,86,,,,94,,,,,,,,,98,96,,,72,,,,,,70,79,,,,,,,,,,,,,
3,250726,88CC,,,103,85,85,83,85,,81,80,80,,,,,90,,,86,,,84,,89,89,,,83,,92,,,90,,92,75,88,86,,,,,,,,,,
4,250827,힐드로사이,,,,,87,,94,,,85,91,,,105,98,105,,,94,,,,,102,99,,102,,,,,,,,104,,,,,,,,,,,,,
5,250910,사우스스프링스,,82,,,82,,92,,85,87,92,,82,,99,,,,,82,,81,104,92,90,86,91,88,,99,,,,77,100,78,,,101,,87,,,,,,,
6,250924,힐드로사이,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
7,251019,대호단양,86,,92,,85,,,,89,,91,81,84,,,100,,96,84,88,,,,85,,88,87,90,,,,,,88,,80,,85,,,,101,93,89,93,,,
8,251022,힐드로사이,,,,,89,,88,,,,96,,90,101,94,,,,,88,,,104,88,91,,,94,105,99,,111,,,96,,,,,,,,,97,,100,,
9,251126,힐드로사이,,,,,86,,,,,93,94,91,87,99,102,,,,,,,,,91,95,,91,96,,,,,,,96,,,,,,,,,98,104,,87,97
`;

document.addEventListener('DOMContentLoaded', () => {
    // Smooth scrolling for navigation links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            e.preventDefault();
            document.querySelector(this.getAttribute('href')).scrollIntoView({
                behavior: 'smooth'
            });
        });
    });

    // Intersection Observer for scroll animations
    const observerOptions = {
        root: null,
        rootMargin: '0px',
        threshold: 0.1
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                observer.unobserve(entry.target); // Animate only once
            }
        });
    }, observerOptions);

    const fadeElements = document.querySelectorAll('.fade-in-on-scroll');
    fadeElements.forEach(el => {
        observer.observe(el);
    });

    // Render Scores using global data
    // Render Scores using global data (Public View: Only Handicap)
    const scoreContainer = document.getElementById('score-table-container');
    if (scoreContainer) {
        renderTable(parseCSV(CSV_DATA_STRING.trim()), scoreContainer, false);
    }

    // Login Check & Section Toggle
    checkLogin();

    // RSVP Logic
    initRSVP();

    // Global UI components & Data Loading
    loadMembers();
    renderPublicRSVPs();
    initAdminTabs();
    initAdminMemberManagement();
    initAdminButtons();

    // Admin Modal setup (for index.html)
    const adminLink = document.getElementById('admin-link');
    const adminModal = document.getElementById('admin-modal');
    const adminCloseBtn = document.querySelector('.admin-close');
    if (adminLink && adminModal) {
        setupAdminModal(adminLink, adminModal, adminCloseBtn);
    }
});

function checkLogin() {
    const isLoggedIn = sessionStorage.getItem('snu_golf_logged_in') === 'true';
    const protectedSections = document.querySelectorAll('.protected-section');
    const loginLink = document.getElementById('login-link');

    if (isLoggedIn) {
        protectedSections.forEach(el => el.classList.remove('hidden'));
        if (loginLink) {
            loginLink.textContent = '로그아웃';
            loginLink.href = '#';
            loginLink.onclick = (e) => {
                e.preventDefault();
                sessionStorage.removeItem('snu_golf_logged_in');
                window.location.reload();
            };
        }
    } else {
        protectedSections.forEach(el => el.classList.add('hidden'));
        if (loginLink) {
            loginLink.textContent = '로그인';
            loginLink.href = 'login.html';
            loginLink.onclick = null;
        }
    }

    // Hero Buttons Logic for Public/Protected
    const heroRsvpBtn = document.getElementById('hero-rsvp-btn');
    const heroScoresBtn = document.getElementById('hero-scores-btn');

    if (heroScoresBtn) {
        heroScoresBtn.onclick = (e) => {
            if (!isLoggedIn) {
                e.preventDefault();
                if (confirm('회원 전용 메뉴입니다. 로그인 하시겠습니까?')) {
                    window.location.href = 'login.html?next=index.html#scores';
                }
            }
        };
    }

    if (heroRsvpBtn) {
        heroRsvpBtn.onclick = (e) => {
            e.preventDefault();
            if (!isLoggedIn) {
                if (confirm('회원 전용 메뉴입니다. 로그인 하시겠습니까?')) {
                    window.location.href = 'login.html?next=index.html#schedule';
                }
            } else {
                // Original logic for RSVP toggle
                const firstCard = document.querySelector('.schedule-card:not(.break)');
                if (firstCard) {
                    firstCard.click();
                } else {
                    alert("신청 가능한 일정이 없습니다.");
                }
            }
        };
    }

    // Schedule Cards click listener
    const cards = document.querySelectorAll('.schedule-card:not(.break)');
    cards.forEach(card => {
        const oldHandler = card.onclick;
        card.onclick = (e) => {
            if (!isLoggedIn) {
                if (confirm('회원 전용 메뉴입니다. 로그인 하시겠습니까?')) {
                    window.location.href = 'login.html?next=index.html#schedule';
                }
                return;
            }
            // if logged in, let initRSVP handle it or call it here
        };
    });
}

function initRSVP() {
    const modal = document.getElementById('rsvp-modal');
    if (!modal) return; // 전용 관리자 페이지 등에서는 RSVP 로직 건너뜀

    const closeBtn = document.querySelector('.close-btn');
    const form = document.getElementById('rsvp-form');
    const cards = document.querySelectorAll('.schedule-card:not(.break)');
    const modalSubtitle = document.getElementById('modal-subtitle');
    const rsvpMonthInput = document.getElementById('rsvp-month');
    const rsvpDateInput = document.getElementById('rsvp-date');

    // Open Modal
    cards.forEach(card => {
        card.addEventListener('click', () => {
            const month = card.querySelector('.month').textContent;
            const date = card.querySelector('.date').textContent;

            const availability = getRSVPAvailability(month);

            if (availability.status === 'not_open') {
                alert(`${month} 라운드 신청은 ${availability.availableFrom}부터 가능합니다.`);
                return;
            }

            modalSubtitle.textContent = `일시: ${month} ${date}`;
            if (availability.status === 'waiting') {
                modalSubtitle.innerHTML += ` <span style="color: #d35400; font-weight: bold; margin-left: 10px;">(현재 대기자 신청 기간입니다)</span>`;
            }

            rsvpMonthInput.value = month;
            rsvpDateInput.value = date;

            modal.style.display = 'block';
        });
    });

    // RSVP Logic handled by card click in checkLogin once it's set up
    // However, initRSVP sets up the modal behavior. 
    // Let's modify initRSVP to not conflict.

    // Close Modal
    closeBtn.onclick = () => {
        modal.style.display = 'none';
        form.reset();
    };

    window.onclick = (event) => {
        if (event.target == modal) {
            modal.style.display = 'none';
            form.reset();
        }
    };

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const availability = getRSVPAvailability(rsvpMonthInput.value);

        const formData = {
            name: document.getElementById('name').value,
            phone: document.getElementById('phone').value,
            status: document.querySelector('input[name="status"]:checked').value,
            sponsor: document.getElementById('sponsor').value,
            month: rsvpMonthInput.value,
            date: rsvpDateInput.value,
            iswaiting: (availability.status === 'waiting')
        };

        try {
            const { error } = await supabaseClient
                .from('rsvps')
                .insert([formData]);

            if (error) throw error;

            alert('참석 신청이 완료되었습니다.');
            modal.style.display = 'none';
            form.reset();

            // Refresh public view and admin
            renderPublicRSVPs();
            loadAdminData();
        } catch (error) {
            console.error('Error submitting RSVP:', error);
            alert('저장 실패: ' + error.message);
        }
    });

}

function initAdminTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            const targetContent = document.getElementById(tabId);
            if (targetContent) targetContent.classList.add('active');
        });
    });
}

function initAdminMemberManagement() {
    const addMemberBtn = document.getElementById('add-member-btn');
    const newMemberTypeSelect = document.getElementById('new-member-type');
    const newMemberRoleInput = document.getElementById('new-member-role');

    if (newMemberTypeSelect) {
        newMemberTypeSelect.addEventListener('change', () => {
            if (newMemberTypeSelect.value === 'executive' || newMemberTypeSelect.value === 'special') {
                newMemberRoleInput.style.display = 'block';
                newMemberRoleInput.placeholder = newMemberTypeSelect.value === 'executive' ? '직책 (예: 회장)' : '설명/직책';
            } else {
                newMemberRoleInput.style.display = 'none';
            }
        });
    }

    if (addMemberBtn) {
        addMemberBtn.addEventListener('click', () => {
            const nameInput = document.getElementById('new-member-name');
            const type = newMemberTypeSelect.value;
            const role = newMemberRoleInput ? newMemberRoleInput.value.trim() : '';
            const name = nameInput.value.trim();

            if (!name) {
                alert('이름을 입력해주세요.');
                return;
            }

            addMember(name, type, role);
            nameInput.value = '';
            if (newMemberRoleInput) newMemberRoleInput.value = '';
        });
    }
}

function initAdminButtons() {
    const adminRefreshBtn = document.getElementById('admin-refresh-btn');
    const adminClearBtn = document.getElementById('admin-clear-btn');
    const adminDownloadBtn = document.getElementById('admin-download-btn');

    if (adminRefreshBtn) {
        adminRefreshBtn.onclick = loadAdminData;
    }

    if (adminClearBtn) {
        adminClearBtn.onclick = async () => {
            if (confirm("정말로 모든 신청 데이터를 삭제하시겠습니까? (Supabase 데이터가 모두 삭제됩니다)")) {
                const { error } = await supabaseClient
                    .from('rsvps')
                    .delete()
                    .neq('id', 0);

                if (error) {
                    alert("삭제 실패: " + error.message);
                } else {
                    loadAdminData();
                    renderPublicRSVPs();
                    alert("초기화되었습니다.");
                }
            }
        };
    }

    if (adminDownloadBtn) {
        adminDownloadBtn.onclick = downloadScorecard;
    }
}

function setupAdminModal(adminLink, adminModal, adminCloseBtn) {
    const sha256 = async (message) => {
        const msgBuffer = new TextEncoder().encode(message);
        const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    };

    adminLink.onclick = async (e) => {
        e.preventDefault();
        const password = prompt("관리자 비밀번호를 입력하세요");
        if (!password) return;
        const targetHash = '07e47f77d22e2fc388c2d12f73b8b8b7e9928630d39a4964a9daabbc27a060f4';
        try {
            const inputHash = await sha256(password);
            if (inputHash === targetHash) {
                loadAdminData();
                loadAdminMembers();
                adminModal.style.display = 'block';
            } else {
                alert("비밀번호가 틀렸습니다.");
            }
        } catch (err) {
            console.error('Admin hash error:', err);
        }
    };

    if (adminCloseBtn) {
        adminCloseBtn.onclick = () => { adminModal.style.display = 'none'; };
    }

    // Modal background click
    window.addEventListener('click', (event) => {
        if (event.target == adminModal) {
            adminModal.style.display = 'none';
        }
    });
}

/* --- Member Management Functions --- */

// initMembers() function removed as data is now managed by Supabase

async function loadMembers() {
    const { data: members, error } = await supabase
        .from('members')
        .select('*');

    if (error) {
        console.error('Error loading members:', error);
        return;
    }

    const execList = document.getElementById('member-list-executive');

    if (execList) execList.innerHTML = '';

    // Filter for executives and special members for the public view
    const executives = members.filter(m => m.type === 'executive' || m.type === 'special');

    if (executives.length === 0) {
        if (execList) execList.innerHTML = '<p style="color:#888; text-align:center; width:100%;">등록된 임원진이 없습니다.</p>';
        return;
    }

    // Sort by name
    executives.sort((a, b) => a.name.localeCompare(b.name, 'ko'));

    executives.forEach(member => {
        const div = document.createElement('div');
        div.className = 'executive-card';
        div.style.padding = '15px 25px';
        div.style.background = '#fefefe';
        div.style.border = '1px solid #e0e0e0';
        div.style.borderRadius = '30px';
        div.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
        div.style.textAlign = 'center';
        div.style.minWidth = '150px';

        div.innerHTML = `
            <div style="font-size: 0.85rem; color: #577b2d; font-weight: bold; margin-bottom: 5px;">${member.role || '임원'}</div>
            <div style="font-size: 1.1rem; font-weight: bold; color: #333;">${member.name}</div>
        `;

        if (execList) {
            execList.appendChild(div);
        }
    });

    // Also populate admin view if open
    loadAdminMembers(members);
}

async function addMember(name, type, role) {
    const { error } = await supabase
        .from('members')
        .insert([{ name, type, role }]);

    if (error) {
        console.error('Error adding member:', error);
        alert('회원 추가 실패: ' + error.message);
        return;
    }

    loadMembers(); // Refresh both views
}

async function deleteMember(name) {
    if (!confirm(`${name}님을 정말 삭제하시겠습니까?`)) return;

    const { error } = await supabase
        .from('members')
        .delete()
        .eq('name', name);

    if (error) {
        console.error('Error deleting member:', error);
        alert('삭제 실패');
        return;
    }

    loadMembers();
}

async function updateMemberType(name, newType) {
    let role = '';
    if (newType === 'executive' || newType === 'special') {
        role = prompt(`${name}님의 직책/설명을 입력해주세요:`, '');
        if (role === null) return; // User cancelled prompt
    }

    const { error } = await supabase
        .from('members')
        .update({ type: newType, role: role })
        .eq('name', name);

    if (error) {
        console.error('Error updating member type:', error);
        alert('업데이트 실패');
        return;
    }

    loadMembers();
}

async function loadAdminMembers(prefetchedMembers = null) {
    const tbody = document.querySelector('#admin-member-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    let members = prefetchedMembers;
    if (!members) {
        const { data, error } = await supabase.from('members').select('*');
        if (error) {
            console.error('Error loading admin members:', error);
            return;
        }
        members = data;
    }

    const typeOrder = { 'executive': 1, 'special': 2, 'jeong': 3, 'jun': 4, 'ilban': 5 };
    members.sort((a, b) => {
        if (typeOrder[a.type] !== typeOrder[b.type]) {
            return typeOrder[a.type] - typeOrder[b.type];
        }
        return a.name.localeCompare(b.name, 'ko');
    });

    members.forEach((item) => {
        const tr = document.createElement('tr');
        const isExecutive = item.type === 'executive';

        tr.innerHTML = `
            <td style="padding: 10px; border: 1px solid #ddd;">${item.name}</td>
            <td style="padding: 10px; border: 1px solid #ddd;">
                <select onchange="updateMemberType('${item.name}', this.value)" style="padding: 4px; border-radius: 4px; border: 1px solid #ddd; width: 100%;">
                    <option value="ilban" ${item.type === 'ilban' ? 'selected' : ''}>일반회원</option>
                    <option value="jeong" ${item.type === 'jeong' ? 'selected' : ''}>정회원</option>
                    <option value="jun" ${item.type === 'jun' ? 'selected' : ''}>준회원</option>
                    <option value="special" ${item.type === 'special' ? 'selected' : ''}>특별회원</option>
                    <option value="executive" ${item.type === 'executive' ? 'selected' : ''}>임원</option>
                </select>
                ${(isExecutive || item.type === 'special') ? `<div style="font-size: 0.75rem; color: #577b2d; margin-top: 4px; font-weight: bold;">직책/설명: ${item.role || '보직없음'}</div>` : ''}
            </td>
            <td style="padding: 10px; border: 1px solid #ddd;">
                <input type="text" value="${item.awardhistory || ''}" onchange="updateMemberAward('${item.name}', this.value)" placeholder="수상 이력 입력" style="width: 100%; padding: 4px; border: 1px solid #ddd;">
            </td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">
                <button class="cta-button" onclick="deleteMember('${item.name}')" style="padding: 2px 8px; font-size: 0.8rem; background-color: #e74c3c; min-width: auto;">삭제</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function updateMemberAward(name, value) {
    const { error } = await supabase
        .from('members')
        .update({ awardhistory: value })
        .eq('name', name);

    if (error) console.error('Error updating award history:', error);
}

async function updateRSVPField(id, field, value) {
    const { error } = await supabaseClient
        .from('rsvps')
        .update({ [field.toLowerCase()]: value })
        .eq('id', id);

    if (error) {
        console.error('Error updating RSVP field:', error);
    }
}

function getMemberStats(name) {
    const csvData = parseCSV(CSV_DATA_STRING.trim());
    const names = csvData[0];
    const nameIndex = names.findIndex(n => n.trim() === name.trim());

    if (nameIndex === -1) return { h25: '-', last: '-', h26: '-' };

    // 25y Handicap (Row index 1)
    const h25 = csvData[1][nameIndex] || '-';

    // Last Month Score (Latest available non-empty score)
    let last = '-';
    for (let i = csvData.length - 1; i >= 2; i--) {
        const val = csvData[i][nameIndex];
        if (val && val.trim() !== '' && val.trim() !== '0' && val.trim() !== '0.0') {
            last = val;
            break;
        }
    }

    // 26y Handicap Calculation (Sum of 26xxxx scores / Round count)
    let sum26 = 0;
    let count26 = 0;
    for (let i = 2; i < csvData.length; i++) {
        const date = csvData[i][1]; // Column index 1 is Date
        if (date && date.trim().startsWith('26')) {
            const val = parseFloat(csvData[i][nameIndex]);
            if (!isNaN(val) && val > 0) {
                sum26 += val;
                count26++;
            }
        }
    }
    const h26 = count26 > 0 ? (sum26 / count26).toFixed(1) : '-';

    return { h25, last, h26 };
}

async function loadAdminData() {
    // 1. RSVP Table Update
    const rsvpTbody = document.querySelector('#admin-table tbody');
    if (rsvpTbody) {
        rsvpTbody.innerHTML = '<tr><td colspan="12" style="text-align:center; padding: 20px;">불러오는 중...</td></tr>';

        const { data, error } = await supabaseClient
            .from('rsvps')
            .select('*');

        if (error) {
            console.error('Error loading RSVPs:', error);
            rsvpTbody.innerHTML = '<tr><td colspan="12" style="text-align:center; padding: 20px; color: red;">실패: ' + error.message + '</td></tr>';
            return;
        }

        rsvpTbody.innerHTML = '';
        if (data.length === 0) {
            rsvpTbody.innerHTML = '<tr><td colspan="12" style="text-align:center; padding: 20px;">신청 내역이 없습니다.</td></tr>';
        } else {
            // Group by Month/Date
            const groupedData = data.reduce((acc, item) => {
                const key = `${item.month} ${item.date}`;
                if (!acc[key]) acc[key] = [];
                acc[key].push(item);
                return acc;
            }, {});

            const sortedKeys = Object.keys(groupedData).sort((a, b) => {
                const monthA = parseInt(a);
                const monthB = parseInt(b);
                return monthA - monthB;
            });

            sortedKeys.forEach(key => {
                const items = groupedData[key];
                const headerRow = document.createElement('tr');
                headerRow.style.backgroundColor = "#e8f5e9";
                const attendCount = items.filter(i => i.status === 'attend').length;
                headerRow.innerHTML = `
                    <td colspan="12" style="padding: 10px; border: 1px solid #ddd; font-weight: bold; color: #1e3a2b;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span>${key} (총 ${items.length}명 / 참석 ${attendCount}명)</span>
                            <button onclick="autoCalculateAwards('${key}')" style="background: #c5a059; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">자동 수상 계산</button>
                        </div>
                    </td>
                `;
                rsvpTbody.appendChild(headerRow);

                items.sort((a, b) => new Date(b.submittedat) - new Date(a.submittedat));
                items.forEach((item) => {
                    const tr = document.createElement('tr');
                    const stats = getMemberStats(item.name);

                    tr.innerHTML = `
                        <td style="padding: 10px; border: 1px solid #ddd;">${item.month} ${item.date}</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${item.name}${item.iswaiting ? ' <span style="color:#d35400; font-size:0.8rem;">(대기)</span>' : ''}</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${item.phone || '-'}</td>
                        <td style="padding: 10px; border: 1px solid #ddd; color: ${item.status === 'attend' ? 'green' : 'red'}; font-weight: bold;">
                            ${item.status === 'attend' ? (item.iswaiting ? '참석(대기)' : '참석') : '불참'}
                        </td>
                        <td style="padding: 5px; border: 1px solid #ddd;">
                            <input type="text" value="${item.sponsor || ''}" onchange="updateRSVPField(${item.id}, 'sponsor', this.value)" placeholder="스폰 내용" style="width: 100%; min-width: 80px; padding: 4px; border: 1px solid #ddd;">
                        </td>
                        <td style="padding: 5px; border: 1px solid #ddd; text-align: center;">
                            ${item.status === 'attend' ? `<input type="text" value="${item.roundscore || ''}" onchange="updateRSVPField(${item.id}, 'roundscore', this.value)" style="width: 50px; padding: 4px; text-align: center; border: 1px solid #ddd;">` : '-'}
                        </td>
                        <td style="padding: 5px; border: 1px solid #ddd; text-align: center;">
                            ${item.status === 'attend' ? `<input type="text" value="${item.roundaward || ''}" onchange="updateRSVPField(${item.id}, 'roundaward', this.value)" placeholder="우승 등" style="width: 80px; padding: 4px; border: 1px solid #ddd;">` : '-'}
                        </td>
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${stats.h25}</td>
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${stats.last}</td>
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${stats.h26}</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${item.submittedat ? new Date(item.submittedat).toLocaleString('ko-KR') : '-'}</td>
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">
                            <button onclick="deleteRSVP(${item.id})" style="background: #e74c3c; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">삭제</button>
                        </td>
                    `;
                    rsvpTbody.appendChild(tr);
                });
            });
        }
    }

    // 2. Score Table (Full View) for Admin
    const scoreContainer = document.getElementById('admin-score-table-container');
    if (scoreContainer) {
        renderTable(parseCSV(CSV_DATA_STRING.trim()), scoreContainer, true);
    }
}

async function renderPublicRSVPs() {
    const container = document.getElementById('public-rsvp-container');
    if (!container) return;

    const { data, error } = await supabaseClient
        .from('rsvps')
        .select('*');

    if (error) {
        console.error('Error rendering public RSVPs:', error);
        return;
    }

    if (data.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding: 40px; color:#888;">아직 신청 내역이 없습니다.</div>';
        return;
    }

    const groupedData = data.reduce((acc, item) => {
        const key = `${item.month} ${item.date}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
    }, {});

    const sortedKeys = Object.keys(groupedData).sort((a, b) => {
        const monthA = parseInt(a);
        const monthB = parseInt(b);
        return monthA - monthB;
    });
    container.innerHTML = '';

    sortedKeys.forEach(key => {
        const items = groupedData[key];
        const monthDiv = document.createElement('div');
        monthDiv.className = 'public-rsvp-month';
        monthDiv.style.marginBottom = '30px';

        const h3 = document.createElement('h3');
        h3.style.color = '#1e3a2b';
        h3.style.borderBottom = '2px solid #577b2d';
        h3.style.paddingBottom = '5px';
        h3.style.marginBottom = '15px';
        h3.textContent = key;
        monthDiv.appendChild(h3);

        const list = document.createElement('div');
        list.style.display = 'grid';
        list.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
        list.style.gap = '15px';

        items.forEach(item => {
            const stats = getMemberStats(item.name);
            const card = document.createElement('div');
            card.className = 'public-rsvp-card';
            card.style.background = '#fff';
            card.style.padding = '15px';
            card.style.borderRadius = '10px';
            card.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
            card.style.border = '1px solid #eee';

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <span style="font-weight: bold; font-size: 1.1rem; color: #333;">${item.name}${item.iswaiting ? ' <span style="font-size: 0.8rem; color: #d35400;">(대기)</span>' : ''}</span>
                    <span style="padding: 2px 8px; border-radius: 20px; font-size: 0.8rem; font-weight: bold; background: ${item.status === 'attend' ? '#e8f5e9' : '#ffebee'}; color: ${item.status === 'attend' ? '#2e7d32' : '#c62828'};">
                        ${item.status === 'attend' ? '참석' : '불참'}
                    </span>
                </div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; border-top: 1px solid #f5f5f5; pt: 10px; margin-top: 10px; padding-top: 10px;">
                    <div style="text-align: center;">
                        <div style="font-size: 0.7rem; color: #888;">25년 핸디</div>
                        <div style="font-weight: bold; color: #577b2d;">${stats.h25}</div>
                    </div>
                    <div style="text-align: center; border-left: 1px solid #f5f5f5; border-right: 1px solid #f5f5f5;">
                        <div style="font-size: 0.7rem; color: #888;">전월 스코어</div>
                        <div style="font-weight: bold; color: #d35400;">${stats.last}</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 0.7rem; color: #888;">26년 핸디</div>
                        <div style="font-weight: bold; color: #2980b9;">${stats.h26}</div>
                    </div>
                </div>
            `;
            list.appendChild(card);
        });

        monthDiv.appendChild(list);

        // 스폰서 정보 표시
        const sponsors = items.filter(i => i.sponsor && i.sponsor.trim() !== '');
        if (sponsors.length > 0) {
            const sponsorBox = document.createElement('div');
            sponsorBox.style.marginTop = '20px';
            sponsorBox.style.padding = '15px';
            sponsorBox.style.background = '#f1f8e9';
            sponsorBox.style.borderRadius = '8px';
            sponsorBox.style.border = '1px dashed #577b2d';

            sponsorBox.innerHTML = `
                <h4 style="margin: 0 0 10px 0; color: #2e7d32; display: flex; align-items: center;">
                    <span style="margin-right: 8px;">🎁</span> 이달의 스폰서
                </h4>
                <div style="display: flex; flex-wrap: wrap; gap: 10px;">
                    ${sponsors.map(s => `
                        <div style="background: #fff; padding: 5px 12px; border-radius: 20px; font-size: 0.9rem; border: 1px solid #c8e6c9; box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                            <span style="font-weight: bold; color: #1b5e20;">${s.name}</span>: ${s.sponsor}
                        </div>
                    `).join('')}
                </div>
            `;
            monthDiv.appendChild(sponsorBox);
        }

        container.appendChild(monthDiv);
    });
}

function parseCSV(text) {
    const lines = text.trim().split('\n');
    const data = lines.map(line => line.split(','));

    // 회원명 정렬 (Column 3부터가 회원 이름)
    if (data.length > 0) {
        const header = data[0];
        const memberInfo = [];

        // 3번째 열부터 끝까지 회원 데이터 추출
        for (let j = 3; j < header.length; j++) {
            const memberColumn = data.map(row => row[j]);
            memberInfo.push({
                name: header[j],
                columnData: memberColumn
            });
        }

        // 가나다 순으로 정렬
        memberInfo.sort((a, b) => a.name.localeCompare(b.name, 'ko'));

        // 정렬된 순서대로 데이터 재조합
        const newData = data.map(row => row.slice(0, 3));
        memberInfo.forEach(info => {
            info.columnData.forEach((val, i) => {
                newData[i].push(val);
            });
        });
        return newData;
    }
    return data;
}

function renderTable(data, container, isAdmin = false) {
    if (!data || data.length === 0) {
        container.innerHTML = '<div class="loading-spinner">데이터가 없습니다.</div>';
        return;
    }

    const table = document.createElement('table');
    table.id = isAdmin ? 'admin-score-table' : 'score-table';

    let headerRowData = data[0];
    let subHeaderRowData = data[1];
    let bodyRowsData = data.slice(2);

    // 메인 페이지(Public)인 경우 '25년 핸디' 행만 남기고 나머지 세부 스코어 행 삭제
    if (!isAdmin) {
        // subHeaderRowData (index 1) 가 'CC/HD' 및 핸디캡 행임
        // bodyRowsData를 비워버리면 세부 스코어 안 보임
        bodyRowsData = [];
    }

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.className = 'score-header-row';

    headerRowData.forEach((cell, index) => {
        const th = document.createElement('th');
        th.textContent = cell.trim();
        if (!isAdmin && index < 3) {
            // 메인 페이지에서 앞의 공백/카운트/날짜 열 숨기기 (선택적)
            // 일단 요청대로 가나다 순 회원명과 핸디캡만 강조
        }
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    const subHeaderRow = document.createElement('tr');
    subHeaderRow.className = 'score-sub-header-row';
    subHeaderRowData.forEach((cell, index) => {
        const td = document.createElement('td');
        td.textContent = cell.trim();
        if (index < 3) td.classList.add('sticky-col');
        subHeaderRow.appendChild(td);
    });
    tbody.appendChild(subHeaderRow);

    if (isAdmin) {
        bodyRowsData.forEach(rowData => {
            const tr = document.createElement('tr');
            const venue = rowData[2] || '';
            if (venue.includes('취소') || venue.includes('휴장')) {
                tr.className = 'cancel-row';
            }

            rowData.forEach((cell, index) => {
                const td = document.createElement('td');
                td.textContent = cell.trim();
                if (index < 3) {
                    td.classList.add('sticky-col');
                    if (index === 0) {
                        td.style.left = '0px';
                        td.style.zIndex = '21';
                    } else if (index === 1) {
                        td.style.left = '40px';
                        td.style.zIndex = '21';
                    } else if (index === 2) {
                        td.style.left = '100px';
                        td.style.zIndex = '21';
                    }
                    td.style.position = 'sticky';
                    td.style.backgroundColor = '#fff';
                }
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
    }

    table.appendChild(tbody);
    container.innerHTML = '';
    container.appendChild(table);

    // 관리자 상세 스코어 테이블용 추가 스타일 (JS로 직접 주입)
    if (isAdmin) {
        table.style.fontSize = '0.85rem';
        table.querySelectorAll('th, td').forEach(cell => {
            cell.style.border = '1px solid #ddd';
        });
        // 상세 스코어 테이블의 헤더를 위쪽에도 고정
        const headerCells = table.querySelectorAll('.score-header-row th');
        headerCells.forEach(th => {
            th.style.position = 'sticky';
            th.style.top = '0';
            th.style.zIndex = '40';
        });
        // 구석(첫 3개 열의 헤더)은 더 높은 우선순위
        for (let i = 0; i < 3; i++) {
            const th = headerCells[i];
            if (th) th.style.zIndex = '50';
        }
    }
}

function downloadScorecard() {
    try {
        const csvContent = CSV_DATA_STRING.trim();
        const encodedUri = "data:text/csv;charset=utf-8,%EF%BB%BF" + encodeURIComponent(csvContent);

        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "snu_golf_scorecard.csv");
        document.body.appendChild(link);

        link.click();

        setTimeout(() => {
            document.body.removeChild(link);
        }, 500);

        alert("원격 서버가 아닌 로컬 환경에서 실행 중인 경우, 브라우저 보안 정책에 따라 파일 다운로드 버튼이 작동하지 않을 수 있습니다.\n\n이 경우, 현재 폴더에 있는 'scores.csv' 파일을 직접 엑셀로 열어 수정해 주세요.");
    } catch (err) {
        console.error("Download failed:", err);
        alert("다운로드 중 오류가 발생했습니다. 현재 폴더의 'scores.csv' 파일을 직접 열어주세요.\n오류: " + err.message);
    }
}

/* --- Group Assignment Logic --- */

function shuffleArray(array) {
    const newArr = [...array];
    for (let i = newArr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArr[i], newArr[j]] = [newArr[j], newArr[i]];
    }
    return newArr;
}

async function assignGroups(mode) {
    let participants = [];

    if (mode === 'sample') {
        // 전체 회원 기반 (샘플)
        const { data: members, error } = await supabaseClient.from('members').select('name');
        if (error) return;
        participants = members.map(m => m.name);
    } else {
        // 현재 신청자(참석) 기반
        const { data: rsvps, error } = await supabaseClient
            .from('rsvps')
            .select('name')
            .eq('status', 'attend');
        if (error) return;
        // 참석(attend) 상태인 사람들만 중복 제거하여 추출
        participants = [...new Set(rsvps.map(r => r.name))];
    }

    if (participants.length === 0) {
        alert("조편성할 인원이 없습니다.");
        return;
    }

    // 무작위 섞기
    const shuffled = shuffleArray(participants);

    // 4명씩 조 나누기
    const groupSize = 4;
    const groups = [];
    for (let i = 0; i < shuffled.length; i += groupSize) {
        groups.push(shuffled.slice(i, i + groupSize));
    }

    renderGroups(groups);
}

function renderGroups(groups) {
    const container = document.getElementById('group-assignment-result');
    if (!container) return;

    container.innerHTML = '';

    let copyText = "[조편성 결과]\n\n";

    groups.forEach((group, index) => {
        const div = document.createElement('div');
        div.style.background = '#fff';
        div.style.padding = '15px';
        div.style.borderRadius = '8px';
        div.style.border = '1px solid #ddd';
        div.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';

        const h5 = document.createElement('h5');
        h5.textContent = `${index + 1}조`;
        h5.style.margin = '0 0 10px 0';
        h5.style.color = '#577b2d';
        h5.style.borderBottom = '1px solid #eee';
        h5.style.paddingBottom = '5px';
        div.appendChild(h5);

        const ul = document.createElement('ul');
        ul.style.listStyle = 'none';
        ul.style.padding = '0';
        ul.style.margin = '0';

        copyText += `${index + 1}조: ${group.join(', ')}\n`;

        group.forEach(name => {
            const li = document.createElement('li');
            li.textContent = name;
            li.style.padding = '3px 0';
            li.style.fontSize = '0.95rem';
            ul.appendChild(li);
        });
        div.appendChild(ul);
        container.appendChild(div);
    });

    // 복사 버튼 기능 연결
    const copyBtn = document.getElementById('copy-groups-btn');
    if (copyBtn) {
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(copyText).then(() => {
                alert("조편성 결과가 클립보드에 복사되었습니다.");
            });
        };
    }
}

/* --- Automatic Award Calculation --- */

async function autoCalculateAwards(groupKey) {
    const { data: rsvps, error } = await supabaseClient
        .from('rsvps')
        .select('*');

    if (error) {
        console.error('Error fetching RSVPs for award calculation:', error);
        return;
    }

    // 해당 날짜의 참석자 중 점수가 입력된 사람만 추출
    const participants = rsvps.filter(d => `${d.month} ${d.date}` === groupKey && d.status === 'attend' && d.roundscore);

    if (participants.length === 0) {
        alert("점수가 입력된 참석자가 없습니다. 먼저 점수를 입력해주세요.");
        return;
    }

    // 분석을 위한 데이터 구조 생성
    const analyzed = participants.map(p => {
        const stats = getMemberStats(p.name);
        const gross = parseFloat(p.roundscore);

        // 핸디캡 결정 (26년 3월 예외 처리)
        let handicap = 0;
        if (groupKey.includes('3월') && groupKey.includes('26')) {
            handicap = parseFloat(stats.h25) || 0;
        } else {
            handicap = parseFloat(stats.h26) || parseFloat(stats.h25) || 0;
        }

        return {
            original: p, // 원본 객체 참조 유지
            gross,
            handicap,
            net: gross - handicap
        };
    });

    // Award calculation logic same as before...
    const netSorted = [...analyzed].sort((a, b) => a.net - b.net);
    const grossSorted = [...analyzed].sort((a, b) => a.gross - b.gross);
    const grossSortedDesc = [...analyzed].sort((a, b) => b.gross - a.gross);

    const medalistObj = grossSorted[0];
    const winnerObj = netSorted[0];
    const runnerUpObj = netSorted.length > 1 ? netSorted[1] : null;
    const lastOneObj = grossSortedDesc[0];
    const luckyOneObj = grossSortedDesc.length > 1 ? grossSortedDesc[1] : null;

    // Build update objects
    const updates = participants.map(p => {
        let award = '';
        const obj = analyzed.find(a => a.original.id === p.id);
        const rank = netSorted.findIndex(a => a.original.id === p.id) + 1;

        if (p.id === medalistObj.original.id) award += '메달리스트';
        if (p.id === winnerObj.original.id) award += (award ? ', 우승' : '우승');
        if (runnerUpObj && p.id === runnerUpObj.original.id) award += (award ? ', 준우승' : '준우승');
        if (luckyOneObj && p.id === luckyOneObj.original.id) award += (award ? ', 행운상' : '행운상');
        if (p.id === lastOneObj.original.id) award += (award ? ', 꼴찌' : '꼴찌');

        return {
            id: p.id,
            roundaward: `[${rank}위]${award ? ' ' + award : ''}`
        };
    });

    // Update Supabase
    for (const update of updates) {
        await supabaseClient.from('rsvps').update({ roundaward: update.roundaward }).eq('id', update.id);
    }

    alert(`${groupKey} 수상 계산이 완료되었습니다.`);
    loadAdminData(); // 화면 갱신
}

/* --- RSVP Availability Helper --- */
function getRSVPAvailability(monthText) {
    const now = new Date();
    const targetMonth = parseInt(monthText);
    if (isNaN(targetMonth)) return { status: 'unknown' };

    // 2026년 라운드 기준 로직
    const targetYear = 2026;

    // 정기 신청 마감일: 전월 말일 23:59
    const regEnd = new Date(targetYear, targetMonth - 1, 0, 23, 59, 59);

    if (now <= regEnd) {
        return { status: 'regular' };
    } else {
        // 전월 말일 이후에는 대기자 신청
        return { status: 'waiting' };
    }
}

/* --- Bulk Register Executives --- */
const GOLF_SCHEDULE = [
    { month: '3월', date: '3.25' },
    { month: '4월', date: '4.22' },
    { month: '5월', date: '5.27' },
    { month: '6월', date: '6.24' },
    { month: '7월', date: '7.22' },
    { month: '9월', date: '9.30' },
    { month: '10월', date: '10.28' },
    { month: '11월', date: '11.25' }
];

async function bulkRegisterExecutives() {
    const { data: members, error: memberError } = await supabaseClient
        .from('members')
        .select('name')
        .eq('type', 'executive');

    if (memberError) return;
    const executives = members;

    if (executives.length === 0) {
        alert("등록된 임원진이 없습니다. 먼저 임원을 등록해주세요.");
        return;
    }

    const { data: existingRSVPs, error: rsvpError } = await supabaseClient.from('rsvps').select('name, month, date');
    if (rsvpError) return;

    let addCount = 0;
    const newRSVPs = [];

    GOLF_SCHEDULE.forEach(round => {
        executives.forEach(exec => {
            const isExists = existingRSVPs.some(r => r.name === exec.name && r.month === round.month && r.date === round.date);

            if (!isExists) {
                newRSVPs.push({
                    name: exec.name,
                    phone: '',
                    status: 'attend',
                    sponsor: '',
                    month: round.month,
                    date: round.date,
                    iswaiting: false
                });
                addCount++;
            }
        });
    });

    if (addCount > 0) {
        const { error: insertError } = await supabaseClient.from('rsvps').insert(newRSVPs);
        if (insertError) {
            alert("일괄 등록 실패: " + insertError.message);
        } else {
            alert(`총 ${addCount}건의 임원진 참석 신청이 완료되었습니다.`);
            loadAdminData();
            renderPublicRSVPs();
        }
    } else {
        alert("이미 모든 임원진이 등록되어 있습니다.");
    }
}

/* --- Data Backup & Restore --- */
function exportData() {
    const data = {
        rsvps: JSON.parse(localStorage.getItem('snu_golf_rsvps') || '[]'),
        members: JSON.parse(localStorage.getItem('snu_golf_members') || '[]')
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const timestamp = new Date().toISOString().split('T')[0];

    a.href = url;
    a.download = `snu_golf_backup_${timestamp}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function importData(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function (e) {
        try {
            const data = JSON.parse(e.target.result);
            if (data.rsvps) localStorage.setItem('snu_golf_rsvps', JSON.stringify(data.rsvps));
            if (data.members) localStorage.setItem('snu_golf_members', JSON.stringify(data.members));

            alert('데이터가 성공적으로 복원되었습니다. 페이지를 새로고침합니다.');
            location.reload();
        } catch (err) {
            alert('데이터 복원 중 오류가 발생했습니다. 올바른 백업 파일인지 확인해주세요.');
        }
    };
    reader.readAsText(file);
}
/* --- Attendance Management --- */
async function deleteRSVP(id) {
    if (!confirm("정말 이 신청 내역을 삭제하시겠습니까? (불참 처리와 동일)")) return;

    const { error } = await supabaseClient
        .from('rsvps')
        .delete()
        .eq('id', id);

    if (error) {
        console.error('Error deleting RSVP:', error);
        alert('삭제 실패');
        return;
    }

    loadAdminData();
    renderPublicRSVPs();
}
