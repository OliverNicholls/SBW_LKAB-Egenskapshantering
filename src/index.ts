const currentGuidDisplay = document.getElementById('currentGuid');
const statusDisplay = document.getElementById('status');
const elementsList = document.getElementById('elementsList');
const propertiesContainer = document.getElementById('propertiesContainer');
const clearButton = document.getElementById('clearButton');

const STORAGE_KEY = 'streambim-selected-elements';

let selectedElements = new Set<string>();
let currentObject: any = null;

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

function renderProperties(objectInfo: any) {
  if (!propertiesContainer) return;

  if (!objectInfo || !objectInfo.properties) {
    propertiesContainer.innerHTML = '';
    return;
  }

  const properties = objectInfo.properties;
  const entries = Object.entries(properties)
    .slice(0, 10)
    .map(
      ([key, value]) => `
    <div class="property-item">
      <div class="property-key">${key}</div>
      <div class="property-value">${Array.isArray(value) ? value.join(', ') : String(value)}</div>
    </div>
  `,
    )
    .join('');

  propertiesContainer.innerHTML = `
    <div class="properties-section">
      <h3>Properties</h3>
      ${entries}
    </div>
  `;
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
      if (propertiesContainer) {
        propertiesContainer.innerHTML = '';
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

        window.StreamBIM.getObjectInfo(selectedObject.guid)
          .then((objectInfo) => {
            currentObject = objectInfo;
            renderProperties(objectInfo);
          })
          .catch((error) => {
            console.error('Failed to get object info:', error);
          });
      } else {
        currentGuidDisplay.textContent = 'No GUID available';
      }
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
