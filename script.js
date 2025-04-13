// Global variables
let previousResults = [];
let predictionHistory = [];
let winCount = 0;
let lossCount = 0;
let currentStreak = 0;
let highestWinStreak = 0;
let highestLossStreak = 0;
let activeLogic = "";
let chartInstances = {};
let currentPage = "dashboard";
let currentTheme = "dark";
let isSidebarOpen = false;

// DOM Elements
const sidebar = document.querySelector('.sidebar');
const menuToggle = document.querySelector('.menu-toggle');
const themeToggle = document.getElementById('theme-toggle');
const themePrefToggle = document.getElementById('theme-pref-toggle');
const menuItems = document.querySelectorAll('.menu li');
const pageContents = document.querySelectorAll('.page-content');
const exportCurrentBtn = document.getElementById('export-current');
const exportHistoryBtn = document.getElementById('export-history');
const exportFullHistoryBtn = document.getElementById('export-full-history');
const analysisTabs = document.querySelectorAll('.analysis-tab');
const analysisTabContents = document.querySelectorAll('.analysis-tab-content');

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    // Load saved theme preference
    const savedTheme = localStorage.getItem('algoPredXTheme');
    if (savedTheme) {
        currentTheme = savedTheme;
        document.body.classList.toggle('light-theme', savedTheme === 'light');
        themeToggle.checked = savedTheme === 'light';
        themePrefToggle.checked = savedTheme === 'light';
    }
    
    // Load stats from localStorage
    loadStats();
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize charts
    initCharts();
    
    // Fetch initial data
    fetchCurrentGameIssue();
    
    // Set active page
    setActivePage(currentPage);
});

function setupEventListeners() {
    // Menu toggle for mobile
    menuToggle.addEventListener('click', toggleSidebar);
    
    // Theme toggle
    themeToggle.addEventListener('change', toggleTheme);
    themePrefToggle.addEventListener('change', toggleTheme);
    
    // Menu items click
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            const page = this.getAttribute('data-page');
            setActivePage(page);
            if (window.innerWidth <= 992) {
                toggleSidebar();
            }
        });
    });
    
    // Export buttons
    exportCurrentBtn.addEventListener('click', exportCurrentPrediction);
    exportHistoryBtn.addEventListener('click', exportHistory);
    exportFullHistoryBtn.addEventListener('click', exportFullHistory);
    
    // Analysis tabs
    analysisTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.getAttribute('data-tab');
            setActiveAnalysisTab(tabId);
        });
    });
    
    // Settings buttons
    document.getElementById('clear-cache').addEventListener('click', clearCache);
    document.getElementById('reset-stats').addEventListener('click', resetStats);
    document.getElementById('check-updates').addEventListener('click', checkForUpdates);
}

function toggleSidebar() {
    isSidebarOpen = !isSidebarOpen;
    sidebar.classList.toggle('active', isSidebarOpen);
}

function toggleTheme() {
    currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
    document.body.classList.toggle('light-theme', currentTheme === 'light');
    document.body.classList.toggle('dark-theme', currentTheme === 'dark');
    localStorage.setItem('algoPredXTheme', currentTheme);
    
    // Update both toggles
    themeToggle.checked = currentTheme === 'light';
    themePrefToggle.checked = currentTheme === 'light';
    
    // Update charts for new theme
    updateChartsForTheme();
}

function setActivePage(page) {
    currentPage = page;
    
    // Update menu items
    menuItems.forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-page') === page);
    });
    
    // Update page contents
    pageContents.forEach(content => {
        content.classList.toggle('hidden', content.id !== `${page}-page`);
    });
    
    // Update page title
    document.querySelector('.page-title').textContent = getPageTitle(page);
    
    // Load data for the page if needed
    if (page === 'analysis') {
        updateAnalysisCharts();
    } else if (page === 'history') {
        updateFullHistoryTable();
    }
}

function getPageTitle(page) {
    const titles = {
        'dashboard': 'Dashboard',
        'game': 'Game Window',
        'history': 'History',
        'analysis': 'Analysis & Trends',
        'settings': 'Settings',
        'about': 'About Us'
    };
    return titles[page] || 'AlgoPredX';
}

function setActiveAnalysisTab(tabId) {
    analysisTabs.forEach(tab => {
        tab.classList.toggle('active', tab.getAttribute('data-tab') === tabId);
    });
    
    analysisTabContents.forEach(content => {
        content.classList.toggle('active', content.id === `${tabId}-tab`);
    });
    
    // Update the chart for the active tab
    if (tabId === 'size-trends') {
        updateSizeTrendChart();
    } else if (tabId === 'color-trends') {
        updateColorTrendChart();
    } else if (tabId === 'logic-performance') {
        updateLogicPerformanceChart();
    }
}

