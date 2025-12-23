// 전역 변수
let myChart = null;
let currentChartMode = 'total';

// CSS 스타일 가져오기
const style = getComputedStyle(document.body);
const primaryColor = style.getPropertyValue('--primary').trim() || '#4D7CE3';
const textColor = style.getPropertyValue('--text-color').trim() || '#333';

// 1. 데이터 정의
const chartData = {
    total: {
        labels: ['AD MARE', 'ENTWURF', 'expérgo', ['A Midsummer', "NMIXX`s Dream"], 'Fe3O4: BREAK', 'Fe3O4: STICK OUT', 'Fe3O4: FORWARD', 'Blue Valentine'],
        data: [227300, 442200, 630800, 1030500, 618500, 585700, 702800, 644800]
    },
    daily: {
        'AD MARE': [20300, 22900, 25200, 163700, 165200, 166600, 227300],
        'ENTWURF': [250600, 315500, 367900, 389800, 408000, 422300, 442200],
        'expérgo': [100000, 120000, 80000, 60000, 90000, 80000, 100800],
        "A Midsummer NMIXX's Dream": [405500, 435800, 503600, 562000, 611700, 620800, 630800],
        'Fe3O4: BREAK': [127900, 317300, 376900, 505300, 550600, 570800, 618500],
        'Fe3O4: STICK OUT': [341300, 396900, 441400, 451000, 487500, 502300, 585700],
        'Fe3O4: FORWARD': [435900, 449700, 471400, 481100, 589400, 668700, 702800],
        'Blue Valentine': [468500, 490900, 516200, 517800, 554200, 556000, 644800]
    }
};

const albumKeys = Object.keys(chartData.daily);
const albumDisplayNames = ['AD MARE', 'ENTWURF', 'expérgo', "A Midsummer NMIXX's Dream", 'Fe3O4: BREAK', 'Fe3O4: STICK OUT', 'Fe3O4: FORWARD', 'Blue Valentine'];

document.addEventListener('DOMContentLoaded', function() {
    initChart();
    initSelector();
});

// 2. 메인 탭 전환 (Sales <-> Compass)
function switchMainTab(tabName) {
    // 버튼 활성화
    const buttons = document.querySelectorAll('.nav-btn');
    buttons.forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    // 섹션 표시
    const sections = document.querySelectorAll('.tab-content');
    sections.forEach(sec => sec.classList.remove('active'));

    if (tabName === 'sales') {
        document.getElementById('section-sales').classList.add('active');
    } else {
        document.getElementById('section-compass').classList.add('active');
    }
}

// 3. 차트 초기화
function initChart() {
    const ctx = document.getElementById('salesChart').getContext('2d');
    let gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, primaryColor);
    gradient.addColorStop(1, 'rgba(255, 255, 255, 0.05)');

    myChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartData.total.labels,
            datasets: [{
                label: '초동 판매량',
                data: chartData.total.data,
                borderColor: primaryColor,
                backgroundColor: gradient,
                borderWidth: 3,
                pointBackgroundColor: '#fff',
                pointBorderColor: primaryColor,
                pointBorderWidth: 2,
                pointRadius: 5,
                pointHoverRadius: 7,
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    backgroundColor: 'rgba(0, 0, 0, 0.8)', padding: 10,
                    titleFont: { family: "'Pretendard'", size: 14 },
                    bodyFont: { family: "'Pretendard'", size: 13 },
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) label += ': ';
                            if (context.parsed.y !== null) {
                                let strVal = new Intl.NumberFormat('ko-KR').format(context.parsed.y);
                                if (strVal.length > 2) strVal = strVal.substring(0, strVal.length - 2) + '**';
                                else strVal = '**';
                                label += strVal + ' 장';
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: { grid: { display: false }, ticks: { color: '#666', maxRotation: 45, minRotation: 0 } },
                y: { beginAtZero: true, grid: { color: '#f0f0f0', borderDash: [5, 5] }, ticks: { color: '#888', callback: v => v >= 10000 ? (v/10000)+'만' : v } }
            },
            interaction: { mode: 'index', intersect: false }
        }
    });
}

function initSelector() {
    const select = document.getElementById('albumSelector');
    albumKeys.forEach((key, index) => {
        const option = document.createElement('option');
        option.value = key;
        option.text = albumDisplayNames[index];
        select.appendChild(option);
    });
    select.value = albumKeys[albumKeys.length - 1];
}

// 4. 차트 모드 전환 (Total <-> Daily)
function setChartMode(mode, btnElement) {
    currentChartMode = mode;
    document.querySelectorAll('.sub-mode-btn').forEach(btn => btn.classList.remove('active'));
    btnElement.classList.add('active');

    const select = document.getElementById('albumSelector');
    if (mode === 'total') {
        select.classList.remove('show');
        updateChartData(chartData.total.labels, chartData.total.data, '초동 판매량');
    } else {
        select.classList.add('show');
        updateDailyChart(select.value);
    }
}

function updateDailyChart(albumKey) {
    if (currentChartMode !== 'daily') return;
    const dailyLabels = ['1일차', '2일차', '3일차', '4일차', '5일차', '6일차', '7일차'];
    const dailyData = chartData.daily[albumKey] || [0,0,0,0,0,0,0];
    updateChartData(dailyLabels, dailyData, '누적 판매량');
}

function updateChartData(labels, data, labelName) {
    myChart.data.labels = labels;
    myChart.data.datasets[0].data = data;
    myChart.data.datasets[0].label = labelName;
    myChart.update();
}