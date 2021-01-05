import { Notify } from 'zent';

export class indexedDB {
  constructor(props) {
    this.db;
    this.dbName = props.dbName;
  }

  // 打开indexedDB
  openDB = () => {
    const request = window.indexedDB.open(this.dbName);

    request.onerror = (error) => {
      console.log('error', error);
      Notify.error('获取上传列表失败');
    };

    request.onupgradeneeded = function (event) {
      console.log('=== onupgradeneeded ===');
      const db = event.target.result;
      // 默认创建list表,只能在onupgradeneeded里创建
      db.createObjectStore('list', { keyPath: 'id' });
      this.db = db;
    };

    request.onsuccess = (event) => {
      this.db = request.result;
    };
  };

  // 关闭indexedDB
  closeDB = () => {
    this.db && this.db.close();
  };

  // 写入表数据
  addData = (storeName, data) => {
    console.log('storeName, data', storeName, data);
    // 创建写入实例
    if (this.db) {
      console.log('this.db', this.db);
      const addRequest = this.db.transaction(storeName, 'readwrite');
      const store = addRequest.objectStore(storeName);
      console.log('store, data', store, data);
      store.add(data);
    }
  };
}

export default new indexedDB({ dbName: 'uploadFileListDB' });
