import { useSimulatorStore } from './simulatorStore';

const CLOUD_SYNC_KEY = 'mips_simulator_cloud_sync_v1';

export class SyncManager {
  static lastSyncTime: number = Date.now();
  static isSyncing: boolean = false;

  /**
   * Mocks a cloud save operation by saving to LocalStorage with a simulated network delay.
   */
  static async saveToCloud(): Promise<void> {
    this.isSyncing = true;
    const state = useSimulatorStore.getState();
    
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, 800));

    const payload = {
      code: state.code,
      forwardingEnabled: state.forwardingEnabled,
      timestamp: Date.now(),
    };

    localStorage.setItem(CLOUD_SYNC_KEY, JSON.stringify(payload));
    this.lastSyncTime = Date.now();
    this.isSyncing = false;
  }

  /**
   * Mocks a cloud restore operation.
   */
  static async restoreFromCloud(): Promise<boolean> {
    this.isSyncing = true;
    
    // Simulate network latency
    await new Promise(resolve => setTimeout(resolve, 600));

    const saved = localStorage.getItem(CLOUD_SYNC_KEY);
    this.isSyncing = false;

    if (saved) {
      try {
        const payload = JSON.parse(saved);
        const state = useSimulatorStore.getState();
        
        // Only update if different
        if (payload.code && payload.code !== state.code) {
          state.setCode(payload.code);
        }
        if (payload.forwardingEnabled !== undefined && payload.forwardingEnabled !== state.forwardingEnabled) {
          state.toggleForwarding();
        }
        return true;
      } catch (e) {
        console.error("Failed to parse cloud sync data", e);
        return false;
      }
    }
    return false;
  }
}

// Automatically sync code changes every 10 seconds (mock autosave)
setInterval(() => {
  if (useSimulatorStore.getState().code.length > 0) {
    SyncManager.saveToCloud();
  }
}, 10000);
