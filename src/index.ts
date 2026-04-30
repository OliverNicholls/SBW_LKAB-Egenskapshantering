const app = document.getElementById('app')!;

let selectedElements: Map<string, any> = new Map();
let selectedObjectInfoMap: Map<string, any> = new Map();
let expandedGroups: Set<string> = new Set();
let pinnedPsets: Set<string> = new Set();
let activeTab: 'properties' | 'demolition' = 'properties';
let demolitionSequence: string[] = [];

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
    <div style="padding: 20px; background: #f5f5f5; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center;">
      <h1 style="margin: 0; font-size: 18px; color: #333; font-weight: 600;">StreamBIM Widget</h1>
      ${selectedElements.size > 0 ? `<button data-action="clear-all" style="padding: 8px 16px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 600; transition: background-color 0.2s;">Clear All</button>` : ''}
    </div>
    <div style="display: flex; gap: 0; border-bottom: 1px solid #ddd; background: white; padding: 0;">
      <button data-tab="properties" style="flex: 1; padding: 14px 16px; background: ${activeTab === 'properties' ? 'white' : '#f5f5f5'}; color: ${activeTab === 'properties' ? '#0066cc' : '#666'}; border: none; border-bottom: ${activeTab === 'properties' ? '3px solid #0066cc' : 'none'}; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s;">
        Properties
      </button>
      <button data-tab="demolition" style="flex: 1; padding: 14px 16px; background: ${activeTab === 'demolition' ? 'white' : '#f5f5f5'}; color: ${activeTab === 'demolition' ? '#0066cc' : '#666'}; border: none; border-bottom: ${activeTab === 'demolition' ? '3px solid #0066cc' : 'none'}; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s;">
        Demolition Sequencing
      </button>
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
            <button data-group-id="${groupId}" style="flex: 1; padding: 10px 12px; background: ${isPinned ? '#fce4ec' : '#e8f4f8'}; border: 1px solid ${isPinned ? '#c2185b' : '#0066cc'}; border-left: 4px solid ${isPinned ? '#c2185b' : '#0066cc'}; border-radius: 2px; cursor: pointer; text-align: left; font-size: 13px; color: ${isPinned ? '#c2185b' : '#0066cc'}; font-weight: 600; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s;">
              <span>${group.label} (${totalCount})</span>
              <span style="transform: rotate(${isExpanded ? '180deg' : '0deg'}); transition: transform 0.2s; display: inline-block;">▼</span>
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
        <button data-group-id="${groupId}" style="width: 100%; padding: 10px 12px; background: #f0f0f0; border: 1px solid #666; border-left: 4px solid #666; border-radius: 2px; cursor: pointer; text-align: left; font-size: 13px; color: #666; font-weight: 600; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s;">
          <span>Other Properties (${additionalProps.length})</span>
          <span style="transform: rotate(${isExpanded ? '180deg' : '0deg'}); transition: transform 0.2s; display: inline-block;">▼</span>
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
    return '<div style="color: #999; padding: 40px 20px; text-align: center; flex: 1; display: flex; align-items: center; justify-content: center;">Click on an element in StreamBIM to inspect it</div>';
  }

  return `
    <div style="padding: 20px;">
      <div style="margin-bottom: 16px;">
        <h2 style="margin: 0; font-size: 16px; color: #333; font-weight: 600;">Selected Elements (${selectedElements.size})</h2>
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
    </div>
  `;
}

