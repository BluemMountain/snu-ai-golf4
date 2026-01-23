// Global CSV Data for Stats lookup (Sorted Alphabetically)
const CSV_DATA_STRING = `
, ,Name,媛뺤닚?,怨쎈끂以,沅뚮???源湲곕줉,源???源?쒖씪,?⑥꽌??臾몄꽦??諛뺤긽湲?諛뺤쿋??諛뺤껌??諛뺥씗???≪썝???좎냼???щ????덉궪洹??덉썝???닿탳援??대????대Ц???댁긽???댁꽍???댁슜???뺣?洹??뺣????뺤???議곗쨷洹??꾩꽦??諛뺤????좎닔??源?ㅼ꽍,?댁쭊???λ퀝???댁꽦???꾩?誘?理쒖젙??源醫낆꽭,諛고깭洹?沅뚰쁺李??쒖삁??理쒖쿋???댁옱???댁?湲??댁＜誘?源???梨꾩꽦??源?꾩뿴,?댁쁺洹?count,Date,CC/HD,92.5,88.7,97.3,87.5,87,89.5,90.6,91,83.2,86.6,89.4,88,87.4,101.5,98.3,100.3,0,93,90,86,98,83.3,106.7,93,94.3,88.3,92.6,82.3,105,96.7,0,111,90,78.3,94.5,77.7,88,85.5,101,0,87,101,93,94.7,98.5,100,87,97
1,250427,?뚰렂?쒖븘,99,93,97,90,93,96,94,91,86,88,85,92,94,101,103,106,0,90,96,86,98,85,112,99,100,91,92,53,,,,,,,,,,,,,,,,,,,,
2,250625,?먮뱶濡쒖궗??,91,,,89,,,,75,,86,,,,94,,,,,,,,,98,96,,,72,,,,,,70,79,,,,,,,,,,,,,
3,250726,88CC,,,103,85,85,83,85,,81,80,80,,,,,90,,,86,,,84,,89,89,,,83,,92,,,90,,92,75,88,86,,,,,,,,,,
4,250827,?먮뱶濡쒖궗??,,,,87,,94,,,85,91,,,105,98,105,,,94,,,,,102,99,,102,,,,,,,,104,,,,,,,,,,,,,
5,250910,?ъ슦?ㅼ뒪?꾨쭅??,82,,,82,,92,,85,87,92,,82,,99,,,,,82,,81,104,92,90,86,91,88,,99,,,,77,100,78,,,101,,87,,,,,,,
6,250924,?먮뱶濡쒖궗??,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,
7,251019,??몃떒??86,,92,,85,,,,89,,91,81,84,,,100,,96,84,88,,,,85,,88,87,90,,,,,,88,,80,,85,,,,101,93,89,93,,,
8,251022,?먮뱶濡쒖궗??,,,,89,,88,,,,96,,90,101,94,,,,,88,,,104,88,91,,,94,105,99,,111,,,96,,,,,,,,,97,,100,,
9,251126,?먮뱶濡쒖궗??,,,,86,,,,,93,94,91,87,99,102,,,,,,,,,91,95,,91,96,,,,,,,96,,,,,,,,,98,104,,87,97
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

    // RSVP Logic
    initRSVP();
});

function initRSVP() {
    const modal = document.getElementById('rsvp-modal');
    if (!modal) return; // ?꾩슜 愿由ъ옄 ?섏씠吏 ?깆뿉?쒕뒗 RSVP 濡쒖쭅 嫄대꼫?

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
                alert(`${month} ?쇱슫???좎껌? ${availability.availableFrom}遺??媛?ν빀?덈떎.`);
                return;
            }

            modalSubtitle.textContent = `?쇱떆: ${month} ${date}`;
            if (availability.status === 'waiting') {
                modalSubtitle.innerHTML += ` <span style="color: #d35400; font-weight: bold; margin-left: 10px;">(?꾩옱 ?湲곗옄 ?좎껌 湲곌컙?낅땲??</span>`;
            }

            rsvpMonthInput.value = month;
            rsvpDateInput.value = date;

            modal.style.display = 'block';
        });
    });

    // Handle Hero RSVP Button
    const heroRsvpBtn = document.getElementById('hero-rsvp-btn');
    if (heroRsvpBtn) {
        heroRsvpBtn.addEventListener('click', (e) => {
            e.preventDefault();
            // Trigger click on the first valid schedule card (March)
            const firstCard = document.querySelector('.schedule-card:not(.break)');
            if (firstCard) {
                firstCard.click();
            } else {
                alert("?좎껌 媛?ν븳 ?쇱젙???놁뒿?덈떎.");
            }
        });
    }

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
            isWaiting: (availability.status === 'waiting')
        };

        try {
            // Local Storage Demo
            const existing = JSON.parse(localStorage.getItem('snu_golf_rsvps') || '[]');
            formData.submittedAt = new Date().toISOString(); // Ensure timestamp
            existing.push(formData);
            localStorage.setItem('snu_golf_rsvps', JSON.stringify(existing));

            alert('李몄꽍 ?좎껌???꾨즺?섏뿀?듬땲?? (?곗씠?곕뒗 釉뚮씪?곗?????λ맗?덈떎)');
            modal.style.display = 'none';
            form.reset();

            // Refresh public view and admin
            renderPublicRSVPs();
            loadAdminData();
        } catch (error) {
            console.error('Error submitting RSVP:', error);
            alert('????ㅽ뙣');
        }
    });

    // Load initial public RSVPs
    renderPublicRSVPs();

    // Admin Modal Logic (Demo)
    const adminLink = document.getElementById('admin-link');
    const adminModal = document.getElementById('admin-modal');
    const adminCloseBtn = document.querySelector('.admin-close');
    const adminRefreshBtn = document.getElementById('admin-refresh-btn');
    const adminClearBtn = document.getElementById('admin-clear-btn');

    // Admin Tabs Logic
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // Remove active class from all
            tabBtns.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));

            // Add active to current
            btn.classList.add('active');
            const tabId = btn.getAttribute('data-tab');
            document.getElementById(tabId).classList.add('active');
        });
    });

    // Handle Admin Member Add
    const addMemberBtn = document.getElementById('add-member-btn');
    const newMemberTypeSelect = document.getElementById('new-member-type');
    const newMemberRoleInput = document.getElementById('new-member-role');

    if (newMemberTypeSelect) {
        newMemberTypeSelect.addEventListener('change', () => {
            if (newMemberTypeSelect.value === 'executive') {
                newMemberRoleInput.style.display = 'block';
            } else {
                newMemberRoleInput.style.display = 'none';
            }
        });
    }

    if (addMemberBtn) {
        addMemberBtn.addEventListener('click', () => {
            const nameInput = document.getElementById('new-member-name');
            const type = newMemberTypeSelect.value;
            const role = newMemberRoleInput.value.trim();
            const name = nameInput.value.trim();

            if (!name) {
                alert('?대쫫???낅젰?댁＜?몄슂.');
                return;
            }

            addMember(name, type, role);
            nameInput.value = '';
            newMemberRoleInput.value = '';
        });
    }

    // Load initial members for public view
    // Pre-populate if empty
    initMembers();
    loadMembers(); // Render

    // Admin Modal Open Logic Update - Load Members too
    if (adminLink) {
        adminLink.onclick = (e) => {
            e.preventDefault();
            const password = prompt("愿由ъ옄 鍮꾨?踰덊샇瑜??낅젰?섏꽭??(?곕え: 1234)");
            if (password === "1234") {
                loadAdminData();
                loadAdminMembers();
                adminModal.style.display = 'block';
            } else if (password !== null) {
                alert("鍮꾨?踰덊샇媛 ??몄뒿?덈떎.");
            }
        };
    }

    if (adminCloseBtn) {
        adminCloseBtn.onclick = () => {
            adminModal.style.display = 'none';
        };
    }

    // Also handle window click for admin modal
    const originalWindowOnClick = window.onclick;
    window.onclick = (event) => {
        if (originalWindowOnClick) originalWindowOnClick(event);
        if (event.target == adminModal) {
            adminModal.style.display = 'none';
        }
    };

    if (adminRefreshBtn) {
        adminRefreshBtn.onclick = loadAdminData;
    }

    if (adminClearBtn) {
        adminClearBtn.onclick = () => {
            if (confirm("?뺣쭚濡?紐⑤뱺 ?좎껌 ?곗씠?곕? ??젣?섏떆寃좎뒿?덇퉴?")) {
                localStorage.removeItem('snu_golf_rsvps');
                loadAdminData();
                renderPublicRSVPs();
                alert("珥덇린?붾릺?덉뒿?덈떎.");
            }
        };
    }

    const adminDownloadBtn = document.getElementById('admin-download-btn');
    if (adminDownloadBtn) {
        adminDownloadBtn.onclick = downloadScorecard;
    }
}

/* --- Member Management Functions --- */

function initMembers() {
    const stored = localStorage.getItem('snu_golf_members');
    if (!stored || JSON.parse(stored).length === 0) {
        const initialNames = ["媛뺤닚?", "怨쎈끂以", "沅뚮???, "源湲곕줉", "源???, "源?쒖씪", "?⑥꽌??, "臾몄꽦??, "諛뺤긽湲?, "諛뺤쿋??, "諛뺤껌??, "諛뺥씗??, "?≪썝??, "?좎냼??, "?щ???, "?덉궪洹?, "?덉썝??, "?닿탳援?, "?대???, "?대Ц??, "?댁긽??, "?댁꽍??, "?댁슜??, "?뺣?洹?, "?뺣???, "?뺤???, "議곗쨷洹?, "?꾩꽦??, "諛뺤???, "?좎닔??, "源?ㅼ꽍", "?댁쭊??, "?λ퀝??, "?댁꽦??, "?꾩?誘?, "理쒖젙??, "源醫낆꽭", "諛고깭洹?, "沅뚰쁺李?, "?쒖삁??, "理쒖쿋??, "?댁옱??, "?댁?湲?, "?댁＜誘?, "源???, "梨꾩꽦??, "源?꾩뿴", "?댁쁺洹?];

        const members = initialNames.map(name => ({
            name: name,
            type: 'ilban' // Default to General Member
        }));

        // ?≪썝?앸떂? 紐낅떒 珥덇린???쒖뿉???쇰컲?뚯썝?쇰줈 ?ㅼ젙 (?ъ슜???붿껌: 臾몄쓽?섍린?먯꽌 ?쒖쇅)
        localStorage.setItem('snu_golf_members', JSON.stringify(members));
    } else {
        // 湲곗〈 ?곗씠?곌? ?덈뒗 寃쎌슦 ?≪썝?앸떂??李얠븘???꾩썝?먯꽌 ?쇰컲?쇰줈 蹂寃?(?꾩썝??寃쎌슦?먮쭔)
        const members = JSON.parse(stored);
        const targetIdx = members.findIndex(m => m.name === '?≪썝??);
        if (targetIdx !== -1 && members[targetIdx].type === 'executive') {
            members[targetIdx].type = 'ilban';
            delete members[targetIdx].role;
            localStorage.setItem('snu_golf_members', JSON.stringify(members));
        }
    }
}

function loadMembers() {
    const members = JSON.parse(localStorage.getItem('snu_golf_members') || '[]');
    const execList = document.getElementById('member-list-executive');

    if (execList) execList.innerHTML = '';

    // Filter for executives only for the public view
    const executives = members.filter(m => m.type === 'executive');

    if (executives.length === 0) {
        if (execList) execList.innerHTML = '<p style="color:#888; text-align:center; width:100%;">?깅줉???꾩썝吏꾩씠 ?놁뒿?덈떎.</p>';
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
            <div style="font-size: 0.85rem; color: #577b2d; font-weight: bold; margin-bottom: 5px;">${member.role || '?꾩썝'}</div>
            <div style="font-size: 1.1rem; font-weight: bold; color: #333;">${member.name}</div>
        `;

        if (execList) {
            execList.appendChild(div);
        }
    });
}

