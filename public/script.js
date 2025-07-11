// Global variables
let mealData = [];
const mealOptions = ['yes', 'no', 'maybe', 'late'];
const mealTranslations = {
    'yes': '食',
    'no': '唔食',
    'maybe': '可能',
    'late': '遲'
};

// DOM elements
const mealTableBody = document.getElementById('mealTableBody');
const statusMessage = document.getElementById('statusMessage');

// Initialize the app
document.addEventListener('DOMContentLoaded', function() {
    loadMealData();
    
    // Refresh data every 5 minutes to keep it current
    setInterval(loadMealData, 5 * 60 * 1000);
});

// Load meal data from server
async function loadMealData() {
    try {
        const response = await fetch('/api/meals');
        if (!response.ok) {
            throw new Error('Failed to load meal data');
        }
        
        mealData = await response.json();
        renderTable();
    } catch (error) {
        console.error('Error loading meal data:', error);
        showStatus('載入用餐資料時發生錯誤。請重新整理頁面。', 'error');
    }
}

// Render the meal table
function renderTable() {
    mealTableBody.innerHTML = '';
    
    mealData.forEach(dayData => {
        const row = document.createElement('tr');
        
        // Date column
        const dateCell = document.createElement('td');
        dateCell.textContent = formatDate(dayData.date);
        row.appendChild(dateCell);
        
        // Meal columns
        ['breakfast', 'lunch', 'dinner'].forEach(meal => {
            const cell = document.createElement('td');
            const button = document.createElement('button');
            
            button.className = `meal-cell ${dayData[meal]}`;
            button.textContent = mealTranslations[dayData[meal]];
            button.setAttribute('data-date', dayData.date);
            button.setAttribute('data-meal', meal);
            
            // Add click event listener
            button.addEventListener('click', function() {
                cycleMealOption(this);
            });
            
            // Add keyboard support
            button.addEventListener('keydown', function(e) {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    cycleMealOption(this);
                }
            });
            
            cell.appendChild(button);
            row.appendChild(cell);
        });
        
        mealTableBody.appendChild(row);
    });
}

// Cycle through meal options
function cycleMealOption(button) {
    const currentValue = button.getAttribute('data-meal-value') || 
                        button.className.split(' ').find(cls => mealOptions.includes(cls));
    
    const currentIndex = mealOptions.indexOf(currentValue);
    const nextIndex = (currentIndex + 1) % mealOptions.length;
    const nextValue = mealOptions[nextIndex];
    
    // Update button appearance immediately for responsive feel
    button.className = `meal-cell ${nextValue}`;
    button.textContent = mealTranslations[nextValue];
    button.setAttribute('data-meal-value', nextValue);
    
    // Save to server
    const date = button.getAttribute('data-date');
    const meal = button.getAttribute('data-meal');
    
    saveMealData(date, meal, nextValue);
}

// Save meal data to server
async function saveMealData(date, meal, value) {
    try {
        const response = await fetch('/api/meals', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                date: date,
                meal: meal,
                value: value
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to save meal data');
        }
        
        // Update local data
        const dayData = mealData.find(d => d.date === date);
        if (dayData) {
            dayData[meal] = value;
        }
        
        showStatus('已儲存！', 'success');
        
    } catch (error) {
        console.error('Error saving meal data:', error);
        showStatus('儲存時發生錯誤。請重試。', 'error');
        
        // Revert the button on error
        loadMealData();
    }
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    
    // Check if it's today or tomorrow
    if (date.toDateString() === today.toDateString()) {
        return '今日';
    } else if (date.toDateString() === tomorrow.toDateString()) {
        return '聽日';
    }
    
    // Format as Traditional Chinese style
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekdays = ['日', '一', '二', '三', '四', '五', '六'];
    const weekday = weekdays[date.getDay()];
    
    return `${month}月${day}日 (${weekday})`;
}

// Show status message
function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status ${type} show`;
    
    // Hide after 3 seconds
    setTimeout(() => {
        statusMessage.className = statusMessage.className.replace(' show', '');
    }, 3000);
}

// Handle visibility change (tab switching)
document.addEventListener('visibilitychange', function() {
    if (!document.hidden) {
        // Refresh data when tab becomes visible again
        loadMealData();
    }
});

// Handle page focus
window.addEventListener('focus', function() {
    loadMealData();
});
