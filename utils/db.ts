
const DB_NAME = 'SeinaruMagecraftDB';
const DB_VERSION = 3;

export interface DBReferenceItem {
    id: string; // "type:name"
    type: 'companions' | 'weapons' | 'beasts' | 'vehicles';
    name: string;
    data: any; // The selection data
    version: number;
}

export interface DBSaveSlot {
    id: number;
    name: string;
    timestamp: string;
    character: any;
    reference: any; // AllBuilds object
    version: string;
}

const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = (event.target as IDBOpenDBRequest).result;
            
            // Reference Builds Store
            if (!db.objectStoreNames.contains('reference_builds')) {
                const store = db.createObjectStore('reference_builds', { keyPath: 'id' });
                store.createIndex('type', 'type', { unique: false });
            }

            // Save Slots Store (Migrating from SeinaruMagecraftFullSaves if possible, but starting fresh for structure)
            if (!db.objectStoreNames.contains('save_slots')) {
                db.createObjectStore('save_slots', { keyPath: 'id' });
            }
        };
    });
};

export const db = {
    // --- Reference Builds Operations ---

    async saveReferenceBuild(type: string, name: string, data: any) {
        const database = await openDB();
        const tx = database.transaction('reference_builds', 'readwrite');
        const store = tx.objectStore('reference_builds');
        
        const item: DBReferenceItem = {
            id: `${type}:${name}`,
            type: type as any,
            name,
            data,
            version: 1
        };

        return new Promise<void>((resolve, reject) => {
            const req = store.put(item);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    },

    async getReferenceBuildsByType(type: string): Promise<DBReferenceItem[]> {
        const database = await openDB();
        const tx = database.transaction('reference_builds', 'readonly');
        const store = tx.objectStore('reference_builds');
        const index = store.index('type');

        return new Promise((resolve, reject) => {
            const req = index.getAll(type);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },

    async getAllReferenceBuilds(): Promise<Record<string, Record<string, {data: any, version: number}>>> {
        const database = await openDB();
        const tx = database.transaction('reference_builds', 'readonly');
        const store = tx.objectStore('reference_builds');

        return new Promise((resolve, reject) => {
            const req = store.getAll();
            req.onsuccess = () => {
                const results: DBReferenceItem[] = req.result;
                const formatted: any = { companions: {}, weapons: {}, beasts: {}, vehicles: {} };
                
                results.forEach(item => {
                    if (!formatted[item.type]) formatted[item.type] = {};
                    formatted[item.type][item.name] = {
                        data: item.data,
                        version: item.version
                    };
                });
                resolve(formatted);
            };
            req.onerror = () => reject(req.error);
        });
    },

    async getReferenceBuild(type: string, name: string): Promise<DBReferenceItem | undefined> {
        const database = await openDB();
        const tx = database.transaction('reference_builds', 'readonly');
        const store = tx.objectStore('reference_builds');
        
        return new Promise((resolve, reject) => {
            const req = store.get(`${type}:${name}`);
            req.onsuccess = () => resolve(req.result);
            req.onerror = () => reject(req.error);
        });
    },

    async deleteReferenceBuild(type: string, name: string) {
        const database = await openDB();
        const tx = database.transaction('reference_builds', 'readwrite');
        const store = tx.objectStore('reference_builds');

        return new Promise<void>((resolve, reject) => {
            const req = store.delete(`${type}:${name}`);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    },

    async clearAllReferenceBuilds() {
        const database = await openDB();
        const tx = database.transaction('reference_builds', 'readwrite');
        const store = tx.objectStore('reference_builds');
        return new Promise<void>((resolve, reject) => {
            const req = store.clear();
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    },

    async restoreReferenceBuilds(allBuilds: any) {
        const database = await openDB();
        const tx = database.transaction('reference_builds', 'readwrite');
        const store = tx.objectStore('reference_builds');

        // We don't await individual puts here for speed, just the transaction
        const types = ['companions', 'weapons', 'beasts', 'vehicles'];
        
        types.forEach(type => {
            const group = allBuilds[type] || {};
            Object.keys(group).forEach(name => {
                const entry = group[name];
                store.put({
                    id: `${type}:${name}`,
                    type: type as any,
                    name,
                    data: entry.data,
                    version: entry.version || 1
                });
            });
        });

        return new Promise<void>((resolve, reject) => {
            tx.oncomplete = () => resolve();
            tx.onerror = () => reject(tx.error);
        });
    },

    // --- Save Slots Operations ---

    async saveGameSlot(slot: DBSaveSlot) {
        const database = await openDB();
        const tx = database.transaction('save_slots', 'readwrite');
        const store = tx.objectStore('save_slots');

        return new Promise<void>((resolve, reject) => {
            const req = store.put(slot);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    },

    async getGameSlots(): Promise<Record<number, DBSaveSlot>> {
        const database = await openDB();
        const tx = database.transaction('save_slots', 'readonly');
        const store = tx.objectStore('save_slots');

        return new Promise((resolve, reject) => {
            const req = store.getAll();
            req.onsuccess = () => {
                const slots = req.result as DBSaveSlot[];
                const map: Record<number, DBSaveSlot> = {};
                slots.forEach(s => map[s.id] = s);
                resolve(map);
            };
            req.onerror = () => reject(req.error);
        });
    },

    async deleteGameSlot(id: number) {
        const database = await openDB();
        const tx = database.transaction('save_slots', 'readwrite');
        const store = tx.objectStore('save_slots');

        return new Promise<void>((resolve, reject) => {
            const req = store.delete(id);
            req.onsuccess = () => resolve();
            req.onerror = () => reject(req.error);
        });
    }
};
