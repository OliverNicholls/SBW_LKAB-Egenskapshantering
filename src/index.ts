const app = document.getElementById('app')!;

let selectedElements: Map<string, any> = new Map();
let selectedObjectInfoMap: Map<string, any> = new Map();
let expandedGroups: Set<string> = new Set();
let pinnedPsets: Set<string> = new Set();
let activeTab: 'properties' | 'demolition-stages' | 'demolition-sequence' = 'properties';
let demolitionStages: Array<{ id: string; name: string; order_index: number; color: string }> = [];
let elementToStageMap: Map<string, string> = new Map();
let currentLanguage: 'en' | 'sv' = 'en';

function loadLanguage() {
  const stored = localStorage.getItem('appLanguage');
  if (stored === 'sv' || stored === 'en') {
    currentLanguage = stored;
  }
}

function saveLanguage() {
  localStorage.setItem('appLanguage', currentLanguage);
}

function loadPinnedPsets() {
  const stored = localStorage.getItem('pinnedPsets');
  if (stored) {
    pinnedPsets = new Set(JSON.parse(stored));
  }
}

function savePinnedPsets() {
  localStorage.setItem('pinnedPsets', JSON.stringify(Array.from(pinnedPsets)));
}

function loadDemolitionData() {
  const stagesStored = localStorage.getItem('demolitionStages');
  if (stagesStored) {
    demolitionStages = JSON.parse(stagesStored);
  }
  const mappingStored = localStorage.getItem('elementToStageMap');
  if (mappingStored) {
    elementToStageMap = new Map(JSON.parse(mappingStored));
  }
}

function saveDemolitionData() {
  localStorage.setItem('demolitionStages', JSON.stringify(demolitionStages));
  localStorage.setItem('elementToStageMap', JSON.stringify(Array.from(elementToStageMap.entries())));
}

function formatValue(value: any, unit?: string): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'object') return JSON.stringify(value);
  return String(value) + (unit ? ' ' + unit : '');
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function updateColorCoding() {
  const colorMap: Record<string, string> = {};

  elementToStageMap.forEach((stageId, guid) => {
    const stage = demolitionStages.find(s => s.id === stageId);
    if (stage) {
      colorMap[guid] = stage.color;
    }
  });

  console.log('Color map to apply:', colorMap);
  console.log('Calling colorCodeObjects()...');

  window.StreamBIM.colorCodeObjects(colorMap)
    .then((result: any) => {
      console.log('colorCodeObjects result:', result);
    })
    .catch((err: any) => {
      console.error('Failed to apply color coding:', err);
    });
}

