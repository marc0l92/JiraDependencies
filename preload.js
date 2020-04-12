const fs = require('fs');
// const config = require('./config.json');
const configPath = './config.json';

window.addEventListener('DOMContentLoaded', () => {
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));

    for (const prop in config.initialValues) {
      document.getElementById(prop).value = config.initialValues[prop];
    }

    document.prefixFilters = config.prefixFilters;
  }

  // TODO: Add load settings from localStorage
});