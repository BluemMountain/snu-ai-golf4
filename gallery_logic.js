/**
 * Magazine Style Round Log Logic
 * Features: Supabase (round_logs), Cloudinary Upload, Editorial Lightbox
 */

// Cloudinary Config
const CLOUDINARY_CONFIG = {
    cloudName: 'dbbz6xmot',
    uploadPreset: 'kghs-89f-golf_preset'
};

let db = window.supabaseClient;

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

    // Format date for meta
    const dateStr = log.date || new Date(log.created_at).toLocaleDateString('ko-KR');

    card.innerHTML = `
        <div class="log-image-wrapper">
            <img src="${log.image_url}" alt="${log.location}" loading="lazy" onerror="this.src='https://via.placeholder.com/800x1000?text=Editorial+Preview'">
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

    // Only show upload for logged in users
    const isLoggedIn = sessionStorage.getItem('snu_golf_logged_in') === 'true';
    if (!isLoggedIn && openBtn) {
        openBtn.style.display = 'none';
    }

    if (openBtn) {
        openBtn.onclick = () => modal.style.display = 'block';
    }

    if (closeBtn) {
        closeBtn.onclick = () => modal.style.display = 'none';
    }

    window.onclick = (e) => {
        if (e.target === modal) modal.style.display = 'none';
        if (e.target === document.getElementById('lightbox-modal')) closeLightbox();
    };

    // Close Lightbox
    const lbClose = document.querySelector('.lightbox-close');
    if (lbClose) lbClose.onclick = closeLightbox;

    // Form Submit
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            handleLogUpload(form);
        };
    }
}

/**
 * Handle Upload Process
 */
async function handleLogUpload(form) {
    const submitBtn = document.getElementById('submit-log');
    const statusDiv = document.getElementById('upload-status');
    const statusText = document.getElementById('status-text');
    const file = document.getElementById('log-file').files[0];

    if (!file) return alert('사진을 선택해주세요.');

    // Start UI Animation
    submitBtn.disabled = true;
    statusDiv.classList.remove('hidden');
    statusText.innerText = 'Publishing to Clouds...';

    try {
        // 1. Cloudinary Upload
        const imageUrl = await uploadToCloudinary(file);

        statusText.innerText = 'Saving Editorial Metadata...';

        // 2. Supabase Save
        const formData = new FormData(form);
        const logData = {
            date: formData.get('date'),
            location: formData.get('location'),
            quote: formData.get('quote'),
            companions: formData.get('companions'),
            weather: formData.get('weather'),
            user_name: formData.get('user_name'),
            image_url: imageUrl
        };

        const { error } = await db.from('round_logs').insert([logData]);
        if (error) throw error;

        // Success
        alert('뉴 에디토리얼이 성공적으로 발행되었습니다!');
        form.reset();
        document.getElementById('upload-modal').style.display = 'none';
        loadRoundLogs();

    } catch (err) {
        console.error('Upload Error:', err);
        alert('발행 실패: ' + err.message);
    } finally {
        submitBtn.disabled = false;
        statusDiv.classList.add('hidden');
    }
}

/**
 * Cloudinary Helper
 */
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
 * Lightbox Logic
 */
function openLightbox(log) {
    const lb = document.getElementById('lightbox-modal');
    document.getElementById('lb-image').src = log.image_url;
    document.getElementById('lb-date').innerText = log.date || new Date(log.created_at).toLocaleDateString('ko-KR');
    document.getElementById('lb-location').innerText = log.location;
    document.getElementById('lb-quote').innerText = `"${log.quote || ''}"`;
    document.getElementById('lb-companions').innerText = log.companions || '-';
    document.getElementById('lb-weather').innerText = log.weather || '-';
    document.getElementById('lb-user').innerText = log.user_name || 'Anonymous';
    document.getElementById('lb-likes').innerText = log.likes_count || 0;

    // Like button logic
    const likeBtn = document.getElementById('lb-like-btn');
    likeBtn.onclick = () => handleLike(log.id);

    lb.style.display = 'block';
    document.body.style.overflow = 'hidden'; // Block scroll
}

function closeLightbox() {
    document.getElementById('lightbox-modal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

async function handleLike(logId) {
    try {
        // Increment in DB
        const { data, error } = await db.rpc('increment_likes', { row_id: logId });

        // If RPC not available, fallback to simple update (note: better to have RPC for atomicity)
        if (error) {
            // Manual fetch and update as fallback
            const { data: current } = await db.from('round_logs').select('likes_count').eq('id', logId).single();
            await db.from('round_logs').update({ likes_count: (current.likes_count || 0) + 1 }).eq('id', logId);
        }

        // Refresh count UI
        const countSpan = document.getElementById('lb-likes');
        countSpan.innerText = parseInt(countSpan.innerText) + 1;

    } catch (err) {
        console.error('Like error:', err);
    }
}
