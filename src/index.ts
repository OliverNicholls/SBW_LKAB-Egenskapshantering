const guidDisplay = document.getElementById('guidDisplay');
const statusDisplay = document.getElementById('status');

if (!guidDisplay || !statusDisplay) {
  console.error('Required DOM elements not found');
} else {
  window.StreamBIM.connect({
    pickedObject: (selectedObject: any) => {
      if (selectedObject && selectedObject.guid) {
        guidDisplay.textContent = selectedObject.guid;
      } else {
        guidDisplay.textContent = 'No GUID available';
      }
      console.log('Selected object:', selectedObject);
    },
  })
    .then(() => {
      statusDisplay.textContent = 'Connected to StreamBIM';
      statusDisplay.classList.add('active');
    })
    .catch((error: any) => {
      statusDisplay.textContent =
        'Error connecting to StreamBIM: ' + (error instanceof Error ? error.message : 'Unknown error');
      console.error('Failed to connect to StreamBIM:', error);
    });
}