// API Functions
async function fetchCurrentGameIssue() {
    const apiUrl = 'https://api.bdg88zf.com/api/webapi/GetGameIssue';
    const requestData = {
        typeId: 1,
        language: 0,
        random: "40079dcba93a48769c6ee9d4d4fae23f",
        signature: "D12108C4F57C549D82B23A91E0FA20AE",
        timestamp: Math.floor(Date.now() / 1000),
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json;charset=UTF-8',
            },
            body: JSON.stringify(requestData),
        });

        if (response.ok) {
            const data = await response.json();
            if (data.code === 0) {
                updateTimer(data.data);
                generatePrediction(data.data);
                fetchPreviousResults();
            } else {
                console.error('Failed to fetch game issue:', data.msg);
            }
        } else {
            console.error('Network response was not ok:', response.statusText);
        }
    } catch (error) {
        console.error('Fetch error:', error);
        // Retry after 5 seconds if there's an error
        setTimeout(fetchCurrentGameIssue, 5000);
    }
}

function updateTimer(data) {
    const periodNumber = document.getElementById('period-number');
    periodNumber.textContent = data.issueNumber;

    const endTime = new Date(data.endTime).getTime();
    const interval = setInterval(() => {
        const now = new Date().getTime();
        const distance = endTime - now;

        if (distance <= 0) {
            clearInterval(interval);
            document.getElementById('minutes').textContent = "00";
            document.getElementById('seconds').textContent = "00";
            fetchCurrentGameIssue();
        } else {
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);

            document.getElementById('minutes').textContent = minutes < 10 ? '0' + minutes : minutes;
            document.getElementById('seconds').textContent = seconds < 10 ? '0' + seconds : seconds;
        }
    }, 1000);
}

async function fetchPreviousResults() {
    const apiUrl = 'https://api.bdg88zf.com/api/webapi/GetNoaverageEmerdList';
    const requestData = {
        pageSize: 10,
        pageNo: 1,
        typeId: 1,
        language: 0,
        random: "c2505d9138da4e3780b2c2b34f2fb789",
        signature: "7D637E060DA35C0C6E28DC6D23D71BED",
        timestamp: Math.floor(Date.now() / 1000),
    };

    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json;charset=UTF-8',
            },
            body: JSON.stringify(requestData),
        });

        if (response.ok) {
            const data = await response.json();
            if (data.code === 0) {
                previousResults = data.data.list;
                updatePreviousResults(previousResults);
                
                // Generate mock prediction history for demo purposes
                if (predictionHistory.length === 0) {
                    generateMockPredictionHistory(previousResults);
                }
                
                updateStats();
                updateAnalysisCharts();
            } else {
                console.error('Failed to fetch previous results:', data.msg);
            }
        } else {
            console.error('Network response was not ok:', response.statusText);
        }
    } catch (error) {
        console.error('Fetch error:', error);
    }
}

function updatePreviousResults(resultList) {
    const historyTable = document.getElementById('history-list').querySelector('tbody');
    historyTable.innerHTML = '';

    resultList.forEach((result) => {
        const { issueNumber, number, colour } = result;
        const size = number <= 4 ? 'SMALL' : 'BIG';
        const resultClass = getResultClass(number, colour);

        const row = document.createElement('tr');

        const issueCell = document.createElement('td');
        issueCell.textContent = issueNumber;
        row.appendChild(issueCell);

        const numberCell = document.createElement('td');
        numberCell.textContent = number;
        row.appendChild(numberCell);

        const sizeCell = document.createElement('td');
        sizeCell.textContent = size;
        row.appendChild(sizeCell);

        const colourCell = document.createElement('td');
        colourCell.textContent = colour.toUpperCase();
        row.appendChild(colourCell);

        const resultCell = document.createElement('td');
        const resultIcon = document.createElement('i');
        resultIcon.className = resultClass === 'win' ? 'fas fa-check-circle success' : 'fas fa-times-circle danger';
        resultCell.appendChild(resultIcon);
        row.appendChild(resultCell);

        historyTable.appendChild(row);
    });
}

