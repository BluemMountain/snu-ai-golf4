/**
 * Gallery & Lounge Logic
 * Handles photo listing, uploads, and real-time comments using Supabase.
 */

// Placeholder for user session (In a real app, this would come from Supabase Auth)
let currentUser = {
    id: 'guest-id', // Placeholder
    name: '익명 원우님',
    avatar: 'SN'
};

// Supabase Fallback Config (in case script.js global is missing)
const SUPABASE_CONFIG = {
    url: 'https://qfzmwlyqezmkkxtpscik.supabase.co',
    key: 'sb_publishable_mYejtROOg-2JN7z6_RlWdg_PXYSYgFi'
};

let db = window.supabaseClient;

document.addEventListener('DOMContentLoaded', async () => {
    // If global client not ready, initialize local one
    if (!db && window.supabase) {
        db = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);
    }

    if (db) {
        loadGalleryPosts();
        initGalleryUI();
    } else {
        console.error('Supabase client failed to initialize.');
        alert('데이터베이스 연결에 실패했습니다. 페이지를 새로고침해 주세요.');
    }
});

async function loadGalleryPosts() {
    const galleryGrid = document.querySelector('.gallery-grid');
    if (!galleryGrid) return;

    // Show loading state
    galleryGrid.innerHTML = '<div class="loading-spinner">갤러리를 불러오는 중입니다...</div>';

    try {
        const { data, error } = await db
            .from('gallery_posts')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        galleryGrid.innerHTML = '';

        if (!data || data.length === 0) {
            galleryGrid.innerHTML = '<div style="text-align:center; padding: 40px; color:#666; width:100%;">아직 등록된 사진이 없습니다. 첫 주인공이 되어보세요!</div>';
            renderPlaceholders(galleryGrid); // Fallback to mocks for design
            return;
        }

        data.forEach(post => {
            const postElement = createPostElement(post);
            galleryGrid.appendChild(postElement);
        });

    } catch (err) {
        console.error('Error loading gallery posts:', err);
        galleryGrid.innerHTML = '<div class="error-msg">갤러리를 불러오지 못했습니다.</div>';
        renderPlaceholders(galleryGrid); // Fallback to placeholders
    }
}

function createPostElement(post) {
    const item = document.createElement('div');
    item.className = 'gallery-item fade-in-on-scroll visible';

    // Simple date formatting
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
                <span><i class="far fa-comment"></i> 0</span>
                <span>${dateStr}</span>
            </div>
        </div>
    `;

    item.addEventListener('click', () => openPostDetail(post));
    return item;
}

function renderPlaceholders(container) {
    // Re-use the mockup design if no real data yet
    container.innerHTML = `
        <div class="gallery-item visible">
            <img src="https://images.unsplash.com/photo-1587174486073-ae5e5cff23aa?q=80&w=800&auto=format&fit=crop" alt="Mockup">
            <div class="gallery-item-content">
                <div class="gallery-item-user"><div class="user-avatar">KD</div><span class="user-name">김대욱 회장님</span></div>
                <p class="gallery-item-caption">아직 등록된 사진이 없습니다. 첫 주인공이 되어보세요!</p>
            </div>
        </div>
    `;
}

function initGalleryUI() {
    const uploadBtn = document.querySelector('.upload-btn-fixed');
    if (!uploadBtn) return;

    // Check login status
    const isLoggedIn = sessionStorage.getItem('snu_golf_logged_in') === 'true';

    // Hide button if not logged in
    if (!isLoggedIn) {
        uploadBtn.style.display = 'none';
        return;
    } else {
        uploadBtn.style.display = 'flex';
    }

    // Create a hidden file input
    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.style.display = 'none';
    document.body.appendChild(fileInput);

    uploadBtn.onclick = () => fileInput.click();

    fileInput.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const userName = prompt('원우님의 성함을 입력해주세요:', '');
        if (!userName) {
            alert('성함을 입력해 주셔야 사진을 올릴 수 있습니다.');
            return;
        }

        const caption = prompt('사진에 대한 설명을 입력해주세요 (선택사항):');

        // Disable button while uploading
        uploadBtn.disabled = true;
        uploadBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

        try {
            // 1. Upload to Supabase Storage
            const fileName = `${Date.now()}_${file.name}`;
            const { data: uploadData, error: uploadError } = await db
                .storage
                .from('gallery_images')
                .upload(fileName, file);

            if (uploadError) throw uploadError;

            // 2. Get Public URL
            const { data: urlData } = db
                .storage
                .from('gallery_images')
                .getPublicUrl(fileName);

            const imageUrl = urlData.publicUrl;

            // 3. Save to Database
            const { error: dbError } = await db
                .from('gallery_posts')
                .insert([{
                    user_name: userName,
                    image_url: imageUrl,
                    caption: caption || '',
                    user_avatar: userName.substring(0, 1) // First character as avatar
                }]);

            if (dbError) throw dbError;

            alert('사진이 성공적으로 업로드되었습니다!');
            location.reload();

        } catch (err) {
            console.error('Upload failed:', err);
            alert('업로드 실패: ' + (err.message || '알 수 없는 오류'));
        } finally {
            uploadBtn.disabled = false;
            uploadBtn.innerHTML = '<i class="fas fa-camera"></i>';
        }
    };
}

function openPostDetail(post) {
    // Expand view & comment logic
    console.log('Post Detail:', post);
    alert(`${post.user_name}님의 상호작용 기능이 곧 업데이트됩니다.`);
}
