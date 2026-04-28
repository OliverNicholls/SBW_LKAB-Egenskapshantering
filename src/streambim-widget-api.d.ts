export interface StreamBIMCallbacks {
  pickedObject?: (result: { guid: string; point: [number, number, number] }) => void;
  spacesChanged?: (guids: string[]) => void;
  cameraChanged?: (state: { position: [number, number, number]; quaternion: [number, number, number, number] }) => void;
  didExpand?: () => void;
  didContract?: () => void;
}

export interface StreamBIMAPI {
  connect(callbacks?: StreamBIMCallbacks): Promise<void>;
  getProjectId(): Promise<string>;
  getUserEmail(): Promise<string>;
  getCameraState(): Promise<{ position: [number, number, number]; quaternion: [number, number, number, number] }>;
  setCameraState(state: { position: [number, number, number]; quaternion: [number, number, number, number] }): Promise<void>;
  setCameraPosition(position: [number, number, number]): Promise<void>;
  getSpaces(): Promise<string[]>;
  getObjectInfo(guid: string): Promise<any>;
  gotoSpace(guid: string): Promise<void>;
  highlightObject(guid: string): Promise<void>;
  deHighlightObject(guid: string): Promise<void>;
  deHighlightAllObjects(): Promise<void>;
  hideObject(guid: string): Promise<void>;
  showObject(guid: string): Promise<void>;
  findObjects(query: any): Promise<string[]>;
  getObjectInfoForSearch(query: any): Promise<any>;
  applyObjectSearch(filter: any): Promise<void>;
  resetObjectSearch(): Promise<void>;
  showAllObjects(): Promise<void>;
  getViewportState(): Promise<any>;
  setViewportState(state: any): Promise<void>;
  takeScreenshot(): Promise<string>;
  setShowExpandButton(show: boolean): Promise<void>;
  setExpanded(expanded: boolean): Promise<void>;
}

declare global {
  interface Window {
    StreamBIM: StreamBIMAPI;
  }
}

export {};
