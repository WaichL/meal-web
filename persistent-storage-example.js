// Add this to your server.js if you want persistent storage
const CSV_FILE = process.env.NODE_ENV === 'production' 
  ? path.join('/opt/render/project/src/data', 'meal_data.csv')
  : path.join(__dirname, 'meal_data.csv');
