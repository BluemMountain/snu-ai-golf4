/**
 * Magazine Style Round Log Logic - Multi-Image Version
 * Features: Supabase (round_logs), Multi-Cloudinary Upload, Editorial Lightbox with Gallery, Edit/Delete
 */

// Cloudinary Config
const CLOUDINARY_CONFIG = {
    cloudName: 'dbbz6xmot',
    uploadPreset: 'kghs-89f-golf_preset'
};

let db = window.supabaseClient;
let currentGalleryImages = [];
let currentImageIndex = 0;
let currentLogData = null; // 현재 라이트박스에 표시된 로그 데이터
let editingImageUrls = []; // 수정 시 기존 이미지를 임시 보관할 변수
let gallerySwiper = null; // Swiper 인스턴스

/**
 * Cloudinary URL Optimization Helper
 */
function getOptimizedUrl(url, width = 1200) {
    if (!url || !url.includes('cloudinary.com')) return url;
    // Insert transformation after /upload/
    if (url.includes('/upload/')) {
        return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`);
    }
    return url;
}

document.addEventListener('DOMContentLoaded', async () => {
    // Initialize Supabase if not global
    if (!db && window.supabase && typeof SUPABASE_CONFIG !== 'undefined') {
        db = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);
    }

    if (db) {
        loadRoundLogs();
        initGalleryUI();
    } else {
        console.error('Supabase client failure');
        alert('데이터베이스 연결에 실패했습니다.');
    }
});

/**
 * Load logs from round_logs table
 */
async function loadRoundLogs() {
    const grid = document.getElementById('round-logs-grid');
    if (!grid) return;

    try {
        const { data, error } = await db
            .from('round_logs')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        grid.innerHTML = '';

        if (!data || data.length === 0) {
            grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 100px; font-family: serif; font-style: italic; color: #888;">No editorial entries yet. Be the first to publish.</div>';
            return;
        }

        data.forEach(log => {
            const card = createLogCard(log);
            grid.appendChild(card);
        });

    } catch (err) {
        console.error('Fetch error:', err);
        grid.innerHTML = '<div class="magazine-loader">Error loading stories.</div>';
    }
}

/**
 * Create a magazine-style log card
 */
function createLogCard(log) {
    const card = document.createElement('div');
    card.className = 'log-card';

    // Support both old image_url and new image_urls (array)
    const images = log.image_urls || (log.image_url ? [log.image_url] : []);
    const mainImg = getOptimizedUrl(images[0], 600) || 'https://via.placeholder.com/800x1000?text=Editorial+Preview';
    const isMulti = images.length > 1;

    // Format date
    const dateStr = log.date || new Date(log.created_at).toLocaleDateString('ko-KR');

    card.innerHTML = `
        <div class="log-image-wrapper">
            <img src="${mainImg}" alt="${log.location}" loading="lazy">
            ${isMulti ? `<div class="multi-indicator">+${images.length - 1}</div>` : ''}
        </div>
        <div class="log-card-info">
            <div class="log-meta">${dateStr} / ${log.location}</div>
            <h3 class="log-location-title">${log.location}</h3>
            <p class="log-quote-short">"${log.quote || 'No caption provided.'}"</p>
        </div>
    `;

    card.addEventListener('click', () => openLightbox(log));
    return card;
}

/**
 * UI Interactions
 */
function initGalleryUI() {
    const modal = document.getElementById('upload-modal');
    const openBtn = document.getElementById('open-upload-btn');
    const closeBtn = document.querySelector('.magazine-modal-close');
    const form = document.getElementById('round-log-form');
    const fileInput = document.getElementById('log-file');
    const fileDisplay = document.getElementById('file-count-display');

    // Show file count when selected
    if (fileInput && fileDisplay) {
        fileInput.onchange = (e) => {
            const count = e.target.files.length;
            if (count > 0) {
                fileDisplay.innerText = `${count}장의 사진이 선택되었습니다.`;
                fileDisplay.classList.remove('hidden');
            } else {
                fileDisplay.classList.add('hidden');
            }
        };
    }

    if (openBtn) {
        openBtn.onclick = () => {
            const isLoggedIn = sessionStorage.getItem('snu_golf_logged_in') === 'true';
            const isAdminMode = sessionStorage.getItem('snu_golf_admin_logged_in') === 'true';

            if (!isLoggedIn && !isAdminMode) {
                alert('로그인이 필요한 기능입니다. 메인 페이지에서 로그인 혹은 관리자 로그인을 진행해 주세요.');
                return;
            }
            // Reset for new entry
            form.reset();
            document.getElementById('log-edit-id').value = '';
            document.getElementById('submit-log').innerText = 'PUBLISH TO LOG';
            fileDisplay.classList.add('hidden');

            // Auto-fill user name if stored
            const savedName = localStorage.getItem('snu_golf_user_name');
            if (savedName) document.getElementById('log-name').value = savedName;

            modal.style.display = 'block';
            document.body.style.overflow = 'hidden';
        };
    }

    if (closeBtn) {
        closeBtn.onclick = () => {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        };
    }

    window.onclick = (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
        if (e.target === document.getElementById('lightbox-modal')) closeLightbox();
    };

    // Lightbox Controls
    document.getElementById('lb-prev-btn').onclick = () => { if (gallerySwiper) gallerySwiper.slidePrev(); };
    document.getElementById('lb-next-btn').onclick = () => { if (gallerySwiper) gallerySwiper.slideNext(); };
    document.querySelector('.lightbox-close').onclick = closeLightbox;
    document.getElementById('lb-edit-btn').onclick = () => handleLogEdit();
    document.getElementById('lb-delete-btn').onclick = () => handleLogDelete();

    // Form Submit
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            handleLogUpload(form);
        };
    }
}

/**
 * Handle Multi-Upload (Update or Insert)
 */
async function handleLogUpload(form) {
    const submitBtn = document.getElementById('submit-log');
    const statusDiv = document.getElementById('upload-status');
    const statusText = document.getElementById('status-text');
    const fileInput = document.getElementById('log-file');
    const files = fileInput.files;
    const editId = document.getElementById('log-edit-id').value;

    // If editing, photos are optional. If new, they are required.
    if (!editId && files.length === 0) return alert('사진을 선택해주세요.');

    submitBtn.disabled = true;
    statusDiv.classList.remove('hidden');

    try {
        let imageUrls = editId ? [...editingImageUrls] : [];

        // 1. Upload new photos if selected
        if (files.length > 0) {
            for (let i = 0; i < files.length; i++) {
                statusText.innerText = `Uploading Picture ${i + 1}/${files.length}...`;
                const url = await uploadToCloudinary(files[i]);
                imageUrls.push(url);
            }
        }

        statusText.innerText = 'Publishing to SNU Editorial...';

        const formData = new FormData(form);
        const logData = {
            date: formData.get('date'),
            location: formData.get('location'),
            quote: formData.get('quote'),
            companions: formData.get('companions'),
            weather: formData.get('weather'),
            user_name: formData.get('user_name'),
            image_urls: imageUrls
        };

        // Store user name locally for future identification
        if (logData.user_name) {
            localStorage.setItem('snu_golf_user_name', logData.user_name);
            sessionStorage.setItem('snu_golf_user_name', logData.user_name);
        }

        if (editId) {
            // UPDATE
            const { error } = await db.from('round_logs').update(logData).eq('id', editId);
            if (error) throw error;
            alert('기록이 수정되었습니다.');
        } else {
            // INSERT
            const { error } = await db.from('round_logs').insert([logData]);
            if (error) throw error;
            alert('뉴 에디토리얼이 성공적으로 발행되었습니다!');
        }

        form.reset();
        editingImageUrls = []; // Clear after use
        document.getElementById('upload-modal').style.display = 'none';
        document.body.style.overflow = 'auto';
        loadRoundLogs();

    } catch (err) {
        console.error('Upload Error:', err);
        alert('작업 실패: ' + err.message);
    } finally {
        submitBtn.disabled = false;
        statusDiv.classList.add('hidden');
    }
}

async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`, {
        method: 'POST',
        body: formData
    });

    if (!res.ok) throw new Error('Cloudinary Upload Failed');
    const data = await res.json();
    return data.secure_url;
}

