// video.js

// ============================
// 전역 변수 및 상태 관리
// ============================
let videoData = [];
let channelData = {};
let keywordData = {};

// DOM 요소
const videoListContainer = document.getElementById('videoList');
const searchInput = document.getElementById('searchInput');
const channelListContainer = document.getElementById('channelList');
const keywordListContainer = document.getElementById('keywordList');
const resultCountSpan = document.getElementById('resultCount');
const dateStartInput = document.getElementById('dateStart');
const dateEndInput = document.getElementById('dateEnd');
const resetDateBtn = document.getElementById('resetDate');

// 필터 상태
let activeChannels = [];
let activeKeywords = [];

// ============================
// 유틸리티 함수
// ============================

// 시간 파싱 (MM:SS, HH:MM:SS -> 초)
function parseDurationToSeconds(durationStr) {
    if (!durationStr) return 0;
    const parts = durationStr.split(':').map(Number);
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return 0;
}

// [수정됨] 날짜 객체 변환 (시간을 00:00:00으로 초기화하여 날짜만 비교)
function getZeroTimeDate(dateStr) {
    if (!dateStr) return null;
    // 1. 점(.)을 하이픈(-)으로 변경 (2024.01.01 -> 2024-01-01 호환성 확보)
    let cleanStr = dateStr.toString().replace(/\./g, '-').trim();
    
    // 2. 날짜 객체 생성
    const d = new Date(cleanStr);
    
    // 3. 유효하지 않은 날짜면 null 반환
    if (isNaN(d.getTime())) return null;

    // 4. 시간 정보를 제거 (0시 0분 0초로 설정)
    d.setHours(0, 0, 0, 0);
    return d;
}

// ============================
// 1. 데이터 로드 및 초기화
// ============================
async function init() {
    try {
        const [jsonRes, channelRes, keywordRes] = await Promise.all([
            fetch('./data/nmixx_new.json'),
            fetch('./data/channels.json'),
            fetch('./data/hashTag.json')
        ]);

        if (!jsonRes.ok) throw new Error(`영상 데이터 로드 실패 (${jsonRes.status})`);
        if (!channelRes.ok) throw new Error(`채널 데이터 로드 실패 (${channelRes.status})`);
        if (!keywordRes.ok) throw new Error(`키워드 데이터 로드 실패 (${keywordRes.status})`);

        videoData = await jsonRes.json();
        keywordData = await keywordRes.json();
        channelData = await channelRes.json();

        // [디버깅] 첫 번째 영상의 날짜 형식이 무엇인지 콘솔에 출력
        if (videoData.length > 0) {
            console.log("첫 번째 영상 날짜 데이터 확인:", videoData[0].publish_date);
        }

        createFilterTags();
        applyFilters(); 

    } catch (error) {
        console.error("Data Load Error:", error);
        videoListContainer.innerHTML = '<div class="no-result">데이터 로딩 중 오류가 발생했습니다.<br>새로고침을 해주세요.</div>';
    }
}

// ============================
// 2. 필터 UI 생성 (아코디언)
// ============================
function createFilterTags() {
    channelListContainer.innerHTML = '';
    keywordListContainer.innerHTML = '';

    // --- A. 채널 태그 ---
    for (const [categoryName, channels] of Object.entries(channelData)) {
        const categoryItem = document.createElement('div');
        categoryItem.className = 'category-item active';

        const header = document.createElement('div');
        header.className = 'category-header';
        header.textContent = categoryName;
        header.onclick = () => categoryItem.classList.toggle('active');

        const content = document.createElement('div');
        content.className = 'category-content';

        const tagWrapper = document.createElement('div');
        tagWrapper.className = 'tag-container';

        if (Array.isArray(channels)) {
            channels.forEach(channelName => {
                const btn = document.createElement('button');
                btn.className = 'tag-btn';
                btn.textContent = channelName;
                btn.onclick = () => toggleFilter(channelName, btn, 'channel');
                tagWrapper.appendChild(btn);
            });
        }

        content.appendChild(tagWrapper);
        categoryItem.appendChild(header);
        categoryItem.appendChild(content);
        channelListContainer.appendChild(categoryItem);
    }

    // --- B. 키워드 태그 ---
    for (const [categoryName, tags] of Object.entries(keywordData)) {
        const categoryItem = document.createElement('div');
        categoryItem.className = 'category-item';

        const header = document.createElement('div');
        header.className = 'category-header';
        header.textContent = categoryName;
        header.onclick = () => categoryItem.classList.toggle('active');

        const content = document.createElement('div');
        content.className = 'category-content';

        const tagWrapper = document.createElement('div');
        tagWrapper.className = 'tag-container';

        tags.forEach(tag => {
            const btn = document.createElement('button');
            if (tag === '#Shorts' || tag === '#Short') {
                btn.className = 'tag-btn shorts-tag';
            } else {
                btn.className = 'tag-btn';
            }
            btn.textContent = tag;
            btn.onclick = () => toggleFilter(tag, btn, 'keyword');
            tagWrapper.appendChild(btn);
        });

        content.appendChild(tagWrapper);
        categoryItem.appendChild(header);
        categoryItem.appendChild(content);
        keywordListContainer.appendChild(categoryItem);
    }

    if (keywordListContainer.firstChild) {
        keywordListContainer.firstChild.classList.add('active');
    }
}

