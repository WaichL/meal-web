const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const CSV_FILE = path.join(__dirname, 'meal_data.csv');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Initialize CSV file if it doesn't exist
function initializeCSV() {
    if (!fs.existsSync(CSV_FILE)) {
        fs.writeFileSync(CSV_FILE, 'date,breakfast,lunch,dinner,breakfast_time\n');
    }
}

// Get next 7 days from today
function getNext7Days() {
    const days = [];
    const today = new Date();
    
    for (let i = 0; i < 7; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() + i);
        days.push(date.toISOString().split('T')[0]); // YYYY-MM-DD format
    }
    
    return days;
}

// Read existing data from CSV
function readCSVData() {
    if (!fs.existsSync(CSV_FILE)) {
        return {};
    }
    
    const data = {};
    const csvContent = fs.readFileSync(CSV_FILE, 'utf8');
    const lines = csvContent.trim().split('\n');
    
    // Skip header row
    for (let i = 1; i < lines.length; i++) {
        const [date, breakfast, lunch, dinner, breakfast_time] = lines[i].split(',');
        if (date) {
            data[date] = { breakfast, lunch, dinner, breakfast_time: breakfast_time || '' };
        }
    }
    
    return data;
}

// Write/update CSV data
function writeCSVData(date, meal, value, time = '') {
    const csvData = readCSVData();
    
    // Initialize day if it doesn't exist
    if (!csvData[date]) {
        csvData[date] = {
            breakfast: 'yes',
            lunch: 'no',
            dinner: 'yes',
            breakfast_time: ''
        };
    }
    
    // Update the specific meal
    csvData[date][meal] = value;
    
    // Update breakfast time if provided
    if (meal === 'breakfast' && time !== undefined) {
        csvData[date]['breakfast_time'] = time;
    }
    
    // Write back to CSV
    let csvContent = 'date,breakfast,lunch,dinner,breakfast_time\n';
    for (const [dateKey, meals] of Object.entries(csvData)) {
        csvContent += `${dateKey},${meals.breakfast},${meals.lunch},${meals.dinner},${meals.breakfast_time || ''}\n`;
    }
    
    // Write to temporary file first, then rename for atomic operation
    const tempFile = CSV_FILE + '.tmp';
    fs.writeFileSync(tempFile, csvContent);
    fs.renameSync(tempFile, CSV_FILE);
}

// API Routes
app.get('/api/meals', (req, res) => {
    const next7Days = getNext7Days();
    const csvData = readCSVData();
    
    const mealData = next7Days.map(date => {
        const existing = csvData[date];
        return {
            date: date,
            breakfast: existing ? existing.breakfast : 'yes',
            lunch: existing ? existing.lunch : 'no',
            dinner: existing ? existing.dinner : 'yes',
            breakfast_time: existing ? existing.breakfast_time || '8:30' : '8:30'
        };
    });
    
    res.json(mealData);
});

app.post('/api/meals', (req, res) => {
    const { date, meal, value, breakfast_time } = req.body;
    
    // Validate input
    if (!date || !meal || !value) {
        return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const validMeals = ['breakfast', 'lunch', 'dinner'];
    const validValues = ['yes', 'no', 'maybe', 'late'];
    
    if (!validMeals.includes(meal) || !validValues.includes(value)) {
        return res.status(400).json({ error: 'Invalid meal or value' });
    }
    
    try {
        writeCSVData(date, meal, value, breakfast_time);
        res.json({ success: true });
    } catch (error) {
        console.error('Error writing CSV:', error);
        res.status(500).json({ error: 'Failed to save data' });
    }
});

// Initialize CSV on startup
initializeCSV();

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
});
