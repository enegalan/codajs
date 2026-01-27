// Utility process entry point
// This process handles isolated script execution

console.log('Utility process started');

// This will be expanded with isolated-vm integration
process.on('message', (message) => {
  console.log('Utility process received message:', message);
});
