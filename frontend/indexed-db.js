export function abrirDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("piedraAzulDB", 1);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains("queue")) {
        db.createObjectStore("queue", {
          keyPath: "id",
          autoIncrement: true
        });
      }

      if (!db.objectStoreNames.contains("cache")) {
        db.createObjectStore("cache");
      }
    };

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}