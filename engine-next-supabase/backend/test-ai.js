require('dotenv').config();
const { AIService } = require('./dist/services/AIService.js');
console.log('Starting AI test...');
const start = Date.now();
AIService.classify({title: 'hello', message: 'world'})
  .then(r => {
    console.log('Finished in', Date.now() - start, 'ms', r);
    process.exit(0);
  })
  .catch(e => {
    console.error('Error in test:', e);
    process.exit(1);
  });
