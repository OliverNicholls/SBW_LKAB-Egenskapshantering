import { connectToParent } from 'streambim-widget-api';

async function main() {
  const guidDisplay = document.getElementById('guidDisplay');
  const statusDisplay = document.getElementById('status');

  if (!guidDisplay || !statusDisplay) {
    console.error('Required DOM elements not found');
    return;
  }

  try {
    // Connect to parent StreamBIM instance
    const api = await connectToParent();
    statusDisplay.textContent = 'Connected to StreamBIM';
    statusDisplay.classList.add('active');

    // Listen for object selection events
    api.pickedObject = (selectedObject: any) => {
      if (selectedObject && selectedObject.guid) {
        guidDisplay.textContent = selectedObject.guid;
      } else {
        guidDisplay.textContent = 'No GUID available';
      }
      console.log('Selected object:', selectedObject);
    };
  } catch (error) {
    statusDisplay.textContent =
      'Error connecting to StreamBIM: ' + (error instanceof Error ? error.message : 'Unknown error');
    console.error('Failed to connect to StreamBIM:', error);
  }
}

main();
