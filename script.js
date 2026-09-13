// Supabase接続設定
const SUPABASE_URL = 'https://fgliaksecvlyoqxqoeet.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnbGlha3NlY3ZseW9xeHFvZWV0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwOTkyNjcsImV4cCI6MjEwNDY3NTI2N30.W_SaxY_uWWz2atiSIxGAAOQc9rx5CZ0mEKM0URZu8k0';
const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const map = L.map('map').setView([34.6937, 135.5023], 12);

L.tileLayer('https://cyberjapandata.gsi.go.jp/xyz/seamlessphoto/{z}/{x}/{y}.jpg', {
    attribution: '© 国土地理院'
}).addTo(map);

const btnMain = document.getElementById('btn-main');
const btnForm = document.getElementById('btn-form');
const mainSection = document.getElementById('main-section');
const formSection = document.getElementById('form-section');
const inputForm = document.getElementById('input-form');
const initialBtn = document.querySelector('.initial-btn');
const loginModal = document.getElementById('login-modal');
const btnAuth = document.getElementById('btn-auth');
const loginSubmitBtn = document.getElementById('login-submit-btn');
const loginCloseBtn = document.getElementById('login-close-btn');

document.getElementById('date').valueAsDate = new Date();

//霊場を日本語に
const jpreijo = {
    sitifuku: '大阪七福神めぐり',
    naniwa: 'なにわ七幸めぐり',
    shifudo: '大阪四不動霊場',
    jusan: 'おおさか十三仏霊場',
    kawauti: '河内西国霊場',
    izumi: '和泉西国霊場',
    nasi: ' '
};

//画面切り替えボタン押したとき
btnMain.addEventListener('click', () => {
    btnMain.classList.add('active');
    btnForm.classList.remove('active');
    mainSection.classList.remove('hidden');
    formSection.classList.add('hidden');

    setTimeout(() => {
        map.invalidateSize();
    }, 100);
});

btnForm.addEventListener('click', () => {
    btnMain.classList.remove('active');
    btnForm.classList.add('active');
    mainSection.classList.add('hidden');
    formSection.classList.remove('hidden');
});

//初期位置ボタンを押したとき
initialBtn.addEventListener('click', () => {
    map.flyTo([34.6937, 135.5023], 12, { duration: 0.5 });
});

//登録ボタン押したとき
inputForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const {data: {session}} = await supabaseClient.auth.getSession();
    if (!session) {
        alert('登録には管理者ログインが必要です')
        loginModal.classList.remove('hidden');
        return;
    }

    const name = document.getElementById('name').value;
    const date = document.getElementById('date').value;
    const reijo = document.getElementById('reijo').value;
    const mapurl = document.getElementById('mapurl').value;
    const memo = document.getElementById('memo').value;
    const photoFile = document.getElementById('photo').files[0];

    try {
        // 画像がある場合は圧縮してBase64化
        const photoBase64 = photoFile ? await compressImage(photoFile) : null;

        // supabaseへデータを挿入
        const { data, error } = await supabaseClient
            .from('meguri_items')
            .insert([{ name, date, reijo, mapurl, memo, photo_data: photoBase64 }])
            .select();

        if (error) {
            console.error('データ保存失敗:', error);
            alert('保存に失敗しました:\n' + error.message);
            return;
        }

        if (data && data.length > 0) {
            renderItemUI(data[0]);
        }

        inputForm.reset();
        document.getElementById('date').valueAsDate = new Date();

    } catch (err) {
        console.error('エラー発生:', err);
        alert('エラーが発生しました: ' + err.message);
    }
});

//スプラッシュ演出
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(() => {
        const splash = document.getElementById('splash-id');
        const mainTitle = document.getElementById('main-title');
        if(splash) {
            splash.classList.add('fade-out');
        }
        if(mainTitle) {
            mainTitle.classList.add('moved');
        }
    } ,2000);
    
    checkAuthUI();
    loadItems();
});

btnAuth.addEventListener('click', async () => {
    const {data:{session}} = await supabaseClient.auth.getSession();

    if (session) {
        await supabaseClient.auth.signOut();
        alert('ログアウトしました');
        checkAuthUI();
    } else {
        loginModal.classList.remove('hidden');
    }
});

loginCloseBtn.addEventListener('click', () => {
    loginModal.classList.add('hidden');
});

loginSubmitBtn.addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;  

    const {data, error} = await supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
    });

    if (error) {
        alert('ログイン失敗:' + error.message);
        return;
    }
    alert('管理者としてログインしました');
    loginModal.classList.add('hidden');
    checkAuthUI();
});

//霊場ごとに色を変える
function reijocolor(reijo) {
    switch (reijo) {
        case 'sitifuku': return '#ffd166';
        case 'naniwa': return '#ff9ebb';
        case 'shifudo': return '#ff8a65';
        case 'jusan': return '#ba68c8';
        case 'kawauti': return '#81c784';
        case 'izumi': return '#64b5f6';
        case 'nasi': return '#ccc';
        
    };
}