// ============================
// 3. 필터 상태 관리
// ============================
function toggleFilter(value, btnElement, type) {
    let targetArray = type === 'channel' ? activeChannels : activeKeywords;

    if (targetArray.includes(value)) {
        if (type === 'channel') activeChannels = activeChannels.filter(t => t !== value);
        else activeKeywords = activeKeywords.filter(t => t !== value);
        btnElement.classList.remove('active');
    } else {
        if (type === 'channel') activeChannels.push(value);
        else activeKeywords.push(value);
        btnElement.classList.add('active');
    }
    applyFilters();
}

// ============================
// 4. 검색 및 필터링 핵심 로직
// ============================
function applyFilters() {
    const rawKeyword = searchInput.value.toLowerCase().trim();
    const searchTerms = rawKeyword.split(/\s+/).filter(term => term.length > 0);

    // [수정됨] 입력된 날짜 가져오기 (YYYY-MM-DD -> Date 객체 변환)
    const startDateObj = getZeroTimeDate(dateStartInput.value);
    const endDateObj = getZeroTimeDate(dateEndInput.value);

    const filtered = videoData.filter(video => {
        // --- A. 제목 검색 (AND) ---
        let matchText = true;
        if (searchTerms.length > 0) {
            const titleLower = video.title.toLowerCase();
            matchText = searchTerms.every(term => titleLower.includes(term));
        }

        // --- B. 채널 필터 (OR) ---
        const matchChannel = activeChannels.length === 0 || activeChannels.includes(video.channel_title);

        // --- C. 키워드 필터 (AND) ---
        let matchKeyword = true;
        if (activeKeywords.length > 0) {
            matchKeyword = activeKeywords.every(activeKey => {
                if (activeKey === '#Shorts' || activeKey === '#Short' || activeKey === 'Shorts') {
                    const isShortTime = parseDurationToSeconds(video.duration) < 120;
                    const hasTag = video.hashtags && (video.hashtags.includes('#Shorts') || video.hashtags.includes('#Short'));
                    return isShortTime || hasTag;
                } else {
                    return video.hashtags && video.hashtags.includes(activeKey);
                }
            });
        }

        // --- D. 날짜 필터 (수정됨) ---
        let matchDate = true;
        const videoDateObj = getZeroTimeDate(video.publish_date);

        if (videoDateObj) { // 영상 날짜가 유효할 때만 검사
            if (startDateObj) {
                // 시작일보다 크거나 같아야 함
                matchDate = matchDate && (videoDateObj.getTime() >= startDateObj.getTime());
            }
            if (endDateObj) {
                // 종료일보다 작거나 같아야 함
                matchDate = matchDate && (videoDateObj.getTime() <= endDateObj.getTime());
            }
        }

        return matchText && matchChannel && matchKeyword && matchDate;
    });

    updateResultCount(filtered.length);
    renderVideos(filtered);
}

// ============================
// 5. 렌더링 및 기타
// ============================
function updateResultCount(count) {
    resultCountSpan.textContent = count;
}

function renderVideos(videos) {
    videoListContainer.innerHTML = '';
    
    if (videos.length === 0) {
        videoListContainer.innerHTML = '<div class="no-result">조건에 맞는 영상이 없습니다.</div>';
        return;
    }

    videos.forEach(video => {
        let videoUrl = video.url || video.link || "";
        const tagsStr = video.hashtags ? video.hashtags.join(' ') : '';

        const card = document.createElement('div');
        card.className = 'card';
        card.innerHTML = `
            <div class="image-wrapper">
                <img src="${video.thumbnail_url}" class="card-image" loading="lazy" alt="thumbnail">
                <span class="duration-badge">${video.duration}</span>
            </div>
            <div class="video-info">
                <h3 class="video-title" title="${video.title}">${video.title}</h3>
                <div class="video-meta">
                    <span class="channel-badge">${video.channel_title}</span>
                    <span>${video.publish_date}</span>
                </div>
                ${tagsStr ? `<div class="card-tags">${tagsStr}</div>` : ''}
            </div>
            <button class="btn-add" onclick="playVideo('${videoUrl}')">시청하기</button>
        `;
        videoListContainer.appendChild(card);
    });
}

function playVideo(url) {
    if (!url || url === 'undefined' || url.trim() === '') {
        alert("영상 주소가 없습니다.");
        return;
    }
    window.open(url, '_blank');
}

// ============================
// 6. 이벤트 리스너
// ============================
searchInput.addEventListener('input', applyFilters);
dateStartInput.addEventListener('input', applyFilters);
dateEndInput.addEventListener('input', applyFilters);

resetDateBtn.addEventListener('click', () => {
    dateStartInput.value = '';
    dateEndInput.value = '';
    applyFilters();
});

init();