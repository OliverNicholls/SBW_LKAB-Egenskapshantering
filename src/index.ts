const app = document.getElementById('app')!;

let selectedElements: Map<string, any> = new Map();
let selectedObjectInfoMap: Map<string, any> = new Map();
let expandedGroups: Set<string> = new Set();
let pinnedPsets: Set<string> = new Set();

function loadPinnedPsets() {
  const stored = localStorage.getItem('pinnedPsets');
  if (stored) {
    pinnedPsets = new Set(JSON.parse(stored));
  }
}

function savePinnedPsets() {
  localStorage.setItem('pinnedPsets', JSON.stringify(Array.from(pinnedPsets)));
}

function formatValue(value: any, unit?: string): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value) + (unit ? ' ' + unit : '');
}

function renderHeader(): string {
  return `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding-bottom: 16px; border-bottom: 1px solid #ddd;">
      <h1 style="margin: 0; font-size: 20px; color: #333;">StreamBIM Properties</h1>
      ${selectedElements.size > 0 ? `<button data-action="clear-all" style="padding: 8px 16px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 600;">Clear All</button>` : ''}
    </div>
  `;
}

function renderElementProperties(objInfo: any, guid: string): string {
  if (!objInfo) return '<div style="color: #999; padding: 12px;">No information available</div>';

  let html = '';
  let groupIndex = 0;

  if (Array.isArray(objInfo.groups)) {
    const sortedGroups = [...objInfo.groups].sort((a: any, b: any) => {
      const aIsPinned = pinnedPsets.has(a.label);
      const bIsPinned = pinnedPsets.has(b.label);
      if (aIsPinned !== bIsPinned) return aIsPinned ? -1 : 1;
      return a.label.localeCompare(b.label);
    });

    html += sortedGroups.map((group: any) => {
      const groupId = `group-${guid}-${groupIndex++}`;
      const isExpanded = expandedGroups.has(groupId);
      const props = group.content?.properties || [];
      const totalCount = props.length;
      const isPinned = pinnedPsets.has(group.label);

      return `
        <div style="margin-bottom: 12px;">
          <div style="display: flex; gap: 8px; align-items: center;">
            <button data-group-id="${groupId}" style="flex: 1; padding: 10px 12px; background: ${isPinned ? '#fce4ec' : '#e8f4f8'}; border: 1px solid ${isPinned ? '#c2185b' : '#0066cc'}; border-left: 4px solid ${isPinned ? '#c2185b' : '#0066cc'}; border-radius: 2px; cursor: pointer; text-align: left; font-size: 13px; color: ${isPinned ? '#c2185b' : '#0066cc'}; font-weight: bold; display: flex; justify-content: space-between; align-items: center;">
              <span>${group.label} (${totalCount})</span>
              <span style="transform: rotate(${isExpanded ? '180deg' : '0deg'}); transition: transform 0.2s;">▼</span>
            </button>
            <button data-action="toggle-pin-pset" data-pset="${group.label}" style="padding: 8px 10px; background: ${isPinned ? '#c2185b' : '#f0f0f0'}; color: ${isPinned ? 'white' : '#666'}; border: 1px solid ${isPinned ? '#c2185b' : '#ddd'}; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: bold; min-width: 40px; text-align: center; transition: all 0.2s;" title="${isPinned ? 'Unpin this property set' : 'Pin this property set'}">
              ${isPinned ? '📌' : '📍'}
            </button>
          </div>
          ${isExpanded ? `
            <div style="padding: 8px; border-left: 2px solid #e0e0e0; margin-top: 4px;">
              ${props.map((prop: any) => `
                <div style="margin-bottom: 8px; padding: 6px 8px; background: #fafafa; border-radius: 3px; font-size: 12px;">
                  <div style="margin-bottom: 2px;">
                    <strong style="color: #333;">${prop.key}:</strong>
                    <span style="color: #0066cc; font-family: monospace;">${formatValue(prop.value, prop.unit)}</span>
                  </div>
                  ${prop.measure ? `<div style="color: #999; font-size: 11px;">📏 ${prop.measure}${prop.unit ? ' (' + prop.unit + ')' : ''}</div>` : ''}
                  ${prop.valueType ? `<div style="color: #999; font-size: 11px;">Type: ${prop.valueType}</div>` : ''}
                </div>
              `).join('')}
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  }

  const groupProperties = new Set(['groups']);
  const additionalProps = Object.entries(objInfo)
    .filter(([key]: [string, any]) => !groupProperties.has(key))
    .filter(([_key, value]: [string, any]) => value !== null && value !== undefined && !Array.isArray(value));

  if (additionalProps.length > 0) {
    const groupId = `other-props-${guid}`;
    const isExpanded = expandedGroups.has(groupId);
    html += `
      <div style="margin-bottom: 12px;">
        <button data-group-id="${groupId}" style="width: 100%; padding: 10px 12px; background: #f0f0f0; border: 1px solid #666; border-left: 4px solid #666; border-radius: 2px; cursor: pointer; text-align: left; font-size: 13px; color: #666; font-weight: bold; display: flex; justify-content: space-between; align-items: center;">
          <span>Other Properties (${additionalProps.length})</span>
          <span style="transform: rotate(${isExpanded ? '180deg' : '0deg'}); transition: transform 0.2s;">▼</span>
        </button>
        ${isExpanded ? `
          <div style="padding: 8px; border-left: 2px solid #e0e0e0; margin-top: 4px;">
            ${additionalProps.map(([key, value]: [string, any]) => `
              <div style="margin-bottom: 8px; padding: 6px 8px; background: #fafafa; border-radius: 3px; font-size: 12px;">
                <strong style="color: #333;">${key}:</strong>
                <span style="color: #666; font-family: monospace;">${typeof value === 'object' ? JSON.stringify(value) : formatValue(value)}</span>
              </div>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;
  }

  return html;
}

function renderPropertiesTab(): string {
  if (selectedElements.size === 0) {
    return '<div style="color: #999; padding: 16px; text-align: center; margin-top: 40px;">Click on an element in StreamBIM to inspect it</div>';
  }

  return `
    <div style="margin-bottom: 16px; margin-top: 20px;">
      <h2 style="margin: 0; font-size: 16px; color: #333;">Selected Elements (${selectedElements.size})</h2>
    </div>
    ${Array.from(selectedElements.entries()).map(([guid]: [string, any], index: number) => {
      const objInfo = selectedObjectInfoMap.get(guid);
      return `
        <div style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #ddd;">
          <div style="margin-bottom: 12px; padding: 10px 12px; background: #f0f0f0; border-radius: 4px;">
            <strong style="color: #0066cc; font-size: 14px;">Element ${selectedElements.size > 1 ? '(' + (index + 1) + ')' : ''}</strong>
            <div style="color: #666; font-size: 11px; margin-top: 4px; font-family: monospace;">GUID: ${guid}</div>
          </div>
          ${renderElementProperties(objInfo, guid)}
        </div>
      `;
    }).join('')}
  `;
}

function renderUI() {
  app.innerHTML = renderHeader() + renderPropertiesTab();
  setupEventListeners();
}

function setupEventListeners() {
  document.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const action = (e.target as HTMLElement).getAttribute('data-action');
      if (action === 'clear-all') {
        selectedElements.clear();
        selectedObjectInfoMap.clear();
        window.StreamBIM.deHighlightAllObjects().catch((err: any) => {
          console.warn('Could not clear highlights:', err);
        });
        renderUI();
      } else if (action === 'toggle-pin-pset') {
        const pset = (e.target as HTMLElement).getAttribute('data-pset');
        if (pset) {
          if (pinnedPsets.has(pset)) {
            pinnedPsets.delete(pset);
          } else {
            pinnedPsets.add(pset);
          }
          savePinnedPsets();
          renderUI();
        }
      }
    });
  });

  document.querySelectorAll('[data-group-id]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const groupId = (e.target as HTMLElement).closest('[data-group-id]')?.getAttribute('data-group-id');
      if (groupId) {
        if (expandedGroups.has(groupId)) {
          expandedGroups.delete(groupId);
        } else {
          expandedGroups.add(groupId);
        }
        renderUI();
      }
    });
  });
}

loadPinnedPsets();

window.StreamBIM.connect({
  pickedObject: (element: any) => {
    console.log('Element selected:', element);

    if (!element.shiftKey) {
      selectedElements.clear();
      selectedObjectInfoMap.clear();
      window.StreamBIM.deHighlightAllObjects().catch((err: any) => {
        console.warn('Could not clear highlights:', err);
      });
    }

    selectedElements.set(element.guid, element);

    window.StreamBIM.highlightObject(element.guid).catch((err: any) => {
      console.warn('Could not highlight object:', err);
    });

    window.StreamBIM.getObjectInfo(element.guid)
      .then((objectInfo: any) => {
        console.log('Full Object info:', objectInfo);
        selectedObjectInfoMap.set(element.guid, objectInfo);
        renderUI();
      })
      .catch((err: any) => {
        console.error('Error getting object info:', err);
        renderUI();
      });
  }
}).then(() => {
  renderUI();
  console.log('StreamBIM connected');
}).catch((error: any) => {
  console.error('Failed to connect to StreamBIM:', error);
  app.innerHTML = `<div style="padding: 20px; color: #d32f2f;">Error connecting to StreamBIM: ${error.message || 'Unknown error'}</div>`;
});
