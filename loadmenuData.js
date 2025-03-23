// loadMenuData.js
const fs = require('fs').promises; // Use the promise-based API for asynchronous file reading
const { MenuItems } = require('./models/menu');

const loadMenuData = async () => {
  try {
    // Read the JSON file asynchronously
    const rawData = await fs.readFile('./menuData.json', 'utf-8');
    const menuData = JSON.parse(rawData);

    // Validate that menuData is an array
    if (!Array.isArray(menuData)) {
      throw new Error('Menu data must be an array');
    }

    // Sync the table (force: true will drop existing table and recreate it)
    await MenuItems.sync({ force: true });
    await MenuItems.bulkCreate(menuData);

    console.log('✅ Menu data loaded successfully!');
  } catch (error) {
    console.error('❌ Error loading menu data:', error);
  }
};

module.exports = loadMenuData;