function addMember(name, type, role) {
    const members = JSON.parse(localStorage.getItem('snu_golf_members') || '[]');

    members.push({ name, type, role });
    localStorage.setItem('snu_golf_members', JSON.stringify(members));

    // Refresh Views
    loadMembers();
    loadAdminMembers();
}

function deleteMember(index) {
    if (!confirm("?뺣쭚 ??젣?섏떆寃좎뒿?덇퉴?")) return;

    const members = JSON.parse(localStorage.getItem('snu_golf_members') || '[]');
    members.splice(index, 1);
    localStorage.setItem('snu_golf_members', JSON.stringify(members));

    // Refresh Views
    loadMembers();
    loadAdminMembers();
}

function updateMemberType(index, newType) {
    const members = JSON.parse(localStorage.getItem('snu_golf_members') || '[]');
    const member = members[index];

    member.type = newType;

    if (newType === 'executive') {
        const role = prompt(`${member.name}?섏쓽 吏곸콉???낅젰?댁＜?몄슂 (?? ?뚯옣, 珥앸Т):`, member.role || '');
        if (role !== null) {
            member.role = role;
        } else {
            member.role = '';
        }
    } else {
        delete member.role;
    }

    localStorage.setItem('snu_golf_members', JSON.stringify(members));
    loadMembers();
    loadAdminMembers();
}

