let products = [];
let cart = [];
let searchIndex = []; 

// DOM 요소
const productListEl = document.getElementById('product-list');
const cartItemsContainer = document.getElementById('cart-items-container');
const searchInput = document.getElementById('search-input');
const cartCountEl = document.querySelector('.cart-count');
const totalPriceEls = document.querySelectorAll('.total-price');
const modalEl = document.getElementById('cart-modal');

// --- 1. JSON 데이터 로드 및 초기화 ---
async function loadProducts() {
    try {
        const response = await fetch('./data/products.json');
        if (!response.ok) throw new Error('Network response was not ok');
        
        const data = await response.json();
        
        products = data.map((item, index) => ({
            id: index + 1,
            ...item
        }));

        initSearchIndex();
        renderProducts(products);

    } catch (error) {
        console.error("Failed to load products:", error);
        productListEl.innerHTML = `<div style="text-align:center; padding:20px;">상품을 불러올 수 없습니다.</div>`;
    }
}

// --- 2. 검색 인덱스 생성 (유틸 사용) ---
function initSearchIndex() {
    searchIndex = products.map(product => {
        return {
            ...product,
            // [변경] 공통 유틸 사용
            jamo: Hangul.makeSearchKey(product.name)
        };
    });
}

// --- 3. 렌더링 및 기능 로직 ---
function renderProducts(items) {
    productListEl.innerHTML = '';
    const noResultEl = document.getElementById('no-result');

    if (items.length === 0) {
        if(noResultEl) noResultEl.style.display = 'block';
        return;
    }
    if(noResultEl) noResultEl.style.display = 'none';

    items.forEach(product => {
        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <img src="${product.image}" alt="${product.name}" class="card-image">
            <div class="word-title">${product.name}</div>
            <div class="word-desc price">${product.price.toLocaleString()}원</div>
            <button class="btn-add" onclick="addToCart(${product.id})">담기</button>
        `;
        productListEl.appendChild(card);
    });
}

// 검색 리스너 (startsWith 적용됨)
searchInput.addEventListener('input', (e) => {
    const query = e.target.value;
    if (!query) {
        renderProducts(products);
        return;
    }
    // [변경] 공통 유틸 사용
    const queryJamo = Hangul.makeSearchKey(query);
    const filtered = searchIndex.filter(item => item.jamo.startsWith(queryJamo));
    renderProducts(filtered);
});

// --- 장바구니 로직 (기존 유지) ---
function addToCart(id) {
    const existingItem = cart.find(item => item.id === id);
    if (existingItem) {
        existingItem.quantity++;
        existingItem.active = true;
    } else {
        const product = products.find(p => p.id === id);
        if(product) {
            cart.push({ ...product, quantity: 1, active: true });
        }
    }
    updateCartUI();
    if (modalEl && modalEl.classList.contains('open')) renderCartItems();
}

function changeQuantity(id, change) {
    const item = cart.find(i => i.id === id);
    if (!item) return;

    // 현재 0개인데 줄이려고(-1) 하면 동작 중단
    if (item.quantity === 0 && change < 0) {
        return;
    }

    // 수량 변경 적용 (0도 허용, 음수는 위에서 막힘)
    item.quantity += change;

    updateCartUI();
    renderCartItems();
}

function toggleActive(id) {
    const item = cart.find(i => i.id === id);
    if (item) {
        item.active = !item.active;
        updateCartUI();
        renderCartItems();
    }
}

function updateCartUI() {
    const total = cart.reduce((sum, item) => {
        return item.active ? sum + (item.price * item.quantity) : sum;
    }, 0);
    const count = cart.filter(item => item.active).length;

    if(cartCountEl) cartCountEl.textContent = `${count}종류 선택됨`;
    if(totalPriceEls) totalPriceEls.forEach(el => el.textContent = total.toLocaleString());
}

function renderCartItems() {
    if(!cartItemsContainer) return;
    cartItemsContainer.innerHTML = '';
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<div style="text-align:center; margin-top:50px; color:#aaa;">장바구니가 비어있습니다.</div>';
        return;
    }

    cart.forEach(item => {
        const itemEl = document.createElement('div');
        // 비활성화(체크해제) 시 전체 투명도 조절
        itemEl.className = `cart-item ${item.active ? '' : 'inactive'}`;
        
        // [UX] 수량이 0이면 가격 텍스트에 'zero' 클래스 추가 (회색 처리)
        const priceClass = item.quantity === 0 ? 'item-price zero' : 'item-price';
        
        // [UX] 수량이 0이면 버튼에 disabled 속성 추가
        const minusDisabled = item.quantity === 0 ? 'disabled' : '';

        itemEl.innerHTML = `
            <input type="checkbox" ${item.active ? 'checked' : ''} onchange="toggleActive(${item.id})">
            
            <img src="${item.image}" alt="thumb">
            
            <div class="item-info">
                <div class="item-name">${item.name}</div>
                <div class="${priceClass}">${(item.price * item.quantity).toLocaleString()}원</div>
            </div>
            
            <div class="item-controls">
                <button class="btn-delete" onclick="removeFromCart(${item.id})">✕</button>
                
                <div class="qty-wrapper">
                    <button class="qty-btn" onclick="changeQuantity(${item.id}, -1)" ${minusDisabled}>-</button>
                    
                    <span class="qty-display">${item.quantity}</span>
                    
                    <button class="qty-btn" onclick="changeQuantity(${item.id}, 1)">+</button>
                </div>
            </div>
        `;
        cartItemsContainer.appendChild(itemEl);
    });
}

// 모달 관련
function openCartModal() { if(modalEl) { modalEl.classList.add('open'); renderCartItems(); } }
function closeCartModal() { if(modalEl) modalEl.classList.remove('open'); }
if(modalEl) modalEl.addEventListener('click', (e) => { if (e.target === modalEl) closeCartModal(); });
// --- shop.js 하단부 ---

// [추가] 1. 상품 삭제 함수
function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    updateCartUI();
    renderCartItems();
    
}

// [수정] 2. 렌더링 함수 업데이트
function renderCartItems() {
    if(!cartItemsContainer) return;
    cartItemsContainer.innerHTML = '';
    
    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<div style="text-align:center; margin-top:50px; color:#aaa;">장바구니가 비어있습니다.</div>';
        return;
    }

    cart.forEach(item => {
        const itemEl = document.createElement('div');
        // 비활성화 시 스타일 적용
        itemEl.className = `cart-item ${item.active ? '' : 'inactive'}`;
        
        itemEl.innerHTML = `
            <input type="checkbox" ${item.active ? 'checked' : ''} onchange="toggleActive(${item.id})">
            
            <img src="${item.image}" alt="thumb">
            
            <div class="item-info">
                <div class="item-name">${item.name}</div>
                <div class="item-price">${(item.price * item.quantity).toLocaleString()}원</div>
            </div>
            
            <div class="item-controls">
                <button class="btn-delete" onclick="removeFromCart(${item.id})">✕</button>
                
                <div class="qty-wrapper">
                    <button class="qty-btn" onclick="changeQuantity(${item.id}, -1)">-</button>
                    <span class="qty-display">${item.quantity}</span>
                    <button class="qty-btn" onclick="changeQuantity(${item.id}, 1)">+</button>
                </div>
            </div>
        `;
        cartItemsContainer.appendChild(itemEl);
    });
}

// 앱 시작
loadProducts();