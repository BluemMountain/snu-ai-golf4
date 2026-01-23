/**
 * Gallery & Lounge Logic (Cloudinary version)
 * Handles photo listing, Cloudinary uploads, and Supabase metadata.
 */

// Cloudinary Config (User values should be replaced here)
const CLOUDINARY_CONFIG = {
    cloudName: 'dbbz6xmot', // 사용자가 제공한 실제 값 적용
    uploadPreset: 'kghs-89f-golf_preset' // 사용자가 제공한 실제 값 적용 (unsigned)
};

let db = window.supabaseClient;
let currentTab = 'round';

document.addEventListener('DOMContentLoaded', async () => {
    // If global client not ready, initialize local one (matching script.js logic)
    if (!db && window.supabase && typeof SUPABASE_CONFIG !== 'undefined') {
        db = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);
    }

    if (db) {
        initGalleryTabs();
        loadGalleryPosts(currentTab);
        initUploadUI();
    } else {
        console.error('Supabase client failed to initialize.');
        alert('데이터베이스 연결에 실패했습니다. 페이지를 새로고침해 주세요.');
    }
});

function initGalleryTabs() {
    const tabs = document.querySelectorAll('.gallery-tabs .tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentTab = tab.dataset.category;
            loadGalleryPosts(currentTab);
        });
    });
}

async function loadGalleryPosts(category) {
    const galleryGrid = document.querySelector('.gallery-grid');
    if (!galleryGrid) return;

    galleryGrid.innerHTML = '<div class="loading-spinner">갤러리를 불러오는 중입니다...</div>';

    try {
        const { data, error } = await db
            .from('gallery_posts')
            .select('*')
            .eq('category', category)
            .order('created_at', { ascending: false });

        if (error) throw error;

        galleryGrid.innerHTML = '';

        if (!data || data.length === 0) {
            galleryGrid.innerHTML = `<div style="text-align:center; padding: 40px; color:#666; width:100%;">
                ${category === 'round' ? '아직 등록된 라운드 사진이 없습니다.' : '아직 등록된 게시글이 없습니다.'}<br>
                첫 주인공이 되어보세요!
            </div>`;
            return;
        }

        data.forEach(post => {
            const postElement = createPostElement(post);
            galleryGrid.appendChild(postElement);
        });

    } catch (err) {
        console.error('Error loading gallery posts:', err);
        galleryGrid.innerHTML = '<div class="error-msg">갤러리를 불러오지 못했습니다.</div>';
    }
}

function createPostElement(post) {
    const item = document.createElement('div');
    item.className = 'gallery-item fade-in-up visible';

    const dateStr = new Date(post.created_at).toLocaleDateString('ko-KR');

    item.innerHTML = `
        <img src="${post.image_url}" alt="${post.caption || '갤러리 이미지'}" onerror="this.src='https://via.placeholder.com/800x600?text=이미지 로딩 실패'">
        <div class="gallery-item-content">
            <div class="gallery-item-user">
                <div class="user-avatar">${post.user_avatar || (post.user_name ? post.user_name.substring(0, 1) : 'U')}</div>
                <span class="user-name">${post.user_name}</span>
            </div>
            <p class="gallery-item-caption">${post.caption || ''}</p>
            <div class="gallery-item-footer">
                <span><i class="far fa-heart"></i> ${post.likes_count || 0}</span>
                <span>${dateStr}</span>
            </div>
        </div>
    `;

    item.addEventListener('click', () => {
        // Post detail logic if needed
    });
    return item;
}

function initUploadUI() {
    const uploadBtn = document.querySelector('.upload-btn-fixed');
    const modal = document.getElementById('upload-modal');
    const closeBtn = document.querySelector('.upload-close');
    const form = document.getElementById('upload-form');

    if (!uploadBtn || !modal) return;

    // Check login status (Consistent with original logic)
    const isLoggedIn = sessionStorage.getItem('snu_golf_logged_in') === 'true';
    if (!isLoggedIn) {
        uploadBtn.style.display = 'none';
        return;
    }

    uploadBtn.onclick = () => {
        modal.style.display = 'block';
        // Set default category to current tab
        const categoryRadio = form.querySelector(`input[name="upload-category"][value="${currentTab}"]`);
        if (categoryRadio) categoryRadio.checked = true;
    };

    closeBtn.onclick = () => modal.style.display = 'none';
    window.onclick = (event) => { if (event.target == modal) modal.style.display = 'none'; };

    form.onsubmit = async (e) => {
        e.preventDefault();

        const submitBtn = document.getElementById('submit-upload');
        const fileInput = document.getElementById('upload-file');
        const file = fileInput.files[0];
        const name = document.getElementById('upload-name').value;
        const caption = document.getElementById('upload-caption').value;
        const category = form.querySelector('input[name="upload-category"]:checked').value;

        if (!file) return alert('사진을 선택해주세요.');

        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> 업로드 중...';

        try {
            // 1. Upload to Cloudinary
            const imageUrl = await uploadToCloudinary(file);

            // 2. Save Metadata to Supabase
            const { error: dbError } = await db
                .from('gallery_posts')
                .insert([{
                    user_name: name,
                    image_url: imageUrl,
                    caption: caption || '',
                    category: category,
                    user_avatar: name.substring(0, 1)
                }]);

            if (dbError) throw dbError;

            alert('사진이 성공적으로 업로드되었습니다!');
            modal.style.display = 'none';
            form.reset();
            loadGalleryPosts(currentTab);

        } catch (err) {
            console.error('Upload failed:', err);
            alert('업로드 실패: ' + (err.message || '알 수 없는 오류'));
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-cloud-upload-alt"></i> 업로드 하기';
        }
    };
}

async function uploadToCloudinary(file) {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);

    const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`, {
        method: 'POST',
        body: formData
    });

    if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error.message || 'Cloudinary 업로드 실패');
    }

    const data = await response.json();
    return data.secure_url;
}