function renderHeader(): string {
  return `
    <div style="padding: 20px; background: #f5f5f5; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center;">
      <h1 style="margin: 0; font-size: 18px; color: #333; font-weight: 600;">Data Supplementor</h1>
      <div style="display: flex; gap: 12px; align-items: center;">
        <div style="display: flex; gap: 8px;">
          <button data-action="set-language" data-language="en" style="padding: 4px; background: ${currentLanguage === 'en' ? '#e3f2fd' : 'transparent'}; border: ${currentLanguage === 'en' ? '2px solid #0066cc' : '2px solid transparent'}; cursor: pointer; transition: all 0.2s; border-radius: 4px; display: flex; align-items: center;" title="English"><img src="./icons8-united-kingdom-50.png" alt="English" style="width: 28px; height: 28px; display: block;"></button>
          <button data-action="set-language" data-language="sv" style="padding: 4px; background: ${currentLanguage === 'sv' ? '#e3f2fd' : 'transparent'}; border: ${currentLanguage === 'sv' ? '2px solid #0066cc' : '2px solid transparent'}; cursor: pointer; transition: all 0.2s; border-radius: 4px; display: flex; align-items: center;" title="Svenska"><img src="./icons8-sweden-50.png" alt="Swedish" style="width: 28px; height: 28px; display: block;"></button>
        </div>
        ${selectedElements.size > 0 ? `<button data-action="clear-all" style="padding: 8px 16px; background: #f44336; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 600; transition: background-color 0.2s;">Clear All</button>` : ''}
      </div>
    </div>
    <div style="display: flex; gap: 0; border-bottom: 1px solid #ddd; background: white; padding: 0;">
      <button data-tab="properties" style="flex: 1; padding: 14px 16px; background: ${activeTab === 'properties' ? 'white' : '#f5f5f5'}; color: ${activeTab === 'properties' ? '#0066cc' : '#666'}; border: none; border-bottom: ${activeTab === 'properties' ? '3px solid #0066cc' : 'none'}; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s;">
        Properties
      </button>
      <button data-tab="demolition-stages" style="flex: 1; padding: 14px 16px; background: ${activeTab === 'demolition-stages' ? 'white' : '#f5f5f5'}; color: ${activeTab === 'demolition-stages' ? '#0066cc' : '#666'}; border: none; border-bottom: ${activeTab === 'demolition-stages' ? '3px solid #0066cc' : 'none'}; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s;">
        Demolition Stages
      </button>
      <button data-tab="demolition-sequence" style="flex: 1; padding: 14px 16px; background: ${activeTab === 'demolition-sequence' ? 'white' : '#f5f5f5'}; color: ${activeTab === 'demolition-sequence' ? '#0066cc' : '#666'}; border: none; border-bottom: ${activeTab === 'demolition-sequence' ? '3px solid #0066cc' : 'none'}; cursor: pointer; font-size: 13px; font-weight: 600; transition: all 0.2s;">
        Demolition Sequence
      </button>
    </div>
  `;
}

