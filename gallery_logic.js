/**
 * Magazine Style Round Log Logic - Multi-Image Version
 * Features: Supabase (round_logs), Multi-Cloudinary Upload, Editorial Lightbox with Gallery
 */

// Cloudinary Config
const CLOUDINARY_CONFIG = {
    cloudName: 'dbbz6xmot',
    uploadPreset: 'kghs-89f-golf_preset'
};

let db = window.supabaseClient;
let currentGalleryImages = [];
let currentImageIndex = 0;

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
    const mainImg = images[0] || 'https://via.placeholder.com/800x1000?text=Editorial+Preview';
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
            if (!isLoggedIn) {
                alert('로그인이 필요한 기능입니다. 메인 페이지에서 로그인해 주세요.');
                return;
            }
            modal.style.display = 'block';
            document.body.style.overflow = 'hidden'; // Stop main scroll when modal open
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
    document.getElementById('lb-prev-btn').onclick = () => navigateGallery(-1);
    document.getElementById('lb-next-btn').onclick = () => navigateGallery(1);
    document.querySelector('.lightbox-close').onclick = closeLightbox;

    // Form Submit
    if (form) {
        form.onsubmit = async (e) => {
            e.preventDefault();
            handleLogUpload(form);
        };
    }
}

/**
 * Handle Multi-Upload Process
 */
async function handleLogUpload(form) {
    const submitBtn = document.getElementById('submit-log');
    const statusDiv = document.getElementById('upload-status');
    const statusText = document.getElementById('status-text');
    const fileInput = document.getElementById('log-file');
    const files = fileInput.files;

    if (files.length === 0) return alert('사진을 선택해주세요.');

    submitBtn.disabled = true;
    statusDiv.classList.remove('hidden');

    try {
        const imageUrls = [];
        for (let i = 0; i < files.length; i++) {
            statusText.innerText = `Uploading Picture ${i + 1}/${files.length}...`;
            const url = await uploadToCloudinary(files[i]);
            imageUrls.push(url);
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
            image_urls: imageUrls // Array support
        };

        const { error } = await db.from('round_logs').insert([logData]);
        if (error) throw error;

        alert('뉴 에디토리얼이 성공적으로 발행되었습니다!');
        form.reset();
        document.getElementById('file-count-display').classList.add('hidden');
        document.getElementById('upload-modal').style.display = 'none';
        document.body.style.overflow = 'auto';
        loadRoundLogs();

    } catch (err) {
        console.error('Upload Error:', err);
        alert('발행 실패: ' + err.message);
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
    const lb = document.getElementById('lightbox-modal');

    // Support legacy and multi
    currentGalleryImages = log.image_urls || (log.image_url ? [log.image_url] : []);
    currentImageIndex = 0;

    updateLightboxView();

    document.getElementById('lb-date').innerText = log.date || new Date(log.created_at).toLocaleDateString('ko-KR');
    document.getElementById('lb-location').innerText = log.location;
    document.getElementById('lb-quote').innerText = `"${log.quote || ''}"`;
    document.getElementById('lb-companions').innerText = log.companions || '-';
    document.getElementById('lb-weather').innerText = log.weather || '-';
    document.getElementById('lb-user').innerText = log.user_name || 'Anonymous';
    document.getElementById('lb-likes').innerText = log.likes_count || 0;

    const likeBtn = document.getElementById('lb-like-btn');
    likeBtn.onclick = () => handleLike(log.id);

    // Show/Hide Nav Buttons
    const hasMultiple = currentGalleryImages.length > 1;
    document.getElementById('lb-prev-btn').style.display = hasMultiple ? 'flex' : 'none';
    document.getElementById('lb-next-btn').style.display = hasMultiple ? 'flex' : 'none';
    document.getElementById('lb-counter').style.display = hasMultiple ? 'block' : 'none';

    lb.style.display = 'block';
    document.body.style.overflow = 'hidden';
}

function updateLightboxView() {
    const imgEl = document.getElementById('lb-image');
    imgEl.src = currentGalleryImages[currentImageIndex] || '';

    const counterEl = document.getElementById('lb-counter');
    counterEl.innerText = `${currentImageIndex + 1} / ${currentGalleryImages.length}`;
}

function navigateGallery(dir) {
    currentImageIndex += dir;
    if (currentImageIndex < 0) currentImageIndex = currentGalleryImages.length - 1;
    if (currentImageIndex >= currentGalleryImages.length) currentImageIndex = 0;
    updateLightboxView();
}

function closeLightbox() {
    document.getElementById('lightbox-modal').style.display = 'none';
    document.body.style.overflow = 'auto';
}

async function handleLike(logId) {
    try {
        // Fallback simple update if RPC not found
        const { data: current } = await db.from('round_logs').select('likes_count').eq('id', logId).single();
        await db.from('round_logs').update({ likes_count: (current.likes_count || 0) + 1 }).eq('id', logId);

        const countSpan = document.getElementById('lb-likes');
        countSpan.innerText = parseInt(countSpan.innerText) + 1;
    } catch (err) {
        console.error('Like error:', err);
    }
}
