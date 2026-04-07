// SNU Golf Application v2.5
// Supabase Configuration
const SUPABASE_URL = 'https://qfzmwlyqezmkkxtpscik.supabase.co';
const SUPABASE_KEY = 'sb_publishable_mYejtROOg-2JN7z6_RlWdg_PXYSYgFi'; // Anon Key
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// Rendering Guards to prevent duplication
let isRenderingAdminMembers = false;
let isRenderingAdminData = false;

// Force cleanup of legacy local login state to ensure sessionStorage takes over
if (localStorage.getItem('snu_golf_logged_in')) {
    const wasLoggedIn = localStorage.getItem('snu_golf_logged_in');
    if (wasLoggedIn === 'true') {
        sessionStorage.setItem('snu_golf_logged_in', 'true');
    }
    localStorage.removeItem('snu_golf_logged_in');
}

// Global Score Data Storage (Original 2D Array format for compatibility)
let G_SCORES_RAW = [];

/**
 * Supabase에서 스코어 데이터를 불러와 기존 CSV 호환 형식(2D Array)으로 변환합니다.
 */
async function loadScoresFromSupabase() {
    try {
        const [{ data: scores, error }, { data: members, error: memberError }] = await Promise.all([
            supabaseClient.from('scores').select('*').order('round_count', { ascending: true }),
            supabaseClient.from('members').select('name')
        ]);

        if (error || memberError) throw error || memberError;

        // 1. 헤더 생성 (이름순 정렬)
        const sortedMemberNames = members.map(m => m.name.trim()).sort((a, b) => a.localeCompare(b, 'ko'));
        const header = ['', '', 'Name', ...sortedMemberNames];

        // 2. 데이터 행 변환 및 핸디캡 행 분리
        let handicapRow = ['count', 'Date', 'CC/HD', ...sortedMemberNames.map(() => '0')];
        const dataRows = [];

        scores.forEach(s => {
            const row = [s.round_count.toString(), s.date || '', s.venue || ''];
            const scoresMap = s.scores_data || {};
            sortedMemberNames.forEach(name => {
                row.push(scoresMap[name] || '');
            });

            if (s.round_count === 0) {
                handicapRow = row;
            } else {
                dataRows.push(row);
            }
        });

        G_SCORES_RAW = [header, handicapRow, ...dataRows];
        console.log("Supabase Scores Loaded:", G_SCORES_RAW.length, "rows (including Handicap)");
        return G_SCORES_RAW;
    } catch (err) {
        console.error("Failed to load scores from Supabase:", err);
        return [];
    }
}

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
    const scoreContainer = document.getElementById('score-table-container');
    if (scoreContainer) {
        loadScoresFromSupabase().then(data => {
            renderTable(data, scoreContainer, false);
        });
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

    // PWA Install Prompt
    initPWAInstall();
});

let deferredPrompt;
function initPWAInstall() {
    const installBtn = document.getElementById('pwa-install-btn');
    if (!installBtn) return;

    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent Chrome 67 and earlier from automatically showing the prompt
        e.preventDefault();
        // Stash the event so it can be triggered later.
        deferredPrompt = e;
        // Update UI notify the user they can install the PWA
        installBtn.classList.remove('hidden');
    });

    installBtn.addEventListener('click', (e) => {
        // hide our user interface that shows our A2HS button
        installBtn.classList.add('hidden');
        // Show the prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        deferredPrompt.userChoice.then((choiceResult) => {
            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the A2HS prompt');
            } else {
                console.log('User dismissed the A2HS prompt');
            }
            deferredPrompt = null;
        });
    });

    window.addEventListener('appinstalled', (evt) => {
        console.log('a2hs', 'installed');
        installBtn.classList.add('hidden');
    });
}

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

