// 전역 데이터 변수
let videoData = [];
let channelTags = []; // txt에서 불러온 채널 목록
let keywordTags = []; // txt에서 불러온 키워드 목록

// DOM 요소
const videoListContainer = document.getElementById('videoList');
const searchInput = document.getElementById('searchInput');
const channelListContainer = document.getElementById('channelList');
const keywordListContainer = document.getElementById('keywordList');
const resultCountSpan = document.getElementById('resultCount'); // 숫자 표시
const dateStartInput = document.getElementById('dateStart');
const dateEndInput = document.getElementById('dateEnd');
const resetDateBtn = document.getElementById('resetDate');

// 필터 상태
let activeChannels = []; 
let activeKeywords = []; 

// ============================
// Helper: 시간 파싱 (MM:SS -> 초 단위 변환)
// ============================
function parseDurationToSeconds(durationStr) {
    const parts = durationStr.split(':').map(Number);
    if (parts.length === 2) {
        return parts[0] * 60 + parts[1];
    } else if (parts.length === 3) {
        return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
    return 0;
}

// ============================
// 1. 데이터 로드 (JSON + TXT 2개)
// ============================
async function init() {
    try {
        // 3개의 파일을 병렬로 가져옴
        const [jsonRes, channelRes, keywordRes] = await Promise.all([
            fetch('/data/nmixx_new.json'),
            fetch('/data/channels.txt'),
            fetch('/data/hashTag.txt')
        ]);

        if (!jsonRes.ok || !channelRes.ok || !keywordRes.ok) {
            throw new Error('파일을 불러오는데 실패했습니다.');
        }

        // 1) 비디오 데이터 파싱
        videoData = await jsonRes.json();

        // 2) 채널 텍스트 파일 파싱 (줄바꿈 기준)
        const channelText = await channelRes.text();
        channelTags = channelText.split('\n').map(s => s.trim()).filter(s => s !== '');

        // 3) 키워드 텍스트 파일 파싱 (줄바꿈 기준)
        const keywordText = await keywordRes.text();
        keywordTags = keywordText.split('\n').map(s => s.trim()).filter(s => s !== '');

        // 4) UI 생성 및 초기 필터 적용
        createFilterTags();
        applyFilters();

    } catch (error) {
        console.error("Data Load Error:", error);
        videoListContainer.innerHTML = `
            <div class="no-result">
                데이터 로딩 실패.<br>
                (로컬 서버 실행 여부와 파일 경로를 확인해주세요.)
            </div>`;
    }
}

// ============================
// 2. 태그 버튼 생성 (TXT 파일 기반)
// ============================
function createFilterTags() {
    // A. 채널 태그 생성 (channels.txt 순서대로)
    channelTags.forEach(channel => {
        const btn = document.createElement('button');
        btn.className = 'tag-btn';
        btn.textContent = channel;
        btn.onclick = () => toggleFilter(channel, btn, 'channel');
        channelListContainer.appendChild(btn);
    });

    // B. 키워드 태그 생성 (Shorts + keywords.txt 순서대로)
    
    // 1. Shorts 버튼은 항상 맨 앞에 수동 추가
    const shortsBtn = document.createElement('button');
    shortsBtn.className = 'tag-btn shorts-tag';
    shortsBtn.textContent = 'Shorts';
    shortsBtn.onclick = () => toggleFilter('Shorts', shortsBtn, 'keyword');
    keywordListContainer.appendChild(shortsBtn);

    // 2. keywords.txt 내용 추가
    keywordTags.forEach(keyword => {
        const btn = document.createElement('button');
        btn.className = 'tag-btn';
        btn.textContent = keyword;
        btn.onclick = () => toggleFilter(keyword, btn, 'keyword');
        keywordListContainer.appendChild(btn);
    });
}

// ============================
// 3. 필터 로직
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

function isValidDate(dateString) {
    const regex = /^\d{4}-\d{2}-\d{2}$/;
    if (!regex.test(dateString)) return false;
    const date = new Date(dateString);
    return !isNaN(date.getTime());
}

function applyFilters() {
    const keyword = searchInput.value.toLowerCase();
    const startDateStr = dateStartInput.value.trim();
    const endDateStr = dateEndInput.value.trim();

    const filtered = videoData.filter(video => {
        // 1. 검색어 (제목)
        const matchText = video.title.toLowerCase().includes(keyword);

        // 2. 채널 필터
        const matchChannel = activeChannels.length === 0 || activeChannels.includes(video.channel_title);

        // 3. 키워드 필터 (Shorts + Hashtags)
        let matchKeyword = true;
        if (activeKeywords.length > 0) {
            matchKeyword = activeKeywords.some(activeKey => {
                if (activeKey === 'Shorts') {
                    // 쇼츠: 120초(2분) 미만
                    return parseDurationToSeconds(video.duration) < 120;
                } else {
                    // 일반 해시태그 매칭
                    return video.hashtags && video.hashtags.includes(activeKey);
                }
            });
        }

        // 4. 날짜 필터
        const videoDate = new Date(video.publish_date);
        let matchDate = true;
        if (isValidDate(startDateStr)) matchDate = matchDate && (videoDate >= new Date(startDateStr));
        if (isValidDate(endDateStr)) matchDate = matchDate && (videoDate <= new Date(endDateStr));

        return matchText && matchChannel && matchKeyword && matchDate;
    });

    // 결과 갯수 업데이트
    updateResultCount(filtered.length);
    
    // 화면 렌더링
    renderVideos(filtered);
}

// ============================
// 4. 렌더링 및 유틸
// ============================
function updateResultCount(count) {
    resultCountSpan.textContent = count;
}

// ============================
// [수정됨] 렌더링 함수
// ============================
function renderVideos(videos) {
    videoListContainer.innerHTML = '';

    if (videos.length === 0) {
        videoListContainer.innerHTML = '<div class="no-result">조건에 맞는 영상이 없습니다.</div>';
        return;
    }

    videos.forEach((video, index) => {
        // 1. 디버깅: 첫 번째 영상 데이터만 콘솔에 출력해서 키(Key) 이름을 확인합니다.
        if (index === 0) {
            console.log("▼ 첫 번째 영상 데이터 구조 확인 (F12 콘솔 탭)");
            console.log(video); 
        }

        // 2. URL 안전하게 가져오기
        // JSON에 "url"이 있으면 가져오고, 없으면 빈 문자열로 처리
        let videoUrl = "";
        if (video.url) {
            videoUrl = video.url;
        } else if (video.link) { // 혹시 키 값이 link일 경우
            videoUrl = video.link;
        } 

        // 3. 해시태그 처리
        const tagsStr = video.hashtags ? video.hashtags.join(' ') : '';

        const card = document.createElement('div');
        card.className = 'card';
        
        // 4. HTML 생성
        // onclick="playVideo(...)" 형태로 변경하여 오류를 방지합니다.
        card.innerHTML = `
            <div class="image-wrapper">
                <img src="${video.thumbnail_url}" class="card-image" alt="${video.title}">
                <span class="duration-badge">${video.duration}</span>
            </div>
            <div class="video-info">
                <h3 class="video-title">${video.title}</h3>
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

// ============================
// [추가됨] 영상 재생 함수
// ============================
function playVideo(url) {
    // URL이 비어있거나 올바르지 않으면 경고창 띄움
    if (!url || url === 'undefined' || url.trim() === '') {
        alert("영상 주소(URL)를 찾을 수 없습니다.\n데이터 파일(JSON)의 'url' 항목을 확인해주세요.");
        return;
    }
    window.open(url, '_blank');
}

// 이벤트 리스너
searchInput.addEventListener('input', applyFilters);
dateStartInput.addEventListener('input', applyFilters);
dateEndInput.addEventListener('input', applyFilters);

resetDateBtn.addEventListener('click', () => {
    dateStartInput.value = '';
    dateEndInput.value = '';
    applyFilters();
});

// 초기화 실행
init();