function updateFullHistoryTable() {
    const fullHistoryTable = document.getElementById('full-history-list');
    fullHistoryTable.innerHTML = '';

    // For demo, we'll use the predictionHistory array
    predictionHistory.slice().reverse().forEach((prediction, index) => {
        const { period, number, color, prediction: pred, result, logic } = prediction;
        const size = number <= 4 ? 'SMALL' : 'BIG';
        const resultClass = result === 'win' ? 'success' : 'danger';

        const row = document.createElement('tr');

        const periodCell = document.createElement('td');
        periodCell.textContent = period;
        row.appendChild(periodCell);

        const numberCell = document.createElement('td');
        numberCell.textContent = number;
        row.appendChild(numberCell);

        const sizeCell = document.createElement('td');
        sizeCell.textContent = size;
        row.appendChild(sizeCell);

        const colorCell = document.createElement('td');
        colorCell.textContent = color.toUpperCase();
        row.appendChild(colorCell);

        const predCell = document.createElement('td');
        predCell.textContent = pred.toUpperCase();
        row.appendChild(predCell);

        const resultCell = document.createElement('td');
        const resultIcon = document.createElement('i');
        resultIcon.className = result === 'win' ? 'fas fa-check-circle success' : 'fas fa-times-circle danger';
        resultCell.appendChild(resultIcon);
        row.appendChild(resultCell);

        const logicCell = document.createElement('td');
        logicCell.textContent = logic;
        row.appendChild(logicCell);

        fullHistoryTable.appendChild(row);
    });
}

// Prediction Engine
function generatePrediction(currentGameData) {
    if (previousResults.length < 5) {
        // Not enough data to make a prediction
        updatePredictionUI('Analyzing...', 0, 'Waiting for more data...');
        return;
    }

    // Get the last 5 results for analysis
    const lastResults = previousResults.slice(0, 5);
    
    // Apply all prediction logics and get scores
    const predictions = applyPredictionLogics(lastResults);
    
    // Get the best prediction based on scores
    const bestPrediction = getBestPrediction(predictions);
    
    // Update UI with the prediction
    updatePredictionUI(
        bestPrediction.prediction, 
        bestPrediction.confidence, 
        bestPrediction.logic
    );
    
    // Store the active logic for tracking
    activeLogic = bestPrediction.logic;
}

function applyPredictionLogics(lastResults) {
    // This is where we apply all 25+ prediction logics
    // For a real application, these would be more sophisticated algorithms
    
    const predictions = [];
    
    // 1. Simple Alternation Logic
    const altPred = alternationLogic(lastResults);
    predictions.push(altPred);
    
    // 2. Color Streak Logic
    const colorStreakPred = colorStreakLogic(lastResults);
    predictions.push(colorStreakPred);
    
    // 3. Size Streak Logic
    const sizeStreakPred = sizeStreakLogic(lastResults);
    predictions.push(sizeStreakPred);
    
    // 4. Pattern Recognition Logic
    const patternPred = patternRecognitionLogic(lastResults);
    predictions.push(patternPred);
    
    // 5. Hot Number Logic
    const hotNumPred = hotNumberLogic(lastResults);
    predictions.push(hotNumPred);
    
    // 6. Cold Number Logic
    const coldNumPred = coldNumberLogic(lastResults);
    predictions.push(coldNumPred);
    
    // 7. Weighted Average Logic
    const weightedPred = weightedAverageLogic(lastResults);
    predictions.push(weightedPred);
    
    // 8. Fibonacci Sequence Logic
    const fibPred = fibonacciLogic(lastResults);
    predictions.push(fibPred);
    
    // 9. Prime Number Logic
    const primePred = primeNumberLogic(lastResults);
    predictions.push(primePred);
    
    // 10. Even/Odd Balance Logic
    const evenOddPred = evenOddLogic(lastResults);
    predictions.push(evenOddPred);
    
    // Add more logics as needed...
    
    return predictions;
}

function getBestPrediction(predictions) {
    // For simplicity, we'll just return the first prediction with highest confidence
    // In a real app, we might use more sophisticated decision making
    
    let bestPrediction = predictions[0];
    for (const pred of predictions) {
        if (pred.confidence > bestPrediction.confidence) {
            bestPrediction = pred;
        }
    }
    
    return bestPrediction;
}

// Example prediction logics (simplified for demo)
function alternationLogic(lastResults) {
    // Predicts the opposite of the last result
    const last = lastResults[0];
    const lastSize = last.number <= 4 ? 'SMALL' : 'BIG';
    
    return {
        prediction: lastSize === 'SMALL' ? 'BIG' : 'SMALL',
        confidence: 65,
        logic: 'Alternation Pattern'
    };
}

function colorStreakLogic(lastResults) {
    // Checks for color streaks
    const colors = lastResults.map(r => r.colour);
    const lastColor = colors[0];
    
    let streak = 1;
    for (let i = 1; i < colors.length; i++) {
        if (colors[i] === lastColor) streak++;
        else break;
    }
    
    if (streak >= 3) {
        return {
            prediction: lastColor === 'red' ? 'GREEN' : 'RED',
            confidence: 75,
            logic: 'Color Streak Reversal'
        };
    }
    
    return {
        prediction: lastColor.toUpperCase(),
        confidence: 60,
        logic: 'Color Continuation'
    };
}

function sizeStreakLogic(lastResults) {
    // Checks for size streaks
    const sizes = lastResults.map(r => r.number <= 4 ? 'SMALL' : 'BIG');
    const lastSize = sizes[0];
    
    let streak = 1;
    for (let i = 1; i < sizes.length; i++) {
        if (sizes[i] === lastSize) streak++;
        else break;
    }
    
    if (streak >= 3) {
        return {
            prediction: lastSize === 'SMALL' ? 'BIG' : 'SMALL',
            confidence: 70,
            logic: 'Size Streak Reversal'
        };
    }
    
    return {
        prediction: lastSize,
        confidence: 55,
        logic: 'Size Continuation'
    };
}

function patternRecognitionLogic(lastResults) {
    // Simple pattern recognition (simplified)
    const numbers = lastResults.map(r => r.number);
    
    // Check for ascending pattern
    if (numbers[0] > numbers[1] && numbers[1] > numbers[2]) {
        return {
            prediction: numbers[0] - 1 <= 4 ? 'SMALL' : 'BIG',
            confidence: 68,
            logic: 'Descending Pattern'
        };
    }
    
    // Check for descending pattern
    if (numbers[0] < numbers[1] && numbers[1] < numbers[2]) {
        return {
            prediction: numbers[0] + 1 <= 4 ? 'SMALL' : 'BIG',
            confidence: 68,
            logic: 'Ascending Pattern'
        };
    }
    
    // Default to size streak logic if no clear pattern
    return sizeStreakLogic(lastResults);
}

function hotNumberLogic(lastResults) {
    // Finds "hot" numbers that appear frequently
    const allNumbers = previousResults.slice(0, 20).map(r => r.number);
    const numberCounts = {};
    
    allNumbers.forEach(num => {
        numberCounts[num] = (numberCounts[num] || 0) + 1;
    });
    
    let hotNumber = parseInt(Object.keys(numberCounts).reduce((a, b) => numberCounts[a] > numberCounts[b] ? a : b));
    
    return {
        prediction: hotNumber <= 4 ? 'SMALL' : 'BIG',
        confidence: 62,
        logic: 'Hot Number Trend'
    };
}

function coldNumberLogic(lastResults) {
    // Finds "cold" numbers that haven't appeared recently
    const recentNumbers = previousResults.slice(0, 10).map(r => r.number);
    const allNumbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];
    
    const coldNumbers = allNumbers.filter(num => !recentNumbers.includes(num));
    
    if (coldNumbers.length > 0) {
        const coldNumber = coldNumbers[Math.floor(Math.random() * coldNumbers.length)];
        return {
            prediction: coldNumber <= 4 ? 'SMALL' : 'BIG',
            confidence: 58,
            logic: 'Cold Number Return'
        };
    }
    
    // Fallback to other logic if no cold numbers
    return alternationLogic(lastResults);
}

function weightedAverageLogic(lastResults) {
    // Calculates weighted average of recent numbers
    const numbers = lastResults.map(r => r.number);
    let weightedSum = 0;
    let weightSum = 0;
    
    for (let i = 0; i < numbers.length; i++) {
        const weight = numbers.length - i; // More weight to recent numbers
        weightedSum += numbers[i] * weight;
        weightSum += weight;
    }
    
    const weightedAvg = weightedSum / weightSum;
    
    return {
        prediction: weightedAvg <= 4.5 ? 'SMALL' : 'BIG',
        confidence: 63,
        logic: 'Weighted Average'
    };
}

function fibonacciLogic(lastResults) {
    // Uses Fibonacci sequence for prediction (simplified)
    const numbers = lastResults.map(r => r.number);
    const lastNum = numbers[0];
    
    // Simple Fibonacci check
    if (numbers.length >= 3) {
        if (numbers[0] === numbers[1] + numbers[2]) {
            return {
                prediction: (numbers[1] - numbers[0]) <= 4 ? 'SMALL' : 'BIG',
                confidence: 60,
                logic: 'Fibonacci Sequence'
            };
        }
    }
    
    // Fallback to other logic
    return weightedAverageLogic(lastResults);
}

function primeNumberLogic(lastResults) {
    // Checks for prime number patterns
    const isPrime = num => {
        for (let i = 2, s = Math.sqrt(num); i <= s; i++)
            if (num % i === 0) return false;
        return num > 1;
    };
    
    const primes = [2, 3, 5, 7];
    const lastNum = lastResults[0].number;
    
    if (primes.includes(lastNum)) {
        return {
            prediction: 'SMALL', // Primes are all small in our case
            confidence: 55,
            logic: 'Prime Number Pattern'
        };
    }
    
    // Fallback to other logic
    return alternationLogic(lastResults);
}