function renderDemolitionSequencingTab(): string {
  if (selectedElements.size === 0) {
    return '<div style="color: #999; padding: 40px 20px; text-align: center; flex: 1; display: flex; align-items: center; justify-content: center;">Select elements to create a demolition sequence</div>';
  }

  return `
    <div style="padding: 20px; overflow-y: auto; flex: 1;">
      <div style="margin-bottom: 16px;">
        <h2 style="margin: 0 0 12px 0; font-size: 16px; color: #333; font-weight: 600;">Demolition Sequence (${demolitionSequence.length}/${selectedElements.size})</h2>
      </div>
      ${demolitionSequence.length === 0 ? `
        <div style="padding: 20px; background: #e3f2fd; border-radius: 4px; margin-bottom: 16px; text-align: center; color: #0066cc; font-size: 13px;">
          <p style="margin: 0;">Add selected elements to the demolition sequence below</p>
        </div>
      ` : ''}
      <div style="margin-bottom: 16px; display: flex; gap: 8px;">
        <button data-action="add-to-sequence" style="padding: 10px 16px; background: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 600; transition: background-color 0.2s;">Add Selected to Sequence</button>
        ${demolitionSequence.length > 0 ? `<button data-action="clear-sequence" style="padding: 10px 16px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 600; transition: background-color 0.2s;">Clear Sequence</button>` : ''}
      </div>
      ${demolitionSequence.length > 0 ? `
        <div style="border: 1px solid #ddd; border-radius: 4px; overflow: hidden; margin-bottom: 20px;">
          ${demolitionSequence.map((guid, index) => {
            const elem = selectedElements.get(guid);
            const objInfo = selectedObjectInfoMap.get(guid);
            const entityName = objInfo?.properties?.['Name'] || objInfo?.properties?.['name'] || 'Unknown Element';
            return `
              <div style="display: flex; align-items: center; padding: 12px; border-bottom: ${index < demolitionSequence.length - 1 ? '1px solid #eee' : 'none'}; background: ${index % 2 === 0 ? '#fafafa' : 'white'}; transition: background-color 0.2s;">
                <div style="background: #0066cc; color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-weight: 600; margin-right: 12px; flex-shrink: 0; font-size: 13px;">${index + 1}</div>
                <div style="flex: 1;">
                  <div style="font-weight: 600; color: #333; font-size: 13px;">${entityName}</div>
                  <div style="font-size: 11px; color: #999; font-family: monospace;">${guid}</div>
                </div>
                <button data-action="remove-from-sequence" data-guid="${guid}" style="padding: 6px 12px; background: #f44336; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 12px; font-weight: 600; transition: background-color 0.2s;">Remove</button>
              </div>
            `;
          }).join('')}
        </div>
        <div style="display: flex; gap: 8px; margin-bottom: 20px;">
          <button data-action="export-revit" style="flex: 1; padding: 10px 16px; background: #1976d2; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 600; transition: background-color 0.2s;">Export to Revit Format</button>
          <button data-action="export-config" style="flex: 1; padding: 10px 16px; background: #388e3c; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 600; transition: background-color 0.2s;">Export Config</button>
        </div>
      ` : ''}
    </div>
  `;
}

function renderFooter(): string {
  return `
    <div style="padding: 12px 20px; background: #1a1a1a; border-top: 1px solid #333; display: flex; justify-content: space-between; align-items: center;">
      <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
        <img src="./Tikab_Logo_Blue.png" alt="Tikab" style="height: 32px; width: auto; display: block;">
        <span style="font-size: 12px; color: #999;">Developed by Tikab</span>
      </div>
      <div style="display: flex; align-items: center; gap: 8px; flex: 1; justify-content: flex-end;">
        <span style="font-size: 12px; color: #999;">on behalf of</span>
        <img src="./LKAB_logo_white.svg" alt="LKAB" style="height: 28px; width: auto; display: block;">
      </div>
    </div>
  `;
}

function renderUI() {
  const content = activeTab === 'properties' ? renderPropertiesTab() : renderDemolitionSequencingTab();
  app.innerHTML = `
    <div style="display: flex; flex-direction: column; height: 100vh; background: white;">
      ${renderHeader()}
      <div style="flex: 1; overflow-y: auto; display: flex; flex-direction: column;">
        ${content}
      </div>
      ${renderFooter()}
    </div>
  `;
  setupEventListeners();
}

function setupEventListeners() {
  document.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const tab = (e.target as HTMLElement).getAttribute('data-tab') as 'properties' | 'demolition';
      activeTab = tab;
      renderUI();
    });
  });

  document.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const action = (e.target as HTMLElement).getAttribute('data-action');
      if (action === 'clear-all') {
        selectedElements.clear();
        selectedObjectInfoMap.clear();
        demolitionSequence = [];
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
      } else if (action === 'add-to-sequence') {
        selectedElements.forEach((_, guid) => {
          if (!demolitionSequence.includes(guid)) {
            demolitionSequence.push(guid);
          }
        });
        renderUI();
      } else if (action === 'clear-sequence') {
        demolitionSequence = [];
        renderUI();
      } else if (action === 'remove-from-sequence') {
        const guid = (e.target as HTMLElement).getAttribute('data-guid');
        if (guid) {
          demolitionSequence = demolitionSequence.filter((g) => g !== guid);
          renderUI();
        }
      } else if (action === 'export-revit') {
        console.log('Export to Revit format:', demolitionSequence);
        alert('Export to Revit format - Coming soon!\n\nSequence: ' + demolitionSequence.join(', '));
      } else if (action === 'export-config') {
        console.log('Export config:', demolitionSequence);
        alert('Export config - Coming soon!\n\nSequence: ' + JSON.stringify({ demolitionSequence }, null, 2));
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
  app.innerHTML = `<div style="padding: 20px; color: #d32f2f; font-size: 13px;">Error connecting to StreamBIM: ${error.message || 'Unknown error'}</div>`;
});