function renderElementProperties(objInfo: any, guid: string): string {
  if (!objInfo) return '<div style="color: #999; padding: 12px;">No information available</div>';

  let html = '';
  const assignedStageId = elementToStageMap.get(guid);
  const assignedStage = demolitionStages.find(s => s.id === assignedStageId);

  let groupIndex = 0;
  const customDataGroupId = `custom-data-${guid}`;
  const customDataExpanded = expandedGroups.has(customDataGroupId);
  const customDataPinned = pinnedPsets.has('Custom Data');

  // Add Custom Data pset with demolition status
  const customDataBgColor = assignedStage ? assignedStage.color : '#666';
  const customDataBgLight = assignedStage ? hexToRgba(assignedStage.color, 0.15) : '#f0f0f0';

  html += `
    <div style="margin-bottom: 12px;">
      <div style="display: flex; gap: 8px; align-items: center;">
        <button data-group-id="${customDataGroupId}" style="flex: 1; padding: 10px 12px; background: ${customDataBgLight}; border: 1px solid ${customDataBgColor}; border-left: 4px solid ${customDataBgColor}; border-radius: 2px; cursor: pointer; text-align: left; font-size: 13px; color: ${customDataBgColor}; font-weight: 600; display: flex; justify-content: space-between; align-items: center; transition: all 0.2s;">
          <span>Custom Data (1)</span>
          <span style="transform: rotate(${customDataExpanded ? '180deg' : '0deg'}); transition: transform 0.2s; display: inline-block;">▼</span>
        </button>
        <button data-action="toggle-pin-pset" data-pset="Custom Data" style="padding: 8px 10px; background: ${customDataPinned ? customDataBgColor : '#f0f0f0'}; color: ${customDataPinned ? 'white' : '#666'}; border: 1px solid ${customDataPinned ? customDataBgColor : '#ddd'}; border-radius: 4px; cursor: pointer; font-size: 14px; font-weight: bold; min-width: 40px; text-align: center; transition: all 0.2s;" title="${customDataPinned ? 'Unpin this property set' : 'Pin this property set'}">
          ${customDataPinned ? '📌' : '📍'}
        </button>
      </div>
      ${customDataExpanded ? `
        <div style="padding: 8px; border-left: 2px solid #e0e0e0; margin-top: 4px;">
          <div style="margin-bottom: 8px; padding: 6px 8px; background: ${customDataBgLight}; border-radius: 3px; font-size: 12px; border-left: 3px solid ${customDataBgColor};">
            <div style="margin-bottom: 2px;">
              <strong style="color: #333;">Demolition Status:</strong>
              <span style="color: ${customDataBgColor}; font-family: monospace; font-weight: 600;">${assignedStage ? assignedStage.name : 'Not Assigned'}</span>
            </div>
          </div>
        </div>
      ` : ''}
    </div>
  `;

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

function renderDemolitionStagesTab(): string {
  return `
    <div style="padding: 20px; overflow-y: auto; flex: 1;">
      <div style="margin-bottom: 16px;">
        <h2 style="margin: 0 0 12px 0; font-size: 16px; color: #333; font-weight: 600;">Demolition Stages (${demolitionStages.length})</h2>
        <p style="margin: 0; font-size: 13px; color: #666;">Define the stages of demolition and arrange them in order</p>
      </div>
      <div style="margin-bottom: 16px; display: flex; gap: 8px;">
        <input type="text" id="new-stage-name" placeholder="Stage name (e.g., Site Prep)" style="flex: 1; padding: 10px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 13px;">
        <button data-action="add-stage" style="padding: 10px 16px; background: #4caf50; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 600; transition: background-color 0.2s;">Add Stage</button>
      </div>
      ${demolitionStages.length === 0 ? `
        <div style="padding: 20px; background: #f5f5f5; border-radius: 4px; text-align: center; color: #999; font-size: 13px;">
          <p style="margin: 0;">No stages defined yet. Create your first demolition stage above.</p>
        </div>
      ` : `
        <div style="border: 1px solid #ddd; border-radius: 4px; overflow: hidden;">
          ${demolitionStages
            .sort((a, b) => a.order_index - b.order_index)
            .map((stage, index) => `
              <div draggable="true" data-stage-id="${stage.id}" style="display: flex; align-items: center; padding: 12px; border-bottom: ${index < demolitionStages.length - 1 ? '1px solid #eee' : 'none'}; background: white; cursor: move; transition: background-color 0.2s;" class="stage-item">
                <div style="color: #999; margin-right: 12px; cursor: grab; font-size: 18px;">⋮⋮</div>
                <div style="background: ${stage.color}; color: white; border-radius: 50%; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; font-weight: 600; margin-right: 12px; flex-shrink: 0; font-size: 13px;">${index + 1}</div>
                <div style="flex: 1;">
                  <div style="font-weight: 600; color: #333; font-size: 13px;">${stage.name}</div>
                  <div style="font-size: 11px; color: #999;">ID: ${stage.id}</div>
                </div>
                <div style="display: flex; align-items: center; gap: 8px; margin-right: 8px;">
                  <input type="color" data-action="set-stage-color" data-stage-id="${stage.id}" value="${stage.color}" style="width: 40px; height: 32px; border: 1px solid #ddd; border-radius: 3px; cursor: pointer; padding: 0; margin: 0;">
                </div>
                <button data-action="remove-stage" data-stage-id="${stage.id}" style="padding: 6px 12px; background: #f44336; color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 12px; font-weight: 600; transition: background-color 0.2s;">Remove</button>
              </div>
            `).join('')}
        </div>
      `}
    </div>
  `;
}

function renderDemolitionSequencingTab(): string {
  if (demolitionStages.length === 0) {
    return '<div style="color: #999; padding: 40px 20px; text-align: center; flex: 1; display: flex; align-items: center; justify-content: center;">Create demolition stages first in the "Demolition Stages" tab</div>';
  }

  return `
    <div style="padding: 20px; overflow-y: auto; flex: 1;">
      <div style="display: flex; gap: 8px; margin-bottom: 20px;">
        <button data-action="clear-all-isolation" style="flex: 1; padding: 10px 16px; background: #9ca3af; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 600; transition: background-color 0.2s;">Clear Selection</button>
      </div>
      <div style="margin-bottom: 16px;">
        <h2 style="margin: 0 0 12px 0; font-size: 16px; color: #333; font-weight: 600;">Demolition Stages</h2>
        ${selectedElements.size > 0 ? `<p style="margin: 0 0 12px 0; font-size: 13px; color: #666;">Click a stage button to assign all ${selectedElements.size} selected element${selectedElements.size !== 1 ? 's' : ''}</p>` : `<p style="margin: 0 0 12px 0; font-size: 13px; color: #666;">Select elements to assign, or use Highlight to view each stage</p>`}
      </div>
      <div style="display: flex; flex-direction: column; gap: 8px; margin-bottom: 20px;">
        ${demolitionStages
          .sort((a, b) => a.order_index - b.order_index)
          .map((stage, index) => {
            const elementsInStage = Array.from(elementToStageMap.values()).filter(v => v === stage.id).length;
            const hasElements = elementsInStage > 0;
            return `
            <div style="display: flex; gap: 8px; align-items: center;">
              ${selectedElements.size > 0 ? `
                <button data-action="assign-all-to-stage" data-stage-id="${stage.id}" style="flex: 1; padding: 12px 16px; background: ${stage.color}; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 600; transition: background-color 0.2s; text-align: left; display: flex; align-items: center; gap: 12px;">
                  <span style="background: rgba(255,255,255,0.3); border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 12px; font-weight: bold;">${index + 1}</span>
                  <span>${stage.name}${hasElements ? ` (${elementsInStage})` : ''}</span>
                </button>
              ` : `
                <div style="flex: 1; padding: 12px 16px; background: ${stage.color}; color: white; border-radius: 4px; font-size: 13px; font-weight: 600; display: flex; align-items: center; gap: 12px;">
                  <span style="background: rgba(255,255,255,0.3); border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; font-size: 12px; font-weight: bold;">${index + 1}</span>
                  <span>${stage.name}${hasElements ? ` (${elementsInStage})` : ''}</span>
                </div>
              `}
              <button data-action="highlight-stage" data-stage-id="${stage.id}" style="padding: 12px 16px; background: #2196f3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 600; transition: background-color 0.2s; flex-shrink: 0;">Highlight</button>
            </div>
            `;
          })
          .join('')}
      </div>
      ${elementToStageMap.size > 0 ? `
        <div style="margin-bottom: 20px;">
          <button data-action="apply-colors" style="width: 100%; padding: 12px 16px; background: #6b7280; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 600; transition: background-color 0.2s;">Color Code Elements</button>
        </div>
      ` : ''}
      ${selectedElements.size > 0 ? `
        <div style="margin-bottom: 16px; padding: 12px; background: #f0f0f0; border-radius: 4px;">
          <h3 style="margin: 0; font-size: 14px; color: #333; font-weight: 600;">Selected Elements: ${selectedElements.size}</h3>
        </div>
      ` : ''}
      <div style="display: flex; flex-direction: column; gap: 8px; margin-top: 20px; padding-top: 20px; border-top: 1px solid #ddd;">
        ${elementToStageMap.size > 0 ? `
          <div style="display: flex; gap: 8px;">
            <button data-action="export-revit" style="flex: 1; padding: 10px 16px; background: #6b7280; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 600; transition: background-color 0.2s;">Export to Revit Format</button>
            <button data-action="export-config" style="flex: 1; padding: 10px 16px; background: #6b7280; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: 600; transition: background-color 0.2s;">Export Config</button>
          </div>
        ` : ''}
      </div>
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
  let content = '';
  if (activeTab === 'properties') {
    content = renderPropertiesTab();
  } else if (activeTab === 'demolition-stages') {
    content = renderDemolitionStagesTab();
  } else {
    content = renderDemolitionSequencingTab();
  }

  app.innerHTML = `
    <style>
      @keyframes pulse {
        0% { box-shadow: 0 0 0 0 rgba(255, 152, 0, 0.7); }
        70% { box-shadow: 0 0 0 10px rgba(255, 152, 0, 0); }
        100% { box-shadow: 0 0 0 0 rgba(255, 152, 0, 0); }
      }
      .stage-assigned-pulse {
        animation: pulse 0.6s ease-out;
      }
    </style>
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

function generateId(): string {
  return 'stage-' + Math.random().toString(36).substr(2, 9);
}

function setupEventListeners() {
  document.querySelectorAll('[data-tab]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const tab = (e.target as HTMLElement).getAttribute('data-tab') as 'properties' | 'demolition-stages' | 'demolition-sequence';
      activeTab = tab;
      renderUI();
    });
  });

  document.querySelectorAll('[data-action]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      const action = (e.target as HTMLElement).getAttribute('data-action');
      const target = e.target as HTMLElement;

      if (action === 'set-language') {
        const lang = target.getAttribute('data-language');
        if (lang === 'en' || lang === 'sv') {
          currentLanguage = lang;
          saveLanguage();
          renderUI();
        }
      } else if (action === 'clear-all') {
        selectedElements.clear();
        selectedObjectInfoMap.clear();
        elementToStageMap.clear();
        window.StreamBIM.deHighlightAllObjects().catch((err: any) => {
          console.warn('Could not clear highlights:', err);
        });
        saveDemolitionData();
        // Disabled: only call on explicit "Color Code Elements" button
        // updateColorCoding();
        renderUI();
      } else if (action === 'toggle-pin-pset') {
        const pset = target.getAttribute('data-pset');
        if (pset) {
          if (pinnedPsets.has(pset)) {
            pinnedPsets.delete(pset);
          } else {
            pinnedPsets.add(pset);
          }
          savePinnedPsets();
          renderUI();
        }
      } else if (action === 'add-stage') {
        const input = document.getElementById('new-stage-name') as HTMLInputElement;
        const stageName = input?.value.trim();
        if (stageName) {
          const colors = ['#0066cc', '#d32f2f', '#f57c00', '#fbc02d', '#388e3c', '#7b1fa2', '#00bcd4', '#e91e63'];
          const newStage = {
            id: generateId(),
            name: stageName,
            order_index: demolitionStages.length,
            color: colors[demolitionStages.length % colors.length]
          };
          demolitionStages.push(newStage);
          saveDemolitionData();
          renderUI();
        }
      } else if (action === 'highlight-stage') {
        const stageId = target.getAttribute('data-stage-id');
        if (stageId) {
          const guidsInStage: string[] = [];
          elementToStageMap.forEach((value, key) => {
            if (value === stageId) {
              guidsInStage.push(key);
            }
          });
          if (guidsInStage.length > 0) {
            guidsInStage.forEach(guid => {
              window.StreamBIM.highlightObject(guid).catch((err: any) => {
                console.warn('Could not highlight object:', guid, err);
              });
            });
            console.log(`Highlighted ${guidsInStage.length} objects in stage ${stageId}`);
          } else {
            console.log('No elements assigned to this stage');
          }
        }
      } else if (action === 'remove-stage') {
        const stageId = target.getAttribute('data-stage-id');
        if (stageId) {
          demolitionStages = demolitionStages.filter(s => s.id !== stageId);
          elementToStageMap.forEach((value, key) => {
            if (value === stageId) {
              elementToStageMap.delete(key);
            }
          });
          saveDemolitionData();
          // Disabled: only call on explicit "Color Code Elements" button
        // updateColorCoding();
          renderUI();
        }
      } else if (action === 'apply-colors') {
        updateColorCoding();
      } else if (action === 'clear-all-isolation') {
        selectedElements.clear();
        selectedObjectInfoMap.clear();
        window.StreamBIM.showAllObjects().catch((err: any) => {
          console.warn('Could not show all objects:', err);
        });
        window.StreamBIM.deHighlightAllObjects().catch((err: any) => {
          console.warn('Could not clear highlights:', err);
        });
        console.log('Cleared selection and isolation');
        renderUI();
      } else if (action === 'export-revit') {
        const data = Array.from(elementToStageMap.entries()).map(([guid, stageId]) => {
          const stage = demolitionStages.find(s => s.id === stageId);
          return { globalid: guid, demolition_stage: stage?.name || 'Unknown', stage_order: stage?.order_index || '' };
        });

        const csvContent = [
          ['globalid', 'demolition_stage', 'stage_order'],
          ...data.map(row => [row.globalid, row.demolition_stage, row.stage_order])
        ]
          .map(row => row.map(cell => `"${cell}"`).join(','))
          .join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);
        link.setAttribute('href', url);
        link.setAttribute('download', `revit-demolition-stages-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else if (action === 'export-config') {
        console.log('Export config:', { demolitionStages, elementToStageMap: Array.from(elementToStageMap.entries()) });
        const config = {
          stages: demolitionStages,
          assignments: Array.from(elementToStageMap.entries()).map(([guid, stageId]) => ({ guid, stageId }))
        };
        alert('Export config - Coming soon!\n\nConfig: ' + JSON.stringify(config, null, 2));
      } else if (action === 'assign-all-to-stage') {
        const stageId = target.getAttribute('data-stage-id');
        if (stageId) {
          selectedElements.forEach((_elem, guid) => {
            elementToStageMap.set(guid, stageId);
          });
          saveDemolitionData();
          target.classList.add('stage-assigned-pulse');
          setTimeout(() => target.classList.remove('stage-assigned-pulse'), 600);
          // Disabled: only call on explicit "Color Code Elements" button
        // updateColorCoding();
          renderUI();
        }
      } else if (action === 'set-stage-color') {
        const stageId = target.getAttribute('data-stage-id');
        const color = (target as HTMLInputElement).value;
        if (stageId && color) {
          const stage = demolitionStages.find(s => s.id === stageId);
          if (stage) {
            stage.color = color;
            saveDemolitionData();
            // Disabled: only call on explicit "Color Code Elements" button
        // updateColorCoding();
            renderUI();
          }
        }
      }
    });
  });

  const stageItems = document.querySelectorAll('.stage-item');
  let draggedStage: HTMLElement | null = null;

  stageItems.forEach((item) => {
    item.addEventListener('dragstart', (e) => {
      draggedStage = item as HTMLElement;
      (item as HTMLElement).style.opacity = '0.5';
    });

    item.addEventListener('dragend', () => {
      (item as HTMLElement).style.opacity = '1';
      draggedStage = null;
    });

    item.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (draggedStage && draggedStage !== item) {
        const dragEvent = e as DragEvent;
        const rect = (item as HTMLElement).getBoundingClientRect();
        const midpoint = rect.top + rect.height / 2;
        if (dragEvent.clientY < midpoint) {
          item.parentNode?.insertBefore(draggedStage, item);
        } else {
          item.parentNode?.insertBefore(draggedStage, item.nextSibling);
        }
        const reorderedStages = Array.from(document.querySelectorAll('.stage-item')).map((el, idx) => {
          const stageId = (el as HTMLElement).getAttribute('data-stage-id');
          const stage = demolitionStages.find(s => s.id === stageId);
          if (stage) {
            stage.order_index = idx;
          }
          return stage;
        }).filter(s => s !== undefined) as Array<{ id: string; name: string; order_index: number; color: string }>;
        demolitionStages = reorderedStages;
        saveDemolitionData();
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

  document.querySelectorAll('input[type="color"][data-action="set-stage-color"]').forEach((input) => {
    input.addEventListener('change', (e) => {
      const target = e.target as HTMLInputElement;
      const stageId = target.getAttribute('data-stage-id');
      const color = target.value;
      if (stageId && color) {
        const stage = demolitionStages.find(s => s.id === stageId);
        if (stage) {
          stage.color = color;
          saveDemolitionData();
          // Disabled: only call on explicit "Color Code Elements" button
        // updateColorCoding();
          renderUI();
        }
      }
    });
  });
}

loadLanguage();
loadPinnedPsets();
loadDemolitionData();

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
  // Don't call updateColorCoding on launch - only on explicit button click
  console.log('StreamBIM connected');
}).catch((error: any) => {
  console.error('Failed to connect to StreamBIM:', error);
  app.innerHTML = `<div style="padding: 20px; color: #d32f2f; font-size: 13px;">Error connecting to StreamBIM: ${error.message || 'Unknown error'}</div>`;
});