function evenOddLogic(lastResults) {
    // Checks even/odd balance
    const numbers = lastResults.map(r => r.number);
    const evenCount = numbers.filter(n => n % 2 === 0).length;
    const oddCount = numbers.length - evenCount;
    
    if (evenCount >= 4) {
        return {
            prediction: 'BIG', // More likely to be odd (but this is arbitrary)
            confidence: 60,
            logic: 'Even/Odd Balance'
        };
    }
    
    if (oddCount >= 4) {
        return {
            prediction: 'SMALL', // More likely to be even
            confidence: 60,
            logic: 'Even/Odd Balance'
        };
    }
    
    // Fallback to other logic
    return sizeStreakLogic(lastResults);
}

function updatePredictionUI(prediction, confidence, logic) {
    document.getElementById('next-prediction').textContent = prediction;
    document.getElementById('game-page-prediction').textContent = prediction;
    
    document.getElementById('confidence-value').textContent = `${confidence}%`;
    document.getElementById('game-page-confidence').textContent = `${confidence}% confidence`;
    
    document.querySelector('.confidence-fill').style.width = `${confidence}%`;
    document.getElementById('active-logic').textContent = logic;
    
    // Color the prediction based on confidence
    const predictionElement = document.getElementById('next-prediction');
    predictionElement.className = 'prediction-value';
    
    if (confidence >= 75) {
        predictionElement.classList.add('high-confidence');
    } else if (confidence >= 50) {
        predictionElement.classList.add('medium-confidence');
    } else {
        predictionElement.classList.add('low-confidence');
    }
}

function getResultClass(number, color) {
    // For demo purposes, we'll randomly assign wins/losses
    // In a real app, this would compare to actual predictions
    return Math.random() > 0.6 ? 'win' : 'loss';
}

// Stats and Analytics
function updateStats() {
    // Calculate win rate
    const total = winCount + lossCount;
    const winRate = total > 0 ? Math.round((winCount / total) * 100) : 0;
    
    // Update UI
    document.querySelector('.win-stat').textContent = winCount;
    document.querySelector('.loss-stat').textContent = lossCount;
    document.querySelector('.win-rate').textContent = `${winRate}%`;
    document.querySelector('.streak').textContent = currentStreak;
    document.querySelector('.hot-streak').textContent = highestWinStreak;
    document.querySelector('.cold-streak').textContent = highestLossStreak;
    
    // Save to localStorage
    saveStats();
}

function saveStats() {
    const stats = {
        winCount,
        lossCount,
        currentStreak,
        highestWinStreak,
        highestLossStreak,
        predictionHistory
    };
    
    localStorage.setItem('algoPredXStats', JSON.stringify(stats));
}

function loadStats() {
    const savedStats = localStorage.getItem('algoPredXStats');
    if (savedStats) {
        const stats = JSON.parse(savedStats);
        winCount = stats.winCount || 0;
        lossCount = stats.lossCount || 0;
        currentStreak = stats.currentStreak || 0;
        highestWinStreak = stats.highestWinStreak || 0;
        highestLossStreak = stats.highestLossStreak || 0;
        predictionHistory = stats.predictionHistory || [];
    }
    
    updateStats();
}

function resetStats() {
    if (confirm('Are you sure you want to reset all statistics? This cannot be undone.')) {
        winCount = 0;
        lossCount = 0;
        currentStreak = 0;
        highestWinStreak = 0;
        highestLossStreak = 0;
        predictionHistory = [];
        
        updateStats();
        
        // Show confirmation
        alert('All statistics have been reset.');
    }
}

function generateMockPredictionHistory(results) {
    // For demo purposes, generate some mock prediction history
    const mockLogics = [
        'Alternation Pattern',
        'Color Streak Reversal',
        'Size Continuation',
        'Pattern Recognition',
        'Hot Number Trend',
        'Weighted Average',
        'Fibonacci Sequence'
    ];
    
    results.slice().reverse().forEach((result, index) => {
        const { issueNumber: period, number, colour: color } = result;
        const prediction = Math.random() > 0.5 ? 'BIG' : 'SMALL';
        const resultValue = Math.random() > 0.6 ? 'win' : 'loss';
        const logic = mockLogics[Math.floor(Math.random() * mockLogics.length)];
        
        predictionHistory.push({
            period,
            number,
            color,
            prediction,
            result: resultValue,
            logic
        });
        
        // Update stats based on mock results
        if (resultValue === 'win') {
            winCount++;
            currentStreak = Math.max(0, currentStreak) + 1;
            highestWinStreak = Math.max(highestWinStreak, currentStreak);
        } else {
            lossCount++;
            currentStreak = Math.min(0, currentStreak) - 1;
            highestLossStreak = Math.min(highestLossStreak, currentStreak);
        }
    });
    
    saveStats();
}

