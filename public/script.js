// Global variables
let mealData = [];
const mealOptions = {
    breakfast: ['yes', 'no', 'maybe'], // removed 'late' for breakfast
    lunch: ['yes', 'no', 'maybe', 'late'],
    dinner: ['yes', 'no', 'maybe', 'late']
};
const mealTranslations = {
    'yes': '食',
    'no': '唔食',
    'maybe': '可能',
    'late': '遲'
};

// Generate time options for breakfast (7:00-11:00, 15min intervals)
function generateTimeOptions() {
    const times = [];
    for (let hour = 7; hour <= 11; hour++) {
        for (let minute = 0; minute < 60; minute += 15) {
            if (hour === 11 && minute > 0) break; // Stop at 11:00
            const timeStr = `${hour}:${minute.toString().padStart(2, '0')}`;
            times.push(timeStr);
        }
    }
    return times;
}

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
            const container = document.createElement('div');
            container.className = 'meal-container';
            
            const button = document.createElement('button');
            button.className = `meal-cell ${dayData[meal]}`;
            
            // Display text with time for breakfast
            if (meal === 'breakfast' && dayData[meal] === 'yes') {
                button.textContent = `${mealTranslations[dayData[meal]]} (${dayData.breakfast_time})`;
            } else {
                button.textContent = mealTranslations[dayData[meal]];
            }
            
            button.setAttribute('data-date', dayData.date);
            button.setAttribute('data-meal', meal);
            button.setAttribute('data-meal-value', dayData[meal]);
            if (meal === 'breakfast') {
                button.setAttribute('data-breakfast-time', dayData.breakfast_time);
            }
            
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
            
            container.appendChild(button);
            
            // Add time dropdown for breakfast when it's "食"
            if (meal === 'breakfast' && dayData[meal] === 'yes') {
                const timeSelect = createTimeDropdown(dayData.date, dayData.breakfast_time);
                container.appendChild(timeSelect);
            }
            
            cell.appendChild(container);
            row.appendChild(cell);
        });
        
        mealTableBody.appendChild(row);
    });
}

// Create time dropdown for breakfast
function createTimeDropdown(date, currentTime) {
    const select = document.createElement('select');
    select.className = 'time-select';
    select.setAttribute('data-date', date);
    
    const times = generateTimeOptions();
    times.forEach(time => {
        const option = document.createElement('option');
        option.value = time;
        option.textContent = time;
        if (time === currentTime) {
            option.selected = true;
        }
        select.appendChild(option);
    });
    
    // Handle time change
    select.addEventListener('change', function() {
        const newTime = this.value;
        const date = this.getAttribute('data-date');
        
        // Update local data
        const dayData = mealData.find(d => d.date === date);
        if (dayData) {
            dayData.breakfast_time = newTime;
        }
        
        // Update button display
        const button = document.querySelector(`button[data-date="${date}"][data-meal="breakfast"]`);
        if (button) {
            button.textContent = `${mealTranslations['yes']} (${newTime})`;
            button.setAttribute('data-breakfast-time', newTime);
        }
        
        // Save to server
        saveMealData(date, 'breakfast', 'yes', newTime);
    });
    
    return select;
}

// Cycle through meal options
function cycleMealOption(button) {
    const meal = button.getAttribute('data-meal');
    const currentValue = button.getAttribute('data-meal-value') || 
                        button.className.split(' ').find(cls => ['yes', 'no', 'maybe', 'late'].includes(cls));
    
    const options = mealOptions[meal];
    const currentIndex = options.indexOf(currentValue);
    const nextIndex = (currentIndex + 1) % options.length;
    const nextValue = options[nextIndex];
    
    // Get stored breakfast time for cycling back to "yes"
    let breakfastTime = '8:30'; // default
    if (meal === 'breakfast') {
        breakfastTime = button.getAttribute('data-breakfast-time') || '8:30';
    }
    
    // Update button appearance immediately for responsive feel
    button.className = `meal-cell ${nextValue}`;
    button.setAttribute('data-meal-value', nextValue);
    
    // Update button text and handle time dropdown
    if (meal === 'breakfast' && nextValue === 'yes') {
        button.textContent = `${mealTranslations[nextValue]} (${breakfastTime})`;
        button.setAttribute('data-breakfast-time', breakfastTime);
        
        // Add time dropdown if not exists
        const container = button.parentElement;
        if (!container.querySelector('.time-select')) {
            const timeSelect = createTimeDropdown(button.getAttribute('data-date'), breakfastTime);
            container.appendChild(timeSelect);
        }
    } else {
        button.textContent = mealTranslations[nextValue];
        
        // Remove time dropdown for breakfast if switching away from "yes"
        if (meal === 'breakfast') {
            const container = button.parentElement;
            const timeSelect = container.querySelector('.time-select');
            if (timeSelect) {
                timeSelect.remove();
            }
        }
    }
    
    // Save to server
    const date = button.getAttribute('data-date');
    const time = (meal === 'breakfast' && nextValue === 'yes') ? breakfastTime : '';
    
    saveMealData(date, meal, nextValue, time);
}

// Save meal data to server
async function saveMealData(date, meal, value, breakfastTime = '') {
    try {
        const response = await fetch('/api/meals', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                date: date,
                meal: meal,
                value: value,
                breakfast_time: breakfastTime
            })
        });
        
        if (!response.ok) {
            throw new Error('Failed to save meal data');
        }
        
        // Update local data
        const dayData = mealData.find(d => d.date === date);
        if (dayData) {
            dayData[meal] = value;
            if (meal === 'breakfast') {
                dayData.breakfast_time = breakfastTime;
            }
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