/**
 * Lightbox Gallery Logic
 */
function openLightbox(log) {
    currentLogData = log;
    const lb = document.getElementById('lightbox-modal');
    const swiperWrapper = document.getElementById('lb-swiper-wrapper');

    // Support legacy and multi
    currentGalleryImages = log.image_urls || (log.image_url ? [log.image_url] : []);
    currentImageIndex = 0;

    // Build Swiper Slides
    swiperWrapper.innerHTML = currentGalleryImages.map((url, idx) => `
        <div class="swiper-slide">
            <div class="lb-gallery-main">
                <img src="${getOptimizedUrl(url, 1200)}" loading="lazy" alt="Gallery Image ${idx + 1}">
                <div class="swiper-lazy-preloader swiper-lazy-preloader-white"></div>
            </div>
        </div>
    `).join('');

    // Initialize or Update Swiper
    if (gallerySwiper) {
        gallerySwiper.destroy();
    }
    
    gallerySwiper = new Swiper('.swiper', {
        loop: currentGalleryImages.length > 1,
        lazyPreloadPrevNext: 1, // Preload 1 slide before and after
        navigation: {
            nextEl: '#lb-next-btn',
            prevEl: '#lb-prev-btn',
        },
        on: {
            init: function () {
                updateCounter(this.realIndex + 1);
            },
            slideChange: function () {
                updateCounter(this.realIndex + 1);
            }
        }
    });

    document.getElementById('lb-date').innerText = log.date || new Date(log.created_at).toLocaleDateString('ko-KR');
    document.getElementById('lb-location').innerText = log.location;
    document.getElementById('lb-quote').innerText = `"${log.quote || ''}"`;
    document.getElementById('lb-companions').innerText = log.companions || '-';
    document.getElementById('lb-weather').innerText = log.weather || '-';
    document.getElementById('lb-user').innerText = log.user_name || 'Anonymous';
    document.getElementById('lb-likes').innerText = log.likes_count || 0;

    const likeBtn = document.getElementById('lb-like-btn');
    likeBtn.onclick = () => handleLike(log.id);

    // Fetch and display awards for this round
    fetchRoundAwards(log.date || "");

    // Permission Check: Show/Hide Edit/Delete buttons
    const currentUserName = sessionStorage.getItem('snu_golf_user_name') || localStorage.getItem('snu_golf_user_name');
    const isLoggedIn = sessionStorage.getItem('snu_golf_logged_in') === 'true';
    const isAdminMode = sessionStorage.getItem('snu_golf_admin_logged_in') === 'true';
    const controls = document.getElementById('lb-admin-controls');

    if (isAdminMode || (isLoggedIn && currentUserName === log.user_name)) {
        controls.classList.remove('hidden');
    } else {
        controls.classList.add('hidden');
    }

    // Show/Hide Nav Buttons
    const hasMultiple = currentGalleryImages.length > 1;
    document.getElementById('lb-prev-btn').style.display = hasMultiple ? 'flex' : 'none';
    document.getElementById('lb-next-btn').style.display = hasMultiple ? 'flex' : 'none';
    document.getElementById('lb-counter').style.display = hasMultiple ? 'block' : 'none';

    lb.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function updateCounter(index) {
    const counterEl = document.getElementById('lb-counter');
    if (counterEl) {
        counterEl.innerText = `${index} / ${currentGalleryImages.length}`;
    }
}

function closeLightbox() {
    document.getElementById('lightbox-modal').style.display = 'none';
    document.body.style.overflow = 'auto';
    currentLogData = null;
}

/**
 * Handle Edit Button
 */
function handleLogEdit() {
    if (!currentLogData) return;

    const modal = document.getElementById('upload-modal');
    const form = document.getElementById('round-log-form');

    // Fill form
    document.getElementById('log-edit-id').value = currentLogData.id;
    document.getElementById('log-date').value = currentLogData.date || '';
    document.getElementById('log-location').value = currentLogData.location || '';
    document.getElementById('log-quote').value = currentLogData.quote || '';
    document.getElementById('log-companions').value = currentLogData.companions || '';
    document.getElementById('log-weather').value = currentLogData.weather || '';
    document.getElementById('log-name').value = currentLogData.user_name || '';

    // Change submit button text
    document.getElementById('submit-log').innerText = 'UPDATE EDITORIAL';

    // Photos are optional during edit
    document.getElementById('log-file').required = false;

    // Backup existing images BEFORE closing lightbox
    editingImageUrls = currentLogData.image_urls || (currentLogData.image_url ? [currentLogData.image_url] : []);

    closeLightbox();
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

/**
 * Handle Delete Button
 */
async function handleLogDelete() {
    if (!currentLogData) return;

    if (!confirm('이 기록을 영구적으로 삭제하시겠습니까?')) return;

    try {
        const { error } = await db.from('round_logs').delete().eq('id', currentLogData.id);
        if (error) throw error;

        alert('삭제되었습니다.');
        closeLightbox();
        loadRoundLogs();
    } catch (err) {
        console.error('Delete error:', err);
        alert('삭제 실패: ' + err.message);
    }
}

async function handleLike(logId) {
    try {
        const { data: current } = await db.from('round_logs').select('likes_count').eq('id', logId).single();
        await db.from('round_logs').update({ likes_count: (current.likes_count || 0) + 1 }).eq('id', logId);

        const countSpan = document.getElementById('lb-likes');
        countSpan.innerText = parseInt(countSpan.innerText) + 1;
    } catch (err) {
        console.error('Like error:', err);
    }
}

/**
 * Fetch and display award winners for a specific round from rsvps table
 */
async function fetchRoundAwards(dateStr) {
    const awardsSection = document.getElementById('lb-awards-section');
    const awardsList = document.getElementById('lb-awards-list');
    
    if (!awardsSection || !awardsList || !dateStr) {
        if (awardsSection) awardsSection.classList.add('hidden');
        return;
    }

    // Reset UI
    awardsSection.classList.add('hidden');
    awardsList.innerHTML = '<div style="text-align:center; padding: 20px; color: #AAA;">Loading awards...</div>';

    try {
        // Parse date (e.g., "2026.04.22" -> month: "4월", date: "4.22")
        let month = "";
        let dayPart = "";

        const parts = dateStr.split('.');
        if (parts.length >= 3) {
            month = parseInt(parts[1]) + "월";
            dayPart = parseInt(parts[1]) + "." + parseInt(parts[2]);
        } else if (parts.length === 2) {
             // Handle "4.22" format if year is missing
             month = parseInt(parts[0]) + "월";
             dayPart = dateStr;
        } else {
            // Handle "4월 22일" format
            const match = dateStr.match(/(\d+)월\s*(\d+)/);
            if (match) {
                month = match[1] + "월";
                dayPart = match[1] + "." + match[2];
            }
        }

        if (!month || !dayPart) {
            awardsSection.classList.add('hidden');
            return;
        }

        // Handle March date mismatch (Gallery: 3.24, RSVP: 3.25)
        let searchDates = [dayPart];
        if (month === "3월" && dayPart === "3.24") {
            searchDates.push("3.25");
        }

        console.log(`Fetching awards for Round: ${month}, Dates: ${searchDates.join(', ')}`);

        // Query rsvps table
        const { data, error } = await db
            .from('rsvps')
            .select('name, roundaward')
            .eq('month', month)
            .in('date', searchDates)
            .not('roundaward', 'is', null)
            .not('roundaward', 'eq', '');

        if (error) throw error;

        if (data && data.length > 0) {
            // User Specified Order
            const awardOrder = [
                "메달",        // 메달리스트, 메달
                "신페리오",     // 신페리오 우승, 신페리오우승
                "롱기스트",
                "니어리스트", 
                "다버디",
                "다파",
                "다보기",
                "더보기",
                "다더블",      // 다더블, 다따블
                "다따블",
                "행운상"
            ];

            // Sort by awardOrder
            data.sort((a, b) => {
                const getOrder = (awardStr) => {
                    const normalized = awardStr.replace(/\s+/g, ""); // Remove spaces
                    const idx = awardOrder.findIndex(keyword => normalized.includes(keyword));
                    return idx === -1 ? 999 : idx;
                };
                return getOrder(a.roundaward) - getOrder(b.roundaward);
            });

            awardsList.innerHTML = data.map(item => {
                // Parse award string: "[1위] 메달리스트" -> title: "메달리스트", rank: "[1위]"
                const match = item.roundaward.match(/(\[.*?\])?\s*(.*)/);
                const rank = match && match[1] ? match[1] : "";
                const title = match && match[2] ? match[2].trim() : item.roundaward.trim();

                // Clean up title (remove rank if it's already in the title)
                const displayTitle = title || rank;
                const displayName = item.name;

                return `
                    <div class="award-item">
                        <span class="award-title">${displayTitle}</span>
                        <span class="award-name">${displayName}</span>
                    </div>
                `;
            }).join('');
            
            awardsSection.classList.remove('hidden');
        } else {
            awardsSection.classList.add('hidden');
        }
    } catch (err) {
        console.error('Error fetching awards:', err);
        awardsSection.classList.add('hidden');
    }
}