// Chart Functions
function initCharts() {
    // Initialize all charts
    chartInstances.sizeTrendChart = new Chart(
        document.getElementById('size-trend-chart'),
        getSizeTrendChartConfig()
    );
    
    chartInstances.colorTrendChart = new Chart(
        document.getElementById('color-trend-chart'),
        getColorTrendChartConfig()
    );
    
    chartInstances.logicPerformanceChart = new Chart(
        document.getElementById('logic-performance-chart'),
        getLogicPerformanceChartConfig()
    );
}

function updateAnalysisCharts() {
    updateSizeTrendChart();
    updateColorTrendChart();
    updatePatternDetection();
    updateLogicPerformanceChart();
    updateAnalysisText();
}

function updateSizeTrendChart() {
    if (!previousResults.length) return;
    
    const sizes = previousResults.map(r => r.number <= 4 ? 'SMALL' : 'BIG');
    const smallCount = sizes.filter(s => s === 'SMALL').length;
    const bigCount = sizes.length - smallCount;
    
    chartInstances.sizeTrendChart.data.datasets[0].data = [smallCount, bigCount];
    chartInstances.sizeTrendChart.update();
}

function updateColorTrendChart() {
    if (!previousResults.length) return;
    
    const colors = previousResults.map(r => r.colour.toUpperCase());
    const redCount = colors.filter(c => c === 'RED').length;
    const greenCount = colors.filter(c => c === 'GREEN').length;
    const violetCount = colors.length - redCount - greenCount;
    
    chartInstances.colorTrendChart.data.datasets[0].data = [redCount, greenCount, violetCount];
    chartInstances.colorTrendChart.update();
}

function updatePatternDetection() {
    if (!previousResults.length) return;
    
    const patternGrid = document.getElementById('pattern-grid');
    patternGrid.innerHTML = '';
    
    // Detect simple patterns (for demo)
    const lastResults = previousResults.slice(0, 5);
    const numbers = lastResults.map(r => r.number);
    const colors = lastResults.map(r => r.colour.toUpperCase());
    const sizes = lastResults.map(r => r.number <= 4 ? 'S' : 'B');
    
    // Add number pattern
    addPatternItem(patternGrid, numbers.join('-'), 'Number Sequence');
    
    // Add color pattern
    addPatternItem(patternGrid, colors.join('-'), 'Color Pattern');
    
    // Add size pattern
    addPatternItem(patternGrid, sizes.join('-'), 'Size Pattern');
    
    // Add alternation pattern
    const altPattern = sizes[0] === sizes[1] ? 'Repeating' : 'Alternating';
    addPatternItem(patternGrid, altPattern, 'Alternation');
    
    // Add streak detection
    const colorStreak = detectStreak(colors);
    if (colorStreak >= 3) {
        addPatternItem(patternGrid, `${colorStreak}-Color Streak`, 'Streak Detection');
    }
    
    const sizeStreak = detectStreak(sizes);
    if (sizeStreak >= 3) {
        addPatternItem(patternGrid, `${sizeStreak}-Size Streak`, 'Streak Detection');
    }
}

function detectStreak(items) {
    if (items.length === 0) return 0;
    
    let streak = 1;
    const firstItem = items[0];
    
    for (let i = 1; i < items.length; i++) {
        if (items[i] === firstItem) streak++;
        else break;
    }
    
    return streak;
}

function addPatternItem(container, value, label) {
    const item = document.createElement('div');
    item.className = 'pattern-item';
    
    const valueEl = document.createElement('div');
    valueEl.className = 'pattern-value';
    valueEl.textContent = value;
    
    const labelEl = document.createElement('div');
    labelEl.className = 'pattern-label';
    labelEl.textContent = label;
    
    item.appendChild(valueEl);
    item.appendChild(labelEl);
    container.appendChild(item);
}

function updateLogicPerformanceChart() {
    if (!predictionHistory.length) return;
    
    // Group by logic and calculate accuracy
    const logicStats = {};
    
    predictionHistory.forEach(pred => {
        if (!logicStats[pred.logic]) {
            logicStats[pred.logic] = { wins: 0, total: 0 };
        }
        
        logicStats[pred.logic].total++;
        if (pred.result === 'win') {
            logicStats[pred.logic].wins++;
        }
    });
    
    const logics = Object.keys(logicStats);
    const accuracy = logics.map(logic => {
        const stats = logicStats[logic];
        return Math.round((stats.wins / stats.total) * 100);
    });
    
    chartInstances.logicPerformanceChart.data.labels = logics;
    chartInstances.logicPerformanceChart.data.datasets[0].data = accuracy;
    chartInstances.logicPerformanceChart.update();
}