console.log("SNU AI GOLF Script Loaded v4.0");
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

            modalSubtitle.textContent = `일시: ${month} ${date} `;
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
        const rawName = document.getElementById('name').value;
        const cleanName = (rawName || '').trim();

        const formData = {
            name: cleanName,
            phone: document.getElementById('phone').value,
            status: document.querySelector('input[name="status"]:checked').value,
            sponsor: document.getElementById('sponsor').value,
            month: rsvpMonthInput.value,
            date: rsvpDateInput.value,
            iswaiting: (availability.status === 'waiting')
        };

        try {
            // 중복 신청 확인 (공백 제거 후 검색)
            const { data: existingRSVP, error: checkError } = await supabaseClient
                .from('rsvps')
                .select('id')
                .eq('month', formData.month)
                .eq('date', formData.date)
                .eq('name', cleanName)
                .maybeSingle();

            if (checkError) throw checkError;

            if (existingRSVP) {
                alert(`[${cleanName}] 님은 이미 해당 일정(${formData.month} ${formData.date})에 신청하셨습니다.`);
                return;
            }

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

async function loadGroupSessions() {
    const select = document.getElementById('group-session-select');
    if (!select) return;

    try {
        const { data, error } = await supabaseClient
            .from('rsvps')
            .select('month, date')
            .not('month', 'is', null);

        if (error) throw error;

        // 중복 제거 및 정렬
        const sessionMap = new Map();
        data.forEach(item => {
            const key = `${item.month.trim()}|${item.date.trim()}`;
            sessionMap.set(key, `${item.month.trim()} ${item.date.trim()}`);
        });

        // 3월 -> 11월 순서로 대략 정렬 (문자열 비교 방식)
        const sortedKeys = Array.from(sessionMap.keys()).sort((a, b) => {
            const m1 = parseInt(a.match(/\d+/)) || 0;
            const m2 = parseInt(b.match(/\d+/)) || 0;
            return m1 - m2;
        });

        select.innerHTML = sortedKeys.map(key =>
            `<option value="${key}">${sessionMap.get(key)}</option>`
        ).join('');

        if (sortedKeys.length > 0) {
            // 초기 로드: 첫 번째 세션의 저장된 조편성 불러오기
            loadSavedGroups(sortedKeys[0]);
        }

        // 선택 변경 시 자동 불러오기
        select.onchange = (e) => {
            loadSavedGroups(e.target.value);
        };

    } catch (err) {
        console.error('Error loading group sessions:', err);
        select.innerHTML = '<option value="">로딩 실패</option>';
    }
}

async function addManualRSVP() {
    const monthRaw = document.getElementById('manual-rsvp-month').value.trim();
    const dateRaw = document.getElementById('manual-rsvp-date').value.trim();
    const nameInput = document.getElementById('manual-rsvp-name').value.trim();
    const status = document.getElementById('manual-rsvp-status').value;

    if (!monthRaw || !dateRaw || !nameInput) {
        alert('월, 일, 이름을 모두 입력해주세요.');
        return;
    }

    // 포맷 보정 (5, 27 -> 5월, 5.27 로 자동 변환)
    const month = monthRaw.includes('월') ? monthRaw : `${monthRaw}월`;
    const dateNum = dateRaw.replace(/[^0-9]/g, ''); // 숫자만 추출
    const date = dateRaw.includes('.') ? dateRaw : `${month.replace('월', '')}.${dateNum}`;

    const names = nameInput.split(',').map(n => n.trim()).filter(n => n);

    try {
        const inserts = names.map(n => ({
            month,
            date,
            name: n,
            status,
            submittedat: new Date().toISOString()
        }));

        const { error } = await supabaseClient
            .from('rsvps')
            .insert(inserts);

        if (error) throw error;

        alert(`[${month} ${date}] ${names.join(', ')}님이 추가되었습니다.`);

        // 필드 초기화 (이름만 초기화해서 연속 입력 편하게)
        document.getElementById('manual-rsvp-name').value = '';

        // 목록 새로고침
        if (typeof loadAdminData === 'function') loadAdminData();
    } catch (err) {
        console.error('Error adding manual RSVP:', err);
        alert('추가 실패: ' + err.message);
    }
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

            // 조편성 탭 선택 시 데이터 로딩
            if (tabId === 'tab-groups') {
                loadGroupSessions();
            }
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
        adminRefreshBtn.onclick = () => {
            loadAdminData();
            loadAdminMembers();
        };
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

    const bulkExecBtn = document.getElementById('bulk-exec-btn');
    if (bulkExecBtn) bulkExecBtn.onclick = bulkRegisterExecutives;

    const exportBtn = document.getElementById('admin-export-btn');
    if (exportBtn) exportBtn.onclick = exportData;

    const importTrigger = document.getElementById('admin-import-trigger');
    const importFile = document.getElementById('import-file');
    if (importTrigger && importFile) {
        importTrigger.onclick = () => importFile.click();
        importFile.onchange = (e) => importData(e);
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
        const password = prompt("관리자 비밀번호를 입력하세요")?.trim().toLowerCase();
        if (!password) return;

        const readOnlyHash = '07e47f77d22e2fc388c2d12f73b8b8b7e9928630d39a4964a9daabbc27a060f4';
        const superHash = '216af8f8d1513e343fd4533a21148ad1355d6f01e42a8d91de3c598690d0a1e2';

        try {
            const inputHash = await sha256(password);
            if (inputHash === superHash) {
                sessionStorage.setItem('snu_golf_admin_logged_in', 'true');
                sessionStorage.setItem('userRole', 'super');
                loadAdminData();
                loadAdminMembers();
                if (typeof applyRoleRestrictions === 'function') applyRoleRestrictions();
                adminModal.style.display = 'block';
                alert("최고 관리자 권한으로 로그인되었습니다.");
            } else if (inputHash === readOnlyHash) {
                sessionStorage.setItem('snu_golf_admin_logged_in', 'true');
                sessionStorage.setItem('userRole', 'readonly');
                loadAdminData();
                loadAdminMembers();
                if (typeof applyRoleRestrictions === 'function') applyRoleRestrictions();
                adminModal.style.display = 'block';
                alert("임원진(읽기 전용) 권한으로 로그인되었습니다.");
            } else {
                alert(`비밀번호가 틀렸습니다. (입력된 길이: ${password.length}자)`);
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
    const { data: members, error } = await supabaseClient
        .from('members')
        .select('*');

    if (error) {
        console.error('Error loading members:', error);
        return;
    }

    const execList = document.getElementById('member-list-executive');

    if (execList) execList.innerHTML = '';

    // Filter for executives for the public view (Removed 'special' at user request)
    const executives = members.filter(m => m.type === 'executive');

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
    const { error } = await supabaseClient
        .from('members')
        .insert([{ name, type, role }]);

    if (error) {
        console.error('Error adding member:', error);
        alert('회원 추가 실패: ' + error.message);
        return;
    }

    loadMembers(); // Refresh both views
    if (typeof window.updateMemberSummary === 'function') {
        window.updateMemberSummary();
    }
}

async function deleteMember(name) {
    if (!confirm(`${name}님을 정말 삭제하시겠습니까 ? `)) return;

    const { error } = await supabaseClient
        .from('members')
        .delete()
        .eq('name', name);

    if (error) {
        console.error('Error deleting member:', error);
        alert('삭제 실패');
        return;
    }

    loadMembers();
    if (typeof window.updateMemberSummary === 'function') {
        window.updateMemberSummary();
    }
}

async function updateMemberType(name, newType) {
    let role = '';
    if (newType === 'executive' || newType === 'special') {
        role = prompt(`${name}님의 직책 / 설명을 입력해주세요: `, '');
        if (role === null) return; // User cancelled prompt
    }

    const { error } = await supabaseClient
        .from('members')
        .update({ type: newType, role: role })
        .eq('name', name);

    if (error) {
        console.error('Error updating member type:', error);
        alert('업데이트 실패');
        return;
    }

    loadMembers();
    if (typeof window.updateMemberSummary === 'function') {
        window.updateMemberSummary();
    }
}

async function loadAdminMembers(prefetchedMembers = null) {
    if (isRenderingAdminMembers) return;
    isRenderingAdminMembers = true;

    try {
        const tbody = document.querySelector('#admin-member-table tbody');
        if (!tbody) return;

        // Update summary bar separately
        if (typeof window.updateMemberSummary === 'function') {
            window.updateMemberSummary();
        }

        let members = prefetchedMembers;
        if (!members) {
            const { data, error } = await supabaseClient.from('members').select('*');
            if (error) throw error;
            members = data;
        }

        // Ensure scores are loaded for handicap calculation
        if (G_SCORES_RAW.length === 0) {
            await loadScoresFromSupabase();
        }

        // Clear only after data is fetched to prevent flicker/race overlap
        tbody.innerHTML = '';

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
            const stats = getMemberStats(item.name);

            tr.innerHTML = `
            <td style="padding: 10px; border: 1px solid #ddd;">
                <div style="font-weight: bold;">${item.name}</div>
                <div style="font-size: 0.75rem; color: #666; margin-top: 5px; line-height: 1.4;">
                    26년 핸디: <span style="color: #2980b9; font-weight: bold;">${stats.h26}</span><br>
                    총 핸디: <span style="color: #577b2d; font-weight: bold;">${stats.h25}</span>
                </div>
            </td>
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
                <button class="cta-button edit-control" onclick="deleteMember('${item.name}')" style="padding: 2px 8px; font-size: 0.8rem; background-color: #e74c3c; min-width: auto;">삭제</button>
            </td>
`;
            tbody.appendChild(tr);
        });
    } catch (err) {
        console.error('Error loading admin members:', err);
    } finally {
        isRenderingAdminMembers = false;
    }
}

async function updateMemberAward(name, value) {
    const { error } = await supabaseClient
        .from('members')
        .update({ awardhistory: value })
        .eq('name', name);

    if (error) console.error('Error updating award history:', error);
}

async function updateRSVPField(id, field, value) {
    try {
        const { error } = await supabaseClient
            .from('rsvps')
            .update({ [field]: value })
            .eq('id', id);

        if (error) throw error;
        console.log(`Field ${field} updated for RSVP ${id}`);
        showToast('성공적으로 저장되었습니다.');

        // 스폰서 정보가 수정된 경우 명예의 전당 즉시 갱신을 위해 데이터 재로드 유도
        if (field === 'sponsor') {
            renderSponsorHall();
        }
    } catch (err) {
        console.error('Error updating RSVP field:', err);
    }
}

function getMemberStats(name) {
    const csvData = G_SCORES_RAW;
    if (!csvData || csvData.length < 2) return { h25: '-', last: '-', h26: '-' };
    const names = csvData[0];
    const nameIndex = names.findIndex(n => n.trim() === name.trim());

    if (nameIndex === -1) return { h25: '-', last: '-', h26: '-' };

    // 25y Handicap (Row index 1)
    const h25 = csvData[1][nameIndex] || '-';

    // Last Month Score (Latest available non-empty score)
    let last = '-';
    for (let i = csvData.length - 1; i >= 2; i--) {
        const val = csvData[i][nameIndex];
        if (val && val.trim() !== '' && !['0', '0.0', '-'].includes(val.trim())) {
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
    if (isRenderingAdminData) return;
    isRenderingAdminData = true;

    if (G_SCORES_RAW.length === 0) {
        await loadScoresFromSupabase();
    }

    // 1. RSVP Table Update
    const rsvpTbody = document.querySelector('#admin-table tbody');
    if (rsvpTbody) {
        rsvpTbody.innerHTML = '<tr><td colspan="12" style="text-align:center; padding: 20px;">불러오는 중...</td></tr>';

        // 1. RSVP 및 회원 데이터 함께 가져오기
        const [{ data: rsvps, error: rsvpError }, { data: members, error: memberError }] = await Promise.all([
            supabaseClient.from('rsvps').select('*'),
            supabaseClient.from('members').select('name, type')
        ]);

        if (rsvpError || memberError) {
            console.error('Error loading data:', rsvpError || memberError);
            rsvpTbody.innerHTML = '<tr><td colspan="12" style="text-align:center; padding: 20px; color: red;">실패: ' + (rsvpError?.message || memberError?.message) + '</td></tr>';
            return;
        }

        const memberTypeMap = new Map(members.map(m => [(m.name || '').trim(), m.type]));

        // 우선순위 점수 (낮을수록 높음)
        const getPriorityScore = (name) => {
            const type = memberTypeMap.get((name || '').trim());
            if (type === 'executive' || type === 'jeong' || type === 'special') return 0;
            if (type === 'ilban') return 1;
            return 2; // 준회원 및 기타
        };

        rsvpTbody.innerHTML = '';
        if (rsvps.length === 0) {
            rsvpTbody.innerHTML = '<tr><td colspan="12" style="text-align:center; padding: 20px;">신청 내역이 없습니다.</td></tr>';
        } else {
            // Group by Month/Date
            const groupedData = rsvps.reduce((acc, item) => {
                const key = `${item.month.trim()} ${item.date.trim()}`;
                if (!acc[key]) acc[key] = [];
                acc[key].push(item);
                return acc;
            }, {});

            const sortedKeys = Object.keys(groupedData).filter(key => {
                const monthMatch = key.match(/(\d+)월/);
                const dateMatch = key.match(/\.(\d+)/);
                if (monthMatch && dateMatch) {
                    const m = parseInt(monthMatch[1]) - 1; // 0-indexed
                    const d = parseInt(dateMatch[1]);
                    const eventDate = new Date(2026, m, d);

                    const today = new Date();
                    today.setHours(0, 0, 0, 0);

                    return eventDate >= today;
                }
                return false;
            }).sort((a, b) => {
                const parseK = (k) => {
                    const mm = k.match(/(\d+)월/);
                    const dd = k.match(/\.(\d+)/);
                    return new Date(2026, parseInt(mm[1]) - 1, parseInt(dd[1]));
                };
                return parseK(a) - parseK(b);
            });

            sortedKeys.forEach(key => {
                const items = groupedData[key];
                const headerRow = document.createElement('tr');
                headerRow.style.backgroundColor = "#e8f5e9";
                const attendCount = items.filter(i => i.status === 'attend').length;

                // 5월만 10팀(40명), 3월~11월 정규 라운드는 5팀(20명) 예약으로 정원 고정
                let totalDisplay = items.length;
                const monthMatch = key.match(/^(\d+)월/);
                if (monthMatch) {
                    const monthNum = parseInt(monthMatch[1]);
                    if (monthNum === 5) {
                        totalDisplay = 40;
                    } else if (monthNum >= 3 && monthNum <= 11) {
                        totalDisplay = 20;
                    }
                }

                headerRow.innerHTML = `
                    <td colspan="12" style="padding: 10px; border: 1px solid #ddd; font-weight: bold; color: #1e3a2b;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span>${key} (총 ${totalDisplay}명 / 참석 ${attendCount}명)</span>
                            <div style="display: flex; gap: 5px;">
                                <button onclick="autoCalculateAwards('${key}')" class="edit-control" style="background: #c5a059; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">자동 수상 계산</button>
                                <button onclick="syncScoresToRecords('${key}')" class="edit-control" style="background: #2980b9; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">스코어 등록</button>
                            </div>
                        </div>
                    </td>
                `;
                rsvpTbody.appendChild(headerRow);

                // 지능형 우선순위 정렬
                // 1. 참석 여부 (참석 > 불참)
                // 2. 우선순위 등급 (임원/정 > 일반/특 > 준)
                // 3. 신청 일시 (선착순)
                items.sort((a, b) => {
                    if (a.status !== b.status) return a.status === 'attend' ? -1 : 1;

                    const scoreA = getPriorityScore(a.name);
                    const scoreB = getPriorityScore(b.name);
                    if (scoreA !== scoreB) return scoreA - scoreB;

                    return new Date(a.submittedat) - new Date(b.submittedat);
                });

                items.forEach((item, index) => {
                    const tr = document.createElement('tr');
                    const stats = getMemberStats(item.name);
                    const memberType = memberTypeMap.get((item.name || '').trim());
                    const typeLabels = {
                        'executive_plus': '임원',
                        'executive': '임원',
                        'jeong': '정회원',
                        'jun': '준회원',
                        'special': '특별회원',
                        'ilban': '일반회원'
                    };
                    const typeLabel = typeLabels[memberType] || '일반';

                    // 대기 여부 자동 판독 (참석자 중 20위 초과 시)
                    let isAutoWaiting = false;
                    if (item.status === 'attend' && (index + 1) > totalDisplay) {
                        isAutoWaiting = true;
                    }

                    tr.innerHTML = `
                        <td style="padding: 10px; border: 1px solid #ddd;">${item.month} ${item.date}</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">
                            ${item.name}
                            ${(item.iswaiting || isAutoWaiting) ? ' <span style="color:#d35400; font-size:0.8rem; font-weight:bold;">(대기)</span>' : ''}
                            <div style="font-size: 0.7rem; color: #888;">#${index + 1} ${typeLabel}</div>
                        </td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${item.phone || '-'}</td>
                        <td style="padding: 10px; border: 1px solid #ddd; color: ${item.status === 'attend' ? 'green' : 'red'}; font-weight: bold;">
                            ${item.status === 'attend' ? ((item.iswaiting || isAutoWaiting) ? '참석대기' : '참석확정') : '불참'}
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
                            <button onclick="deleteRSVP(${item.id})" class="edit-control" style="background: #e74c3c; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">삭제</button>
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
        if (G_SCORES_RAW.length > 0) {
            renderTable(G_SCORES_RAW, scoreContainer, true);
        } else {
            loadScoresFromSupabase().then(data => {
                renderTable(data, scoreContainer, true);
            });
        }
    }
    isRenderingAdminData = false;
}

async function renderPublicRSVPs() {
    const container = document.getElementById('public-rsvp-container');
    if (!container) return;

    if (G_SCORES_RAW.length === 0) {
        await loadScoresFromSupabase();
    }

    // 1. RSVP 및 회원 데이터 함께 가져오기
    const [{ data, error }, { data: members, error: memberError }] = await Promise.all([
        supabaseClient.from('rsvps').select('*'),
        supabaseClient.from('members').select('name, type')
    ]);

    if (error || memberError) {
        console.error('Error rendering public RSVPs:', error || memberError);
        return;
    }

    if (data.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding: 40px; color:#888;">아직 신청 내역이 없습니다.</div>';
        return;
    }

    const memberTypeMap = new Map(members.map(m => [(m.name || '').trim(), m.type]));
    const getPriorityScore = (name) => {
        const type = memberTypeMap.get((name || '').trim());
        if (type === 'executive' || type === 'jeong' || type === 'special') return 0;
        if (type === 'ilban') return 1;
        return 2;
    };

    const groupedData = data.reduce((acc, item) => {
        const key = `${item.month.trim()} ${item.date.trim()}`;
        if (!acc[key]) acc[key] = [];
        acc[key].push(item);
        return acc;
    }, {});

    const now = new Date();
    const currentMonth = now.getMonth() + 1; // 1-12

    const sortedKeys = Object.keys(groupedData).filter(key => {
        const monthMatch = key.match(/(\d+)월/);
        const dateMatch = key.match(/\.(\d+)/);
        if (monthMatch && dateMatch) {
            const m = parseInt(monthMatch[1]) - 1; // 0-indexed
            const dStr = dateMatch[1];
            const d = parseInt(dStr);
            const eventDate = new Date(2026, m, d);

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            return eventDate >= today;
        }
        return false;
    }).sort((a, b) => {
        const parseK = (k) => {
            const mm = k.match(/(\d+)월/);
            const dd = k.match(/\.(\d+)/);
            return new Date(2026, parseInt(mm[1]) - 1, parseInt(dd[1]));
        };
        return parseK(a) - parseK(b);
    }).slice(0, 2); // Only take the nearest 2

    container.innerHTML = '';

    sortedKeys.forEach(key => {
        const items = groupedData[key];

        // 정원 계산 (5월 10팀-40명, 3월~11월 5팀-20명 고정)
        let totalCapacity = 20;
        const monthMatch = key.match(/^(\d+)월/);
        if (monthMatch) {
            const mNum = parseInt(monthMatch[1]);
            if (mNum === 5) {
                totalCapacity = 40;
            } else if (mNum < 3 || mNum > 11) {
                totalCapacity = 999; // 2월 등 예측 불가능한 일정 예외
            }
        }

        // 지능형 우선순위 정렬
        items.sort((a, b) => {
            if (a.status !== b.status) return a.status === 'attend' ? -1 : 1;
            const scoreA = getPriorityScore(a.name);
            const scoreB = getPriorityScore(b.name);
            if (scoreA !== scoreB) return scoreA - scoreB;
            return new Date(a.submittedat) - new Date(b.submittedat);
        });

        const monthDiv = document.createElement('div');
        monthDiv.className = 'public-rsvp-month';
        monthDiv.style.marginBottom = '30px';

        const h3 = document.createElement('h3');
        h3.style.color = '#1e3a2b';
        h3.style.borderBottom = '2px solid #577b2d';
        h3.style.paddingBottom = '5px';
        h3.style.marginBottom = '15px';
        const attendCount = items.filter(i => i.status === 'attend').length;
        h3.textContent = `${key} (총 ${totalCapacity === 999 ? items.length : totalCapacity} 명 / 참석 ${attendCount}명)`;
        monthDiv.appendChild(h3);

        const list = document.createElement('div');
        list.style.display = 'grid';
        list.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
        list.style.gap = '15px';

        items.forEach((item, idx) => {
            const stats = getMemberStats(item.name);
            const card = document.createElement('div');
            card.className = 'public-rsvp-card';
            card.style.background = '#fff';
            card.style.padding = '15px';
            card.style.borderRadius = '10px';
            card.style.boxShadow = '0 2px 8px rgba(0,0,0,0.05)';
            card.style.border = '1px solid #eee';

            let isAutoWaiting = (item.status === 'attend' && (idx + 1) > totalCapacity);

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <span style="font-weight: bold; font-size: 1.1rem; color: #333;">
                        ${item.name}
                        ${(item.iswaiting || isAutoWaiting) ? ' <span style="font-size: 0.8rem; color: #d35400;">(대기)</span>' : ''}
                    </span>
                    <span style="padding: 2px 8px; border-radius: 20px; font-size: 0.8rem; font-weight: bold; background: ${item.status === 'attend' ? '#e8f5e9' : '#ffebee'}; color: ${item.status === 'attend' ? '#2e7d32' : '#c62828'};">
                        ${item.status === 'attend' ? ((item.iswaiting || isAutoWaiting) ? '참석대기' : '참석확정') : '불참'}
                    </span>
                </div>
    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; border-top: 1px solid #f5f5f5; pt: 10px; margin-top: 10px; padding-top: 10px;">
        <div style="text-align: center;">
            <div style="font-size: 0.7rem; color: #888;">25년 핸디</div>
            <div style="font-weight: bold; color: #577b2d;">${stats.h25}</div>
        </div>
        <div style="text-align: center; border-left: 1px solid #f5f5f5; border-right: 1px solid #f5f5f5;">
            <div style="font-size: 0.7rem; color: #888;">이전 스코어</div>
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

    // 명예의 전당 렌더링 추가 (가져온 전체 데이터를 재사용하여 속도 최적화)
    renderSponsorHall(data);
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
    let bodyRowsData = data.slice(2);

    // Sort body rows by Date (Index 1) in descending order (Latest First)
    bodyRowsData.sort((a, b) => {
        const dateA = String(a[1] || '').trim();
        const dateB = String(b[1] || '').trim();
        return dateB.localeCompare(dateA);
    });

    // Calculate Handicap Rows (Total, 2025, 2026)
    const totalHDRow = ['Total', 'Handicap', 'Avg'];
    const h25HDRow = ['2025', 'Handicap', 'CC/HD'];
    const h26HDRow = ['2026', 'Handicap', 'Avg'];

    const originalH25 = data[1];

    for (let j = 3; j < headerRowData.length; j++) {
        let tSum = 0, tCount = 0;
        let s26Sum = 0, s26Count = 0;

        bodyRowsData.forEach(row => {
            const val = parseFloat(row[j]);
            if (!isNaN(val) && val > 0) {
                tSum += val;
                tCount++;
                if (row[1] && row[1].trim().startsWith('26')) {
                    s26Sum += val;
                    s26Count++;
                }
            }
        });
        totalHDRow.push(tCount > 0 ? (tSum / tCount).toFixed(1) : '-');
        h26HDRow.push(s26Count > 0 ? (s26Sum / s26Count).toFixed(1) : '-');
        h25HDRow.push(originalH25[j] || '-');
    }

    const handicapRows = [totalHDRow, h25HDRow, h26HDRow];

    // 메인 페이지(Public)인 경우 '25년 핸디' 행만 남기고 나머지 세부 스코어 행 삭제
    if (!isAdmin) {
        bodyRowsData = [];
    }

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.className = 'score-header-row';

    headerRowData.forEach((cell, index) => {
        const th = document.createElement('th');
        th.textContent = cell.trim();
        if (index < 3) th.classList.add('sticky-col');
        headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');

    handicapRows.forEach((row, rowIndex) => {
        const hRow = document.createElement('tr');
        hRow.className = 'score-sub-header-row';
        if (rowIndex === 0) hRow.classList.add('total-hd-row');
        if (rowIndex === 2) hRow.classList.add('y26-hd-row');

        row.forEach((cell, index) => {
            const td = document.createElement('td');
            td.textContent = cell.trim();
            if (index < 3) td.classList.add('sticky-col');
            hRow.appendChild(td);
        });
        tbody.appendChild(hRow);
    });

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
                }
                tr.appendChild(td);
            });
            tbody.appendChild(tr);
        });
    }

    table.appendChild(tbody);
    container.innerHTML = '';
    container.appendChild(table);

    // Style refinements can now be handled via CSS Classes in style.css
    if (isAdmin) {
        table.classList.add('admin-score-table-styled');
    }
}

function downloadScorecard() {
    try {
        const csvContent = G_SCORES_RAW.map(row => row.join(',')).join('\n');
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

async function syncScoresToRecords(sessionKey) {
    if (!confirm(`'${sessionKey}'의 스코어를 상세 기록 페이지로 복사하시겠습니까 ? `)) return;

    try {
        // 1. Fetch RSVPs for this session
        const [month, datePart] = sessionKey.split(' ');
        const { data: rsvps, error } = await supabaseClient
            .from('rsvps')
            .select('*')
            .eq('month', month)
            .eq('date', datePart);

        if (error) throw error;
        if (!rsvps || rsvps.length === 0) {
            alert("해당 일정의 신청 데이터가 없습니다.");
            return;
        }

        // 2. Parse Date into YYMMDD format
        // Example: '2월 2.7' -> Year is current year (2026), Month 02, Day 07 -> 260207
        let yymmdd = '';
        const mMatch = month.match(/(\d+)/);
        const dMatch = datePart.match(/(\d+\.?\d*)/);

        if (mMatch && dMatch) {
            const m = mMatch[1].padStart(2, '0');
            const dStr = dMatch[1].replace('.', ''); // 2.7 -> 27, but user wants 07 usually
            // Correct day logic: if datePart is '2.7', it's Feb 7th
            const dArr = datePart.split('.');
            const d = (dArr.length > 1 ? dArr[1] : dArr[0]).padStart(2, '0');
            yymmdd = `26${m}${d} `;
        } else {
            yymmdd = prompt("기록에 사용할 날짜(YYMMDD)를 입력해주세요:", "260207");
            if (!yymmdd) return;
        }

        // 3. Prepare Score Map
        const scoreMap = new Map();
        rsvps.forEach(r => {
            if (r.roundscore && r.roundscore.trim() !== '') {
                scoreMap.set(r.name.trim(), r.roundscore.trim());
            }
        });

        // 4. Get Member Column Order from G_SCORES_RAW
        const headerData = G_SCORES_RAW[0];
        const memberNames = headerData.slice(3);

        // 5. Build New Record Row
        // [count, date, venue, member1_score, member2_score, ...]
        const addedRounds = JSON.parse(localStorage.getItem('snu_golf_added_rounds') || '[]');
        const nextCount = (G_SCORES_RAW.length - 2) + addedRounds.length + 1;

        const defaultVenue = yymmdd.startsWith('2602') ? "소노펠리체CC in 하롱베이" : "신원CC";
        const newRow = [nextCount.toString(), yymmdd, defaultVenue];
        memberNames.forEach(name => {
            newRow.push(scoreMap.get(name.trim()) || '');
        });

        // 6. Save to localStorage
        addedRounds.push(newRow);
        localStorage.setItem('snu_golf_added_rounds', JSON.stringify(addedRounds));

        alert(`'${yymmdd}' 스코어 기록이 성공적으로 동기화되었습니다.\n[상세 스코어 기록 관리] 페이지에서 확인하세요.`);

        // Refresh table if on admin page
        if (typeof loadAdminData === 'function') loadAdminData();

    } catch (err) {
        console.error('Score sync failed:', err);
        alert('동기화 실패: ' + err.message);
    }
}

// Auto-fix for Feb Venue names in localStorage (one-time cleanup)
(function fixFebVenues() {
    try {
        const addedRoundsRaw = localStorage.getItem('snu_golf_added_rounds');
        if (!addedRoundsRaw) return;

        const addedRounds = JSON.parse(addedRoundsRaw);
        let modified = false;
        const fixedRounds = addedRounds.map(round => {
            // Index 1 is Date (YYMMDD), Index 2 is Venue
            if (round[1] && round[1].startsWith('2602') && round[2] === "신원CC") {
                round[2] = "소노펠리체CC in 하롱베이";
                modified = true;
            }
            return round;
        });

        if (modified) {
            localStorage.setItem('snu_golf_added_rounds', JSON.stringify(fixedRounds));
            console.log('February venues auto-fixed in localStorage');
        }
    } catch (e) { console.error('Venue fix failed:', e); }
})();

async function assignGroups(mode) {
    const sessionVal = document.getElementById('group-session-select').value;
    if (!sessionVal) {
        alert("조편성할 일시를 먼저 선택해주세요.");
        return;
    }

    if (mode === 'sample') {
        const { data: members, error } = await supabaseClient.from('members').select('name');
        if (error) return;
        const participants = members.map(m => m.name);
        if (participants.length === 0) return;
        const shuffled = shuffleArray(participants);
        const groups = splitIntoOptimalGroups(shuffled);
        renderGroups(groups);
        return;
    }

    // mode === 'rsvp' (현재 신청자 기반 조편성)
    try {
        const [month, date] = sessionVal.split('|');
        const { data: rsvps, error: rsvpError } = await supabaseClient
            .from('rsvps')
            .select('name')
            .eq('month', month.trim())
            .eq('date', date.trim())
            .eq('status', 'attend');
        if (rsvpError) throw rsvpError;

        const attendList = [...new Set(rsvps.map(r => r.name.trim()))];
        if (attendList.length === 0) {
            alert("조편성할 인원(참석 확정자)이 없습니다.");
            return;
        }

        // --- [Logic] DB에 저장된 조편성을 기준으로 유지 ---
        let baseGroups = [];
        const { data: saved, error: savedError } = await supabaseClient
            .from('group_assignments')
            .select('groups_data')
            .eq('session_key', sessionVal)
            .maybeSingle();

        if (savedError) console.error("기존 조편성 확인 오류:", savedError);
        if (saved && saved.groups_data && saved.groups_data.length > 0) {
            baseGroups = saved.groups_data;
            console.log("Using saved database state as grouping base.");
        }

        if (baseGroups.length > 0) {
            // [INCREMENTAL Update] 기존 조편성 유지 로직
            
            // 1. 기존 조에서 현재 불참하는 인원 제거
            let updatedGroups = baseGroups.map(group => 
                group.filter(name => attendList.includes(name.trim()))
            ).filter(group => group.length > 0);

            // 2. 현재 조에 편성되지 않은 새로운 인원 찾기
            const assignedNames = updatedGroups.flat();
            const newParticipants = attendList.filter(name => !assignedNames.includes(name));

            if (newParticipants.length > 0) {
                // 3. 새 인원을 기존 조 중 빈자리(4인 미만)가 있는 곳에 먼저 채우기
                newParticipants.forEach(person => {
                    let targetGroup = updatedGroups.find(g => g.length < 4);
                    if (targetGroup) {
                        targetGroup.push(person);
                    } else {
                        // 모든 조가 4명이면 새로운 조 생성
                        updatedGroups.push([person]);
                    }
                });
                alert(`기존 조편성을 유지하며 새로운 신청자(${newParticipants.length}명)를 추가하였습니다.`);
            } else {
                alert("조편성 결과가 유지되었으며, 변경된 사항이 없습니다.");
            }
            
            renderGroups(updatedGroups);
        } else {
            // [Initial Setup] 저장된 데이터가 전혀 없으면 새로 고침
            const shuffled = shuffleArray(attendList);
            const groups = splitIntoOptimalGroups(shuffled);
            renderGroups(groups);
        }
    } catch (err) {
        console.error("조편성 실패:", err);
        alert("조편성 중 오류가 발생했습니다.");
    }
}

// 조편성 데이터 저장
async function saveGroups() {
    const sessionVal = document.getElementById('group-session-select').value;
    if (!sessionVal) {
        alert("저장할 일시를 선택해주세요.");
        return;
    }

    const groups = [];
    document.querySelectorAll('#group-assignment-result > div').forEach((groupDiv, index) => {
        if (!groupDiv.id || !groupDiv.id.startsWith('group-card-')) return;
        const groupMembers = [];
        groupDiv.querySelectorAll('ul li .member-name').forEach(nameSpan => {
            groupMembers.push(nameSpan.textContent.trim());
        });
        if (groupMembers.length > 0) {
            groups.push(groupMembers);
        }
    });

    if (groups.length === 0) {
        alert("저장할 조편성 데이터가 없습니다.");
        return;
    }

    try {
        const { error } = await supabaseClient
            .from('group_assignments')
            .upsert({
                session_key: sessionVal,
                groups_data: groups,
                updated_at: new Date().toISOString()
            });

        if (error) throw error;
        alert("조편성이 성공적으로 저장되었습니다.");
    } catch (err) {
        console.error("저장 실패:", err);
        alert("저장에 실패했습니다: " + err.message);
    }
}

// 저장된 조편성 불러오기
async function loadSavedGroups(sessionKey) {
    if (!sessionKey) return;
    try {
        const { data, error } = await supabaseClient
            .from('group_assignments')
            .select('groups_data')
            .eq('session_key', sessionKey)
            .maybeSingle();

        if (error) throw error;
        if (data && data.groups_data) {
            renderGroups(data.groups_data);
        } else {
            // 저장된 데이터가 없으면 비움
            const container = document.getElementById('group-assignment-result');
            if (container) {
                container.innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; color: #aaa; padding: 60px; border: 2px dashed #eee; border-radius: 12px;">
                        <i class="fa-solid fa-users-viewfinder" style="font-size: 3rem; margin-bottom: 20px; color: #eee;"></i>
                        <p>저장된 조편성이 없습니다. 조편성을 시작하세요.</p>
                    </div>`;
            }
        }
    } catch (err) {
        console.error("불러오기 실패:", err);
    }
}

/**
 * 3-4인 기반 지능형 그룹 분할 알고리즘
 */
function splitIntoOptimalGroups(shuffled) {
    const total = shuffled.length;
    const groups = [];

    // 예외 처리: 인원이 너무 적은 경우
    if (total <= 4) {
        return [shuffled];
    }

    // 4인 조 개수를 최대한 확보하면서, 나머지가 3명 이상이 되도록 조정
    // 수학적 원리: 4x + 3y = total 을 만족하는 정수 x, y 찾기 (x는 최대화)
    let num4 = Math.floor(total / 4);
    let remainder = total % 4;

    if (remainder === 1) {
        // 4*n + 1 => 4*(n-2) + 3*3 (3인조 3개 생성)
        if (num4 >= 2) {
            num4 -= 2;
        } else {
            // 인원이 5명인 경우 등 특수 케이스 (3+2 로 나뉘는 대신 5명 한 조 또는 3+2 알림)
            return [shuffled];
        }
    } else if (remainder === 2) {
        // 4*n + 2 => 4*(n-1) + 3*2 (3인조 2개 생성)
        if (num4 >= 1) {
            num4 -= 1;
        } else {
            // 인원이 6명인 경우 (3+3)
            num4 = 0;
        }
    } else if (remainder === 3) {
        // 4*n + 3 => 4*n + 3*1 (3인조 1개 생성)
        // num4 유지
    }

    let currentIndex = 0;
    // 4인조 배치
    for (let i = 0; i < num4; i++) {
        groups.push(shuffled.slice(currentIndex, currentIndex + 4));
        currentIndex += 4;
    }
    // 남은 인원을 3인조로 배치
    while (currentIndex < total) {
        groups.push(shuffled.slice(currentIndex, currentIndex + 3));
        currentIndex += 3;
    }

    return groups;
}

function renderGroups(groups) {
    const container = document.getElementById('group-assignment-result');
    if (!container) return;

    container.innerHTML = '';
    let copyText = "[조편성 결과]\n\n";

    groups.forEach((group, index) => {
        const div = document.createElement('div');
        div.id = `group-card-${index}`;
        div.className = 'group-card';
        div.style.background = '#fff';
        div.style.padding = '15px';
        div.style.borderRadius = '8px';
        div.style.border = '1px solid #ddd';
        div.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
        div.style.transition = 'all 0.2s';

        // Drop Event Listeners (Desktop)
        div.ondragover = (e) => {
            e.preventDefault();
            div.classList.add('drag-over');
        };
        div.ondragleave = () => div.classList.remove('drag-over');
        div.ondrop = (e) => {
            e.preventDefault();
            div.classList.remove('drag-over');
            const memberName = e.dataTransfer.getData('text/plain');
            const fromIdx = parseInt(e.dataTransfer.getData('fromIdx'));
            handleMoveMember(memberName, fromIdx, index);
        };

        const h5 = document.createElement('h5');
        h5.textContent = `${index + 1} 조`;
        h5.style.margin = '0 0 10px 0';
        h5.style.color = '#577b2d';
        h5.style.borderBottom = '1px solid #eee';
        h5.style.paddingBottom = '5px';
        div.appendChild(h5);

        const ul = document.createElement('ul');
        ul.id = `group-list-${index}`;
        ul.style.listStyle = 'none';
        ul.style.padding = '0';
        ul.style.margin = '0';
        ul.style.minHeight = '100px'; // Empty zone drop support

        copyText += `${index + 1} 조: ${group.join(', ')} \n`;

        group.forEach(name => {
            const li = document.createElement('li');
            li.className = 'member-item';
            li.draggable = true;
            li.style.display = 'flex';
            li.style.justifyContent = 'space-between';
            li.style.alignItems = 'center';
            li.style.padding = '8px 12px';
            li.style.marginBottom = '5px';
            li.style.borderRadius = '4px';
            li.style.background = '#f9f9f9';
            li.style.border = '1px solid #f0f0f0';

            const nameSpan = document.createElement('span');
            nameSpan.className = 'member-name';
            nameSpan.textContent = name;
            nameSpan.style.fontSize = '1.0rem';
            nameSpan.style.fontWeight = '500';
            li.appendChild(nameSpan);

            // Drag Events (Desktop)
            li.ondragstart = (e) => {
                e.dataTransfer.setData('text/plain', name);
                e.dataTransfer.setData('fromIdx', index);
                setTimeout(() => li.classList.add('dragging'), 0);
            };
            li.ondragend = () => li.classList.remove('dragging');

            // Touch Events (Mobile)
            let touchGhost = null;
            li.ontouchstart = (e) => {
                const touch = e.touches[0];
                li.classList.add('dragging');

                // Create ghost element for touch
                touchGhost = document.createElement('div');
                touchGhost.className = 'member-ghost';
                touchGhost.textContent = name;
                document.body.appendChild(touchGhost);
                updateGhostPos(touch);
            };

            li.ontouchmove = (e) => {
                e.preventDefault(); // Prevent scrolling while dragging
                const touch = e.touches[0];
                updateGhostPos(touch);

                // Highlight target group
                const target = document.elementFromPoint(touch.clientX, touch.clientY);
                const targetGroup = target?.closest('.group-card');

                document.querySelectorAll('.group-card').forEach(g => g.classList.remove('drag-over'));
                if (targetGroup) targetGroup.classList.add('drag-over');
            };

            li.ontouchend = (e) => {
                li.classList.remove('dragging');
                if (touchGhost) {
                    const touch = e.changedTouches[0];
                    const target = document.elementFromPoint(touch.clientX, touch.clientY);
                    const targetGroup = target?.closest('.group-card');

                    if (targetGroup) {
                        const targetIdx = parseInt(targetGroup.id.replace('group-card-', ''));
                        handleMoveMember(name, index, targetIdx);
                    }

                    document.body.removeChild(touchGhost);
                    touchGhost = null;
                }
                document.querySelectorAll('.group-card').forEach(g => g.classList.remove('drag-over'));
            };

            function updateGhostPos(touch) {
                if (touchGhost) {
                    touchGhost.style.left = (touch.clientX + 10) + 'px';
                    touchGhost.style.top = (touch.clientY - 40) + 'px';
                }
            }

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

    // 저장 버튼 기능 연결
    const saveBtn = document.getElementById('save-groups-btn');
    if (saveBtn) {
        saveBtn.onclick = saveGroups;
    }
}

// 멤버 이동 통합 처리 함수
function handleMoveMember(memberName, fromIdx, toIdx) {
    if (fromIdx === toIdx) return;

    // 현재 화면 데이터 수집
    const currentGroups = [];
    document.querySelectorAll('#group-assignment-result > .group-card').forEach(groupDiv => {
        const members = [];
        groupDiv.querySelectorAll('ul li .member-name').forEach(span => members.push(span.textContent.trim()));
        currentGroups.push(members);
    });

    // 데이터 이동
    const mIdx = currentGroups[fromIdx].indexOf(memberName);
    if (mIdx > -1) {
        currentGroups[fromIdx].splice(mIdx, 1);
        currentGroups[toIdx].push(memberName);
        renderGroups(currentGroups);
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
    const participants = rsvps.filter(d => `${d.month} ${d.date} ` === groupKey && d.status === 'attend' && d.roundscore);

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
            roundaward: `[${rank}위]${award ? ' ' + award : ''} `
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
    { month: '4월', date: '4.3' },
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
/**
 * 모든 RSVP 데이터를 분석하여 스폰서 정보를 집계하고 명예의 전당 섹션에 렌더링합니다.
 */
async function renderSponsorHall(prefetchedData = null) {
    const container = document.getElementById('sponsor-hall-container');
    if (!container) return;

    try {
        const sponsorHistory = [
            {
                title: "5월 스폰서",
                list: [
                    "원우회 : 300만원",
                    "현성호 원우회장님 : 200만원",
                    "김대욱 골프회장님 : 100만원",
                    "정민호 골프부회장님 : 공진단 3박스(60만원 * 3 = 180만원 상당)"
                ]
            },
            {
                title: "4월 3일 스폰서",
                list: [
                    "현성호 원우회장님 : 모듬 과일 2박스, 쌀 2포대, 김 셋트"
                ]
            },
            {
                title: "4월 22일 스폰서",
                list: [
                    "김대욱 골프회장님 : 골프공",
                    "정민호 골프부회장님 : 공진단 1박스"
                ]
            },
            {
                title: "3월 스폰서",
                list: [
                    "김대욱 골프회장님 : 사과 3박스",
                    "박철호 골프부회장님 : 사과 3박스",
                    "정진우 원우님 : 10만원 상품권 3장, 인형 2개"
                ]
            }
        ];

        container.innerHTML = '';
        container.style.display = 'grid';
        container.style.gridTemplateColumns = 'repeat(auto-fit, minmax(300px, 1fr))';
        container.style.gap = '20px';

        sponsorHistory.forEach(data => {
            const card = document.createElement('div');
            card.className = 'sponsor-card fade-in-up';
            card.style.background = '#fff';
            card.style.padding = '25px';
            card.style.borderRadius = '15px';
            card.style.border = '1px solid #e0c58a';
            card.style.boxShadow = '0 4px 15px rgba(197, 160, 89, 0.1)';
            card.style.display = 'flex';
            card.style.flexDirection = 'column';
            card.style.alignItems = 'flex-start';

            let listHtml = data.list.map(item => {
                const parts = item.split(':').map(p => p.trim());
                if(parts.length === 2) {
                    return `<div style="display: flex; justify-content: space-between; width: 100%; border-bottom: 1px dashed #f0f0f0; padding: 8px 0;">
                                <span style="color: #444; font-weight: 500;">${parts[0]}</span>
                                <span style="color: #577b2d; font-weight: bold;">${parts[1]}</span>
                            </div>`;
                }
                return `<div style="margin-bottom: 8px; font-size: 1.05rem; color: #333;">${item}</div>`;
            }).join('');

            card.innerHTML = `
                <div style="font-size: 1.2rem; color: #c5a059; font-weight: bold; margin-bottom: 10px; border-bottom: 2px solid #f0e6d2; padding-bottom: 10px; width: 100%; text-align: left;">
                    ${data.title}
                </div>
                <div style="width: 100%;">
                    ${listHtml}
                </div>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        console.error('Error rendering sponsor hall:', err);
        container.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 40px; color:red;">내역을 불러오는 중 오류가 발생했습니다.</div>';
    }
}

/**
 * 화면 하단에 일시적인 알림 메시지를 표시합니다.
 */
function showToast(message) {
    // 기존 토스트 제거
    const oldToast = document.querySelector('.toast');
    if (oldToast) oldToast.remove();

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerText = message;
    document.body.appendChild(toast);

    // 강비 동기화 후 클래스 추가
    setTimeout(() => {
        toast.classList.add('show');
    }, 10);

    // 3초 후 제거
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) toast.parentNode.removeChild(toast);
        }, 300);
    }, 3000);
}

window.renderSponsorHall = renderSponsorHall;
window.showToast = showToast;
