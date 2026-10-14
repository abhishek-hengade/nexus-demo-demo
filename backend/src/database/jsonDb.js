const fs = require('fs');
const path = require('path');
const config = require('../config/config');
const seedData = require('./seedData');

class JsonDatabase {
  constructor(filePath) {
    this.filePath = filePath;
    this.ensureDatabase();
  }

  ensureDatabase() {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (!fs.existsSync(this.filePath)) {
      this.saveData(seedData);
    }
  }

  loadData() {
    try {
      if (!fs.existsSync(this.filePath)) {
        this.saveData(seedData);
        return JSON.parse(JSON.stringify(seedData));
      }
      const raw = fs.readFileSync(this.filePath, 'utf-8');
      return JSON.parse(raw);
    } catch (err) {
      console.error('Error reading JSON database, restoring seed data:', err.message);
      this.saveData(seedData);
      return JSON.parse(JSON.stringify(seedData));
    }
  }

  saveData(data) {
    const tempPath = `${this.filePath}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf-8');
    fs.renameSync(tempPath, this.filePath);
  }

  getAll(collection) {
    const data = this.loadData();
    return data[collection] || [];
  }

  getById(collection, id) {
    const items = this.getAll(collection);
    return items.find(item => String(item.id) === String(id)) || null;
  }

  find(collection, predicate) {
    const items = this.getAll(collection);
    return items.filter(predicate);
  }

  insert(collection, item) {
    const data = this.loadData();
    if (!data[collection]) {
      data[collection] = [];
    }
    const newItem = {
      id: item.id || `${collection.slice(0, 3)}-${Date.now()}`,
      createdAt: new Date().toISOString(),
      ...item
    };
    data[collection].unshift(newItem);
    this.saveData(data);
    return newItem;
  }

  update(collection, id, updates) {
    const data = this.loadData();
    if (!data[collection]) return null;

    const index = data[collection].findIndex(item => String(item.id) === String(id));
    if (index === -1) return null;

    data[collection][index] = {
      ...data[collection][index],
      ...updates,
      updatedAt: new Date().toISOString()
    };
    this.saveData(data);
    return data[collection][index];
  }

  delete(collection, id) {
    const data = this.loadData();
    if (!data[collection]) return false;

    const initialLen = data[collection].length;
    data[collection] = data[collection].filter(item => String(item.id) !== String(id));
    const deleted = data[collection].length < initialLen;
    if (deleted) {
      this.saveData(data);
    }
    return deleted;
  }

  reset() {
    this.saveData(seedData);
    return true;
  }
}

const db = new JsonDatabase(config.dbPath);

module.exports = db;