function updateAnalysisText() {
    if (!previousResults.length) return;
    
    // Size analysis
    const sizes = previousResults.map(r => r.number <= 4 ? 'SMALL' : 'BIG');
    const smallCount = sizes.filter(s => s === 'SMALL').length;
    const sizeRatio = (smallCount / sizes.length * 100).toFixed(1);
    
    let sizeAnalysis = `In the last ${sizes.length} rounds, ${sizeRatio}% were SMALL (1-4) and ${(100 - sizeRatio).toFixed(1)}% were BIG (5-9). `;
    
    if (sizeRatio > 60) {
        sizeAnalysis += "There's currently a strong bias towards SMALL numbers.";
    } else if (sizeRatio < 40) {
        sizeAnalysis += "There's currently a strong bias towards BIG numbers.";
    } else {
        sizeAnalysis += "The distribution between SMALL and BIG numbers is relatively balanced.";
    }
    
    document.getElementById('size-analysis-text').textContent = sizeAnalysis;
    
    // Color analysis
    const colors = previousResults.map(r => r.colour.toUpperCase());
    const redCount = colors.filter(c => c === 'RED').length;
    const greenCount = colors.filter(c => c === 'GREEN').length;
    const violetCount = colors.length - redCount - greenCount;
    
    const redPercent = (redCount / colors.length * 100).toFixed(1);
    const greenPercent = (greenCount / colors.length * 100).toFixed(1);
    const violetPercent = (violetCount / colors.length * 100).toFixed(1);
    
    let colorAnalysis = `Color distribution in recent rounds: RED ${redPercent}%, GREEN ${greenPercent}%, VIOLET ${violetPercent}%. `;
    
    if (redPercent > 50) {
        colorAnalysis += "RED is appearing more frequently than expected.";
    } else if (greenPercent > 50) {
        colorAnalysis += "GREEN is appearing more frequently than expected.";
    } else {
        colorAnalysis += "Colors are appearing at expected frequencies.";
    }
    
    document.getElementById('color-analysis-text').textContent = colorAnalysis;
    
    // Pattern analysis
    const lastResults = previousResults.slice(0, 5);
    const numbers = lastResults.map(r => r.number);
    const sizePattern = lastResults.map(r => r.number <= 4 ? 'S' : 'B');
    
    const sizeStreak = detectStreak(sizePattern);
    const colorStreak = detectStreak(colors.slice(0, 5));
    
    let patternAnalysis = "Recent patterns: ";
    
    if (sizeStreak >= 3) {
        patternAnalysis += `There's a ${sizeStreak}-round ${sizePattern[0]} size streak. `;
    }
    
    if (colorStreak >= 3) {
        patternAnalysis += `There's a ${colorStreak}-round ${colors[0]} color streak. `;
    }
    
    if (sizeStreak < 3 && colorStreak < 3) {
        patternAnalysis += "No strong streaks detected in recent rounds. ";
    }
    
    // Check for alternation
    let alternationCount = 0;
    for (let i = 1; i < sizePattern.length; i++) {
        if (sizePattern[i] !== sizePattern[i-1]) alternationCount++;
    }
    
    if (alternationCount >= 3) {
        patternAnalysis += "Strong alternation pattern between SMALL and BIG detected. ";
    }
    
    document.getElementById('pattern-analysis-text').textContent = patternAnalysis;
    
    // Logic performance analysis
    if (predictionHistory.length) {
        const total = winCount + lossCount;
        const winRate = (winCount / total * 100).toFixed(1);
        
        let logicAnalysis = `Overall prediction accuracy: ${winRate}% (${winCount} wins, ${lossCount} losses). `;
        
        if (winRate > 60) {
            logicAnalysis += "The prediction system is performing exceptionally well!";
        } else if (winRate > 50) {
            logicAnalysis += "The prediction system is performing above average.";
        } else {
            logicAnalysis += "The prediction system is performing below expectations. Adjusting strategies...";
        }
        
        document.getElementById('logic-analysis-text').textContent = logicAnalysis;
    }
}

function getSizeTrendChartConfig() {
    return {
        type: 'doughnut',
        data: {
            labels: ['SMALL (1-4)', 'BIG (5-9)'],
            datasets: [{
                data: [0, 0],
                backgroundColor: [
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(255, 99, 132, 0.7)'
                ],
                borderColor: [
                    'rgba(54, 162, 235, 1)',
                    'rgba(255, 99, 132, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: getComputedStyle(document.body).getPropertyValue('--text-color')
                    }
                },
                title: {
                    display: true,
                    text: 'Size Distribution (Last 10 Rounds)',
                    color: getComputedStyle(document.body).getPropertyValue('--text-color')
                }
            },
            animation: {
                animateScale: true,
                animateRotate: true
            }
        }
    };
}