//ピン、カードをクリックした時の処理
function onclick(itemid, lat, lng){
    map.flyTo([lat, lng], 17, { duration: 0.8 });
    const targetCard = document.getElementById(itemid);
    if (targetCard) {
        targetCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

        targetCard.classList.add('highlight');
        setTimeout(() => {
            targetCard.classList.remove('highlight');
        }, 1500);
    }
}

//supabaseからデータ取得
async function loadItems() {
    const { data, error} = await supabaseClient
        .from('meguri_items')
        .select('*')
        .order('created_at', { ascending: false});
    
    if (error) {
        console.error('データ取得失敗:', error);
        return;
    }
    document.getElementById('photo-list').innerHTML = null;
    data.forEach(item => renderItemUI(item));
}

// ピン・カードを描画
function renderItemUI(item) {
    const photoList = document.getElementById('photo-list');
    const reijoname = jpreijo[item.reijo] || ' ';
    const themecolor = reijocolor(item.reijo);
    const itemid = 'item-' + (item.id || Date.now());

    let marker = null;
    let lat = null;
    let lng = null;

    if (item.mapurl) {
        const match = item.mapurl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (match) {
            lat = parseFloat(match[1]);
            lng = parseFloat(match[2]);

            const customIcon = L.divIcon({
                className: 'custom-pin',
                html: `<svg width="30" height="40" viewBox="0 0 24 36" xmlns="http://www.w3.org/2000/svg">
                        <path d="M12 0C5.37 0 0 5.37 0 12c0 9 12 24 12 24s12-15 12-24c0-6.63-5.37-12-12-12z" fill="${themecolor}" stroke="#ffffff" stroke-width="1.5"/>
                        <circle cx="12" cy="12" r="4" fill="#ffffff"/>
                       </svg>`,
                iconSize: [30, 40],
                iconAnchor: [15, 40],
                popupAnchor: [0, -40]
            });

            marker = L.marker([lat, lng], { icon: customIcon }).addTo(map);

            const popup = `
                <div style="font-size: 13px; line-height: 1.4;">
                    <h4 style="margin: 0 0 2px 0; font-size: 15px; color: #333;">${item.name}</h4>
                    <p style="margin: 0; color: #e91e63; font-weight: bold;">${item.date}</p>
                </div>
            `;
            marker.bindPopup(popup);

            marker.on('mouseover', function () { this.openPopup(); });
            marker.on('mouseout', function () { this.closePopup(); });
            marker.on('click', () => { onclick(itemid, lat, lng); });
        }
    }

    const photoCard = document.createElement('div');
    photoCard.className = 'photo-card';
    photoCard.id = itemid;
    photoCard.style.borderTop = `5px solid ${themecolor}`;
    photoCard.style.borderBottom = `5px solid ${themecolor}`;
    photoCard.innerHTML = `
        ${item.photo_data ? `<img src="${item.photo_data}" alt="${item.name}">` : ''}
        <div class="photo-info">
            <h3>${item.name}</h3>
            <p class="date">${item.date}</p>
            <p class="reijo">${reijoname}</p>
            ${item.memo ? `<p class="memo">${item.memo}</p>` : ''}
            <div class="card-footer">
                <button class="delete-btn">削除</button>
            </div>
        </div>
    `;

    photoCard.addEventListener('click', () => {
        onclick(itemid, lat, lng);
    });

    const deleteBtn = photoCard.querySelector('.delete-btn');
    deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();

        const {data: {session}} = await supabaseClient.auth.getSession();
        if (!session) {
            alert('削除には管理者ログインが必要です')
            loginModal.classList.remove('hidden');
            return;
        }

        if (confirm(`${item.name} の記録を削除しますか？`)) {
            if (item.id) {
                const { error } = await supabaseClient
                    .from('meguri_items')
                    .delete()
                    .eq('id', item.id);

                if (error) {
                    console.error('削除失敗:', error);
                    return;
                }
            }
            if (marker) map.removeLayer(marker);
            photoCard.remove();
        }
    });

    photoList.prepend(photoCard);
}

// 写真をリサイズ・圧縮してBase64に変換する関数
function compressImage(file) {
    return new Promise((resolve, reject) => {
        if (!file) return resolve(null);
        const reader = new FileReader();
        reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const MAX_WIDTH = 800; // 長辺を最大800pxに制限
                let width = img.width;
                let height = img.height;

                if (width > height) {
                    if (width > MAX_WIDTH) {
                        height *= MAX_WIDTH / width;
                        width = MAX_WIDTH;
                    }
                } else {
                    if (height > MAX_WIDTH) {
                        width *= MAX_WIDTH / height;
                        height = MAX_WIDTH;
                    }
                }

                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);

                // 画質0.7でJPEG変換（大幅に容量軽量化）
                resolve(canvas.toDataURL('image/jpeg', 0.7));
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function checkAuthUI() {
    const {data:{session}} = await supabaseClient.auth.getSession();
    if (session) {
        btnAuth.textContent = 'ログアウト';
    } else {
        btnAuth.textContent = 'ログイン';
    }
}