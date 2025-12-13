let dictionaryData = {};
let searchIndex = []; 

// DOM 요소
const input = document.getElementById('searchInput');
const container = document.getElementById('resultContainer');

// 데이터 로드
fetch('./data/word.json')
    .then(response => response.json())
    .then(data => {
        dictionaryData = data;
        const keys = Object.keys(data).sort(); 

        searchIndex = keys.map(word => ({
            word: word,
            // [변경] 공통 유틸 사용
            jamo: Hangul.makeSearchKey(word)
        }));

        renderAll();
    })
    .catch(error => {
        console.error('Error:', error);
        // 에러 메시지 표시 요소가 있다면 사용, 없으면 콘솔만
        if(document.querySelector('.info-message')) {
            document.querySelector('.info-message').innerText = "데이터 로드 실패";
        }
    });

function tagSearch(query) {
    if (!query) return [];
    // [변경] 공통 유틸 사용
    const queryJamo = Hangul.makeSearchKey(query);
    
    const matches = searchIndex.filter(item => {
        return item.jamo.startsWith(queryJamo); // 혹은 includes(queryJamo)
    });

    return matches.map(item => ({ word: item.word }));
}

function linkify(text) {
    const urlRegex = /(https?:\/\/[^\s]+)/g;
    return text.replace(urlRegex, function(url) {
        return `<a href="${url}" target="_blank">${url}</a>`;
    });
}

function createCardHTML(item) {
    const rawDesc = dictionaryData[item.word] || "설명이 없습니다.";
    const formattedDesc = linkify(rawDesc);
    
    const div = document.createElement('div');
    div.className = 'card';
    div.innerHTML = `
        <div class="word-title">${item.word}</div>
        <div class="word-desc">${formattedDesc}</div>
    `;
    return div;
}

function renderAll() {
    container.innerHTML = '';
    searchIndex.forEach(item => {
        container.appendChild(createCardHTML(item));
    });
}

input.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    container.innerHTML = '';

    if (query.length === 0) {
        renderAll();
        return;
    }

    const results = tagSearch(query);

    if (results.length === 0) {
        container.innerHTML = '<div class="info-message">검색 결과가 없습니다.</div>';
        return;
    }

    results.forEach(item => {
        container.appendChild(createCardHTML(item));
    });
});