function loadAdminMembers() {
    const tbody = document.querySelector('#admin-member-table tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    const members = JSON.parse(localStorage.getItem('snu_golf_members') || '[]');
    const memberItems = members.map((m, i) => ({ ...m, originalIndex: i }));

    const typeOrder = { 'executive': 1, 'jeong': 2, 'jun': 3, 'ilban': 4 };
    memberItems.sort((a, b) => {
        if (typeOrder[a.type] !== typeOrder[b.type]) {
            return typeOrder[a.type] - typeOrder[b.type];
        }
        return a.name.localeCompare(b.name, 'ko');
    });

    memberItems.forEach((item) => {
        const tr = document.createElement('tr');
        const isExecutive = item.type === 'executive';

        tr.innerHTML = `
            <td style="padding: 10px; border: 1px solid #ddd;">${item.name}</td>
            <td style="padding: 10px; border: 1px solid #ddd;">
                <select onchange="updateMemberType(${item.originalIndex}, this.value)" style="padding: 4px; border-radius: 4px; border: 1px solid #ddd; width: 100%;">
                    <option value="ilban" ${item.type === 'ilban' ? 'selected' : ''}>?쇰컲?뚯썝</option>
                    <option value="jeong" ${item.type === 'jeong' ? 'selected' : ''}>?뺥쉶??/option>
                    <option value="jun" ${item.type === 'jun' ? 'selected' : ''}>以?뚯썝</option>
                    <option value="executive" ${item.type === 'executive' ? 'selected' : ''}>?꾩썝</option>
                </select>
                ${isExecutive ? `<div style="font-size: 0.75rem; color: #577b2d; margin-top: 4px; font-weight: bold;">吏곸콉: ${item.role || '蹂댁쭅?놁쓬'}</div>` : ''}
            </td>
            <td style="padding: 10px; border: 1px solid #ddd;">
                <input type="text" value="${item.awardHistory || ''}" onchange="updateMemberAward(${item.originalIndex}, this.value)" placeholder="?섏긽 ?대젰 ?낅젰" style="width: 100%; padding: 4px; border: 1px solid #ddd;">
            </td>
            <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">
                <button class="cta-button" onclick="deleteMember(${item.originalIndex})" style="padding: 2px 8px; font-size: 0.8rem; background-color: #e74c3c; min-width: auto;">??젣</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function updateRSVPField(index, field, value) {
    const data = JSON.parse(localStorage.getItem('snu_golf_rsvps') || '[]');
    if (data[index]) {
        data[index][field] = value;
        localStorage.setItem('snu_golf_rsvps', JSON.stringify(data));
    }
}

function updateMemberAward(index, value) {
    const members = JSON.parse(localStorage.getItem('snu_golf_members') || '[]');
    if (members[index]) {
        members[index].awardHistory = value;
        localStorage.setItem('snu_golf_members', JSON.stringify(members));
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

function loadAdminData() {
    // 1. RSVP Table Update
    const rsvpTbody = document.querySelector('#admin-table tbody');
    if (rsvpTbody) {
        rsvpTbody.innerHTML = '';
        const data = JSON.parse(localStorage.getItem('snu_golf_rsvps') || '[]');

        if (data.length === 0) {
            rsvpTbody.innerHTML = '<tr><td colspan="8" style="text-align:center; padding: 20px;">?좎껌 ?댁뿭???놁뒿?덈떎.</td></tr>';
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
                            <span>${key} (珥?${items.length}紐?/ 李몄꽍 ${attendCount}紐?</span>
                            <button onclick="autoCalculateAwards('${key}')" style="background: #c5a059; color: white; border: none; padding: 4px 10px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">?먮룞 ?섏긽 怨꾩궛</button>
                        </div>
                    </td>
                `;
                rsvpTbody.appendChild(headerRow);

                items.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt));
                items.forEach((item, itemIdx) => {
                    const tr = document.createElement('tr');
                    const stats = getMemberStats(item.name);

                    // find unique index for updating
                    const realIndex = data.findIndex(d => d.submittedAt === item.submittedAt && d.name === item.name);

                    tr.innerHTML = `
                        <td style="padding: 10px; border: 1px solid #ddd;">${item.month} ${item.date}</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${item.name}${item.isWaiting ? ' <span style="color:#d35400; font-size:0.8rem;">(?湲?</span>' : ''}</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${item.phone || '-'}</td>
                        <td style="padding: 10px; border: 1px solid #ddd; color: ${item.status === 'attend' ? 'green' : 'red'}; font-weight: bold;">
                            ${item.status === 'attend' ? (item.isWaiting ? '李몄꽍(?湲?' : '李몄꽍') : '遺덉갭'}
                        </td>
                        <td style="padding: 5px; border: 1px solid #ddd;">
                            <input type="text" value="${item.sponsor || ''}" onchange="updateRSVPField(${realIndex}, 'sponsor', this.value)" placeholder="?ㅽ룿 ?댁슜" style="width: 100%; min-width: 80px; padding: 4px; border: 1px solid #ddd;">
                        </td>
                        <td style="padding: 5px; border: 1px solid #ddd; text-align: center;">
                            ${item.status === 'attend' ? `<input type="text" value="${item.roundScore || ''}" onchange="updateRSVPField(${realIndex}, 'roundScore', this.value)" style="width: 50px; padding: 4px; text-align: center; border: 1px solid #ddd;">` : '-'}
                        </td>
                        <td style="padding: 5px; border: 1px solid #ddd; text-align: center;">
                            ${item.status === 'attend' ? `<input type="text" value="${item.roundAward || ''}" onchange="updateRSVPField(${realIndex}, 'roundAward', this.value)" placeholder="?곗듅 ?? style="width: 80px; padding: 4px; border: 1px solid #ddd;">` : '-'}
                        </td>
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${stats.h25}</td>
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${stats.last}</td>
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${stats.h26}</td>
                        <td style="padding: 10px; border: 1px solid #ddd;">${item.submittedAt ? new Date(item.submittedAt).toLocaleString('ko-KR') : '-'}</td>
                        <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">
                            <button onclick="deleteRSVP(${realIndex})" style="background: #e74c3c; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 0.8rem;">??젣</button>
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

function renderPublicRSVPs() {
    const container = document.getElementById('public-rsvp-container');
    if (!container) return;

    const data = JSON.parse(localStorage.getItem('snu_golf_rsvps') || '[]');
    if (data.length === 0) {
        container.innerHTML = '<div style="text-align:center; padding: 40px; color:#888;">?꾩쭅 ?좎껌 ?댁뿭???놁뒿?덈떎.</div>';
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
                    <span style="font-weight: bold; font-size: 1.1rem; color: #333;">${item.name}${item.isWaiting ? ' <span style="font-size: 0.8rem; color: #d35400;">(?湲?</span>' : ''}</span>
                    <span style="padding: 2px 8px; border-radius: 20px; font-size: 0.8rem; font-weight: bold; background: ${item.status === 'attend' ? '#e8f5e9' : '#ffebee'}; color: ${item.status === 'attend' ? '#2e7d32' : '#c62828'};">
                        ${item.status === 'attend' ? '李몄꽍' : '遺덉갭'}
                    </span>
                </div>
                <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; border-top: 1px solid #f5f5f5; pt: 10px; margin-top: 10px; padding-top: 10px;">
                    <div style="text-align: center;">
                        <div style="font-size: 0.7rem; color: #888;">25???몃뵒</div>
                        <div style="font-weight: bold; color: #577b2d;">${stats.h25}</div>
                    </div>
                    <div style="text-align: center; border-left: 1px solid #f5f5f5; border-right: 1px solid #f5f5f5;">
                        <div style="font-size: 0.7rem; color: #888;">?꾩썡 ?ㅼ퐫??/div>
                        <div style="font-weight: bold; color: #d35400;">${stats.last}</div>
                    </div>
                    <div style="text-align: center;">
                        <div style="font-size: 0.7rem; color: #888;">26???몃뵒</div>
                        <div style="font-weight: bold; color: #2980b9;">${stats.h26}</div>
                    </div>
                </div>
            `;
            list.appendChild(card);
        });

        monthDiv.appendChild(list);

        // ?ㅽ룿???뺣낫 ?쒖떆
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
                    <span style="margin-right: 8px;">?럞</span> ?대떖???ㅽ룿??                </h4>
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

    // ?뚯썝紐??뺣젹 (Column 3遺?곌? ?뚯썝 ?대쫫)
    if (data.length > 0) {
        const header = data[0];
        const memberInfo = [];

        // 3踰덉㎏ ?대????앷퉴吏 ?뚯썝 ?곗씠??異붿텧
        for (let j = 3; j < header.length; j++) {
            const memberColumn = data.map(row => row[j]);
            memberInfo.push({
                name: header[j],
                columnData: memberColumn
            });
        }

        // 媛?섎떎 ?쒖쑝濡??뺣젹
        memberInfo.sort((a, b) => a.name.localeCompare(b.name, 'ko'));

        // ?뺣젹???쒖꽌?濡??곗씠???ъ“??        const newData = data.map(row => row.slice(0, 3));
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
        container.innerHTML = '<div class="loading-spinner">?곗씠?곌? ?놁뒿?덈떎.</div>';
        return;
    }

    const table = document.createElement('table');
    table.id = isAdmin ? 'admin-score-table' : 'score-table';

    let headerRowData = data[0];
    let subHeaderRowData = data[1];
    let bodyRowsData = data.slice(2);

    // 硫붿씤 ?섏씠吏(Public)??寃쎌슦 '25???몃뵒' ?됰쭔 ?④린怨??섎㉧吏 ?몃? ?ㅼ퐫??????젣
    if (!isAdmin) {
        // subHeaderRowData (index 1) 媛 'CC/HD' 諛??몃뵒罹??됱엫
        // bodyRowsData瑜?鍮꾩썙踰꾨━硫??몃? ?ㅼ퐫????蹂댁엫
        bodyRowsData = [];
    }

    const thead = document.createElement('thead');
    const headerRow = document.createElement('tr');
    headerRow.className = 'score-header-row';

    headerRowData.forEach((cell, index) => {
        const th = document.createElement('th');
        th.textContent = cell.trim();
        if (!isAdmin && index < 3) {
            // 硫붿씤 ?섏씠吏?먯꽌 ?욎쓽 怨듬갚/移댁슫???좎쭨 ???④린湲?(?좏깮??
            // ?쇰떒 ?붿껌?濡?媛?섎떎 ???뚯썝紐낃낵 ?몃뵒罹〓쭔 媛뺤“
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
            if (venue.includes('痍⑥냼') || venue.includes('?댁옣')) {
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

    // 愿由ъ옄 ?곸꽭 ?ㅼ퐫???뚯씠釉붿슜 異붽? ?ㅽ???(JS濡?吏곸젒 二쇱엯)
    if (isAdmin) {
        table.style.fontSize = '0.85rem';
        table.querySelectorAll('th, td').forEach(cell => {
            cell.style.border = '1px solid #ddd';
        });
        // ?곸꽭 ?ㅼ퐫???뚯씠釉붿쓽 ?ㅻ뜑瑜??꾩そ?먮룄 怨좎젙
        const headerCells = table.querySelectorAll('.score-header-row th');
        headerCells.forEach(th => {
            th.style.position = 'sticky';
            th.style.top = '0';
            th.style.zIndex = '40';
        });
        // 援ъ꽍(泥?3媛??댁쓽 ?ㅻ뜑)? ???믪? ?곗꽑?쒖쐞
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

        alert("?먭꺽 ?쒕쾭媛 ?꾨땶 濡쒖뺄 ?섍꼍?먯꽌 ?ㅽ뻾 以묒씤 寃쎌슦, 釉뚮씪?곗? 蹂댁븞 ?뺤콉???곕씪 ?뚯씪 ?ㅼ슫濡쒕뱶 踰꾪듉???묐룞?섏? ?딆쓣 ???덉뒿?덈떎.\n\n??寃쎌슦, ?꾩옱 ?대뜑???덈뒗 'scores.csv' ?뚯씪??吏곸젒 ?묒?濡??댁뼱 ?섏젙??二쇱꽭??");
    } catch (err) {
        console.error("Download failed:", err);
        alert("?ㅼ슫濡쒕뱶 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎. ?꾩옱 ?대뜑??'scores.csv' ?뚯씪??吏곸젒 ?댁뼱二쇱꽭??\n?ㅻ쪟: " + err.message);
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

function assignGroups(mode) {
    let participants = [];

    if (mode === 'sample') {
        // ?꾩껜 ?뚯썝 湲곕컲 (?섑뵆)
        const members = JSON.parse(localStorage.getItem('snu_golf_members') || '[]');
        participants = members.map(m => m.name);
    } else {
        // ?꾩옱 ?좎껌??李몄꽍) 湲곕컲
        const rsvps = JSON.parse(localStorage.getItem('snu_golf_rsvps') || '[]');
        // 李몄꽍(attend) ?곹깭???щ엺?ㅻ쭔 以묐났 ?쒓굅?섏뿬 異붿텧
        participants = [...new Set(rsvps.filter(r => r.status === 'attend').map(r => r.name))];
    }

    if (participants.length === 0) {
        alert("議고렪?깊븷 ?몄썝???놁뒿?덈떎.");
        return;
    }

    // 臾댁옉???욊린
    const shuffled = shuffleArray(participants);

    // 4紐낆뵫 議??섎늻湲?    const groupSize = 4;
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

    let copyText = "[議고렪??寃곌낵]\n\n";

    groups.forEach((group, index) => {
        const div = document.createElement('div');
        div.style.background = '#fff';
        div.style.padding = '15px';
        div.style.borderRadius = '8px';
        div.style.border = '1px solid #ddd';
        div.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';

        const h5 = document.createElement('h5');
        h5.textContent = `${index + 1}議?;
        h5.style.margin = '0 0 10px 0';
        h5.style.color = '#577b2d';
        h5.style.borderBottom = '1px solid #eee';
        h5.style.paddingBottom = '5px';
        div.appendChild(h5);

        const ul = document.createElement('ul');
        ul.style.listStyle = 'none';
        ul.style.padding = '0';
        ul.style.margin = '0';

        copyText += `${index + 1}議? ${group.join(', ')}\n`;

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

    // 蹂듭궗 踰꾪듉 湲곕뒫 ?곌껐
    const copyBtn = document.getElementById('copy-groups-btn');
    if (copyBtn) {
        copyBtn.onclick = () => {
            navigator.clipboard.writeText(copyText).then(() => {
                alert("議고렪??寃곌낵媛 ?대┰蹂대뱶??蹂듭궗?섏뿀?듬땲??");
            });
        };
    }
}

/* --- Automatic Award Calculation --- */

function autoCalculateAwards(groupKey) {
    const data = JSON.parse(localStorage.getItem('snu_golf_rsvps') || '[]');

    // ?대떦 ?좎쭨??李몄꽍??以??먯닔媛 ?낅젰???щ엺留?異붿텧
    const participants = data.filter(d => `${d.month} ${d.date}` === groupKey && d.status === 'attend' && d.roundScore);

    if (participants.length === 0) {
        alert("?먯닔媛 ?낅젰??李몄꽍?먭? ?놁뒿?덈떎. 癒쇱? ?먯닔瑜??낅젰?댁＜?몄슂.");
        return;
    }

    // 遺꾩꽍???꾪븳 ?곗씠??援ъ“ ?앹꽦
    const analyzed = participants.map(p => {
        const stats = getMemberStats(p.name);
        const gross = parseFloat(p.roundScore);

        // ?몃뵒罹?寃곗젙 (26??3???덉쇅 泥섎━)
        let handicap = 0;
        if (groupKey.includes('3??) && groupKey.includes('26')) {
            handicap = parseFloat(stats.h25) || 0;
        } else {
            handicap = parseFloat(stats.h26) || parseFloat(stats.h25) || 0;
        }

        return {
            original: p, // ?먮낯 媛앹껜 李몄“ ?좎?
            gross,
            handicap,
            net: gross - handicap
        };
    });

    // 1. 硫붾떖由ъ뒪??(理쒖? ???
    const medalistObj = [...analyzed].sort((a, b) => a.gross - b.gross)[0];

    // 2. ?곗듅 (?몃뵒罹??鍮?理쒖? ???
    // 3. 以?곗듅 (?몃뵒罹??鍮?2??
    const netSorted = [...analyzed].sort((a, b) => a.net - b.net);
    const winnerObj = netSorted[0];
    const runnerUpObj = netSorted.length > 1 ? netSorted[1] : null;

    // 4. 瑗댁컡 (理쒓퀬 ???
    // 5. ?됱슫??(?ㅼ뿉??2??
    const grossSortedDesc = [...analyzed].sort((a, b) => b.gross - a.gross);
    const lastOneObj = grossSortedDesc[0];
    const luckyOneObj = grossSortedDesc.length > 1 ? grossSortedDesc[1] : null;

    // ?섏긽 ?댁슜 珥덇린?????ㅼ떆 ?좊떦 (?먮낯 媛앹껜??吏곸젒 ?좊떦)
    participants.forEach(p => p.roundAward = '');

    if (medalistObj) medalistObj.original.roundAward = '硫붾떖由ъ뒪??;
    if (winnerObj) {
        winnerObj.original.roundAward = winnerObj.original.roundAward ? winnerObj.original.roundAward + ', ?곗듅' : '?곗듅';
    }
    if (runnerUpObj) {
        runnerUpObj.original.roundAward = runnerUpObj.original.roundAward ? runnerUpObj.original.roundAward + ', 以?곗듅' : '以?곗듅';
    }
    if (luckyOneObj) {
        luckyOneObj.original.roundAward = luckyOneObj.original.roundAward ? luckyOneObj.original.roundAward + ', ?됱슫?? : '?됱슫??;
    }
    if (lastOneObj) {
        lastOneObj.original.roundAward = lastOneObj.original.roundAward ? lastOneObj.original.roundAward + ', 瑗댁컡' : '瑗댁컡';
    }

    // ?꾩껜 ?깆닔 異붽? (Net Score 湲곗?)
    netSorted.forEach((obj, idx) => {
        const rank = idx + 1;
        const currentAward = obj.original.roundAward;
        obj.original.roundAward = `[${rank}??${currentAward ? ' ' + currentAward : ''}`;
    });

    // 濡쒖뺄 ?ㅽ넗由ъ? ?낅뜲?댄듃
    localStorage.setItem('snu_golf_rsvps', JSON.stringify(data));

    alert(`${groupKey} ?섏긽 怨꾩궛???꾨즺?섏뿀?듬땲??`);
    loadAdminData(); // ?붾㈃ 媛깆떊
}

/* --- RSVP Availability Helper --- */
function getRSVPAvailability(monthText) {
    const now = new Date();
    const targetMonth = parseInt(monthText);
    if (isNaN(targetMonth)) return { status: 'unknown' };

    // 2026???쇱슫??湲곗? 濡쒖쭅
    const targetYear = 2026;

    // ?뺢린 ?좎껌 留덇컧?? ?꾩썡 留먯씪 23:59
    const regEnd = new Date(targetYear, targetMonth - 1, 0, 23, 59, 59);

    if (now <= regEnd) {
        return { status: 'regular' };
    } else {
        // ?꾩썡 留먯씪 ?댄썑?먮뒗 ?湲곗옄 ?좎껌
        return { status: 'waiting' };
    }
}

/* --- Bulk Register Executives --- */
const GOLF_SCHEDULE = [
    { month: '3??, date: '3.25' },
    { month: '4??, date: '4.22' },
    { month: '5??, date: '5.27' },
    { month: '6??, date: '6.24' },
    { month: '7??, date: '7.22' },
    { month: '9??, date: '9.30' },
    { month: '10??, date: '10.28' },
    { month: '11??, date: '11.25' }
];

function bulkRegisterExecutives() {
    const members = JSON.parse(localStorage.getItem('snu_golf_members') || '[]');
    const executives = members.filter(m => m.type === 'executive');

    if (executives.length === 0) {
        alert("?깅줉???꾩썝吏꾩씠 ?놁뒿?덈떎. 癒쇱? ?꾩썝???깅줉?댁＜?몄슂.");
        return;
    }

    const rsvps = JSON.parse(localStorage.getItem('snu_golf_rsvps') || '[]');
    let addCount = 0;

    GOLF_SCHEDULE.forEach(round => {
        executives.forEach(exec => {
            // Check if already registered for this specific round
            const isExists = rsvps.some(r => r.name === exec.name && r.month === round.month && r.date === round.date);

            if (!isExists) {
                rsvps.push({
                    name: exec.name,
                    phone: '',
                    status: 'attend',
                    sponsor: '',
                    month: round.month,
                    date: round.date,
                    isWaiting: false,
                    submittedAt: new Date().toISOString()
                });
                addCount++;
            }
        });
    });

    if (addCount > 0) {
        localStorage.setItem('snu_golf_rsvps', JSON.stringify(rsvps));
        alert(`珥?${addCount}嫄댁쓽 ?꾩썝吏?李몄꽍 ?좎껌???꾨즺?섏뿀?듬땲??`);
        loadAdminData();
        renderPublicRSVPs();
    } else {
        alert("?대? 紐⑤뱺 ?꾩썝吏꾩씠 ?깅줉?섏뼱 ?덉뒿?덈떎.");
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

            alert('?곗씠?곌? ?깃났?곸쑝濡?蹂듭썝?섏뿀?듬땲?? ?섏씠吏瑜??덈줈怨좎묠?⑸땲??');
            location.reload();
        } catch (err) {
            alert('?곗씠??蹂듭썝 以??ㅻ쪟媛 諛쒖깮?덉뒿?덈떎. ?щ컮瑜?諛깆뾽 ?뚯씪?몄? ?뺤씤?댁＜?몄슂.');
        }
    };
    reader.readAsText(file);
}
/* --- Attendance Management --- */
function deleteRSVP(index) {
    if (!confirm("?뺣쭚 ???좎껌 ?댁뿭????젣?섏떆寃좎뒿?덇퉴? (遺덉갭 泥섎━? ?숈씪)")) return;

    const data = JSON.parse(localStorage.getItem('snu_golf_rsvps') || '[]');
    data.splice(index, 1);
    localStorage.setItem('snu_golf_rsvps', JSON.stringify(data));

    loadAdminData();
    renderPublicRSVPs();
}