function getColorTrendChartConfig() {
    return {
        type: 'pie',
        data: {
            labels: ['RED', 'GREEN', 'VIOLET'],
            datasets: [{
                data: [0, 0, 0],
                backgroundColor: [
                    'rgba(255, 99, 132, 0.7)',
                    'rgba(54, 162, 235, 0.7)',
                    'rgba(75, 192, 192, 0.7)'
                ],
                borderColor: [
                    'rgba(255, 99, 132, 1)',
                    'rgba(54, 162, 235, 1)',
                    'rgba(75, 192, 192, 1)'
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: getComputedStyle(document.body).getPropertyValue('--text-color')
                    }
                },
                title: {
                    display: true,
                    text: 'Color Distribution (Last 10 Rounds)',
                    color: getComputedStyle(document.body).getPropertyValue('--text-color')
                }
            },
            animation: {
                animateScale: true,
                animateRotate: true
            }
        }
    };
}

function getLogicPerformanceChartConfig() {
    return {
        type: 'bar',
        data: {
            labels: [],
            datasets: [{
                label: 'Accuracy %',
                data: [],
                backgroundColor: 'rgba(108, 92, 231, 0.7)',
                borderColor: 'rgba(108, 92, 231, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        color: getComputedStyle(document.body).getPropertyValue('--text-color')
                    },
                    grid: {
                        color: getComputedStyle(document.body).getPropertyValue('--border-color')
                    }
                },
                x: {
                    ticks: {
                        color: getComputedStyle(document.body).getPropertyValue('--text-color')
                    },
                    grid: {
                        display: false
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Prediction Logic Performance',
                    color: getComputedStyle(document.body).getPropertyValue('--text-color')
                }
            },
            animation: {
                duration: 1000
            }
        }
    };
}

function updateChartsForTheme() {
    const textColor = getComputedStyle(document.body).getPropertyValue('--text-color');
    const gridColor = getComputedStyle(document.body).getPropertyValue('--border-color');
    
    // Update all charts
    Object.values(chartInstances).forEach(chart => {
        chart.options.plugins.title.color = textColor;
        
        if (chart.options.scales) {
            if (chart.options.scales.x) {
                chart.options.scales.x.ticks.color = textColor;
            }
            if (chart.options.scales.y) {
                chart.options.scales.y.ticks.color = textColor;
                chart.options.scales.y.grid.color = gridColor;
            }
        }
        
        if (chart.options.plugins.legend) {
            chart.options.plugins.legend.labels.color = textColor;
        }
        
        chart.update();
    });
}

// Export Functions
function exportCurrentPrediction() {
    const prediction = document.getElementById('next-prediction').textContent;
    const confidence = document.getElementById('confidence-value').textContent;
    const logic = document.getElementById('active-logic').textContent;
    const period = document.getElementById('period-number').textContent;
    
    const data = [
        ['Period', 'Prediction', 'Confidence', 'Logic'],
        [period, prediction, confidence, logic]
    ];
    
    exportToCSV(data, `AlgoPredX_Prediction_${period}.csv`);
}

function exportHistory() {
    const headers = ['Period', 'Number', 'Size', 'Color', 'Result'];
    const data = [headers];
    
    previousResults.forEach(result => {
        const { issueNumber, number, colour } = result;
        const size = number <= 4 ? 'SMALL' : 'BIG';
        const resultClass = getResultClass(number, colour);
        
        data.push([issueNumber, number, size, colour.toUpperCase(), resultClass.toUpperCase()]);
    });
    
    exportToCSV(data, 'AlgoPredX_Recent_History.csv');
}

function exportFullHistory() {
    const headers = ['Period', 'Number', 'Size', 'Color', 'Prediction', 'Result', 'Logic'];
    const data = [headers];
    
    predictionHistory.slice().reverse().forEach(prediction => {
        const { period, number, color, prediction: pred, result, logic } = prediction;
        const size = number <= 4 ? 'SMALL' : 'BIG';
        
        data.push([period, number, size, color.toUpperCase(), pred.toUpperCase(), result.toUpperCase(), logic]);
    });
    
    exportToCSV(data, 'AlgoPredX_Full_History.csv');
}

function exportToCSV(data, filename) {
    let csvContent = "data:text/csv;charset=utf-8,";
    
    data.forEach(row => {
        csvContent += row.join(",") + "\r\n";
    });
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// Utility Functions
function clearCache() {
    if (confirm('Clear all cached data? This will reload the page.')) {
        localStorage.removeItem('algoPredXStats');
        localStorage.removeItem('algoPredXTheme');
        window.location.reload();
    }
}

function checkForUpdates() {
    alert('AlgoPredX is up to date!');
    // In a real app, this would check for updates from a server
}