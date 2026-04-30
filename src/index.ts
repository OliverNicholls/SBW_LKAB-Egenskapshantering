const currentGuidDisplay = document.getElementById('currentGuid');
const statusDisplay = document.getElementById('status');
const elementsList = document.getElementById('elementsList');
const clearButton = document.getElementById('clearButton');

const STORAGE_KEY = 'streambim-selected-elements';

let selectedElements = new Set<string>();

function loadFromStorage() {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      selectedElements = new Set(JSON.parse(stored));
      renderElements();
    } catch (e) {
      console.error('Failed to load from storage:', e);
    }
  }
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(selectedElements)));
}

function toggleElement(guid: string) {
  if (selectedElements.has(guid)) {
    selectedElements.delete(guid);
  } else {
    selectedElements.add(guid);
  }
  saveToStorage();
  renderElements();
}

function renderElements() {
  if (!elementsList) return;

  if (selectedElements.size === 0) {
    elementsList.innerHTML = '<div class="empty-state">No elements selected. Click on elements in StreamBIM to add them.</div>';
    if (clearButton) (clearButton as HTMLButtonElement).disabled = true;
    return;
  }

  elementsList.innerHTML = Array.from(selectedElements)
    .map(
      (guid) => `
    <div class="element-item selected">
      <input type="checkbox" class="element-checkbox" data-guid="${guid}" checked />
      <div class="element-item-guid">${guid}</div>
    </div>
  `,
    )
    .join('');

  if (clearButton) (clearButton as HTMLButtonElement).disabled = false;

  document.querySelectorAll('.element-checkbox').forEach((checkbox) => {
    checkbox.addEventListener('change', (e) => {
      const guid = (e.target as HTMLInputElement).getAttribute('data-guid');
      if (guid) {
        toggleElement(guid);
      }
    });
  });

  document.querySelectorAll('.element-item').forEach((item) => {
    item.addEventListener('click', (e) => {
      if ((e.target as HTMLElement).tagName !== 'INPUT') {
        const guid = item.querySelector('.element-checkbox')?.getAttribute('data-guid');
        if (guid) {
          toggleElement(guid);
        }
      }
    });
  });
}

if (!currentGuidDisplay || !statusDisplay || !elementsList) {
  console.error('Required DOM elements not found');
} else {
  loadFromStorage();

  if (clearButton) {
    clearButton.addEventListener('click', () => {
      selectedElements.clear();
      saveToStorage();
      renderElements();
      if (currentGuidDisplay) {
        currentGuidDisplay.textContent = 'No element selected';
      }
    });
  }

  window.StreamBIM.connect({
    pickedObject: (selectedObject: any) => {
      if (selectedObject && selectedObject.guid) {
        currentGuidDisplay.textContent = selectedObject.guid;
        selectedElements.add(selectedObject.guid);
        saveToStorage();
        renderElements();
      } else {
        currentGuidDisplay.textContent = 'No GUID available';
      }
      window.StreamBIM.setExpanded(true);
      console.log('Selected object:', selectedObject);
    },
    didContract: async () => {
      await window.StreamBIM.setExpanded(true);
      console.log('Widget tried to contract, re-expanding');
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
