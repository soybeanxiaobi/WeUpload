export const checkType = file => {
  console.log('上传文件信息 ==>', file);
  const reader = new FileReader();
  reader.onload = function () {
    console.log('文件二进制数据 this.result==>', this.result);
    // PNG文件头标识(16进制)
    const PNG_HEADER_HEX = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
    const JPG_HEADER_HEX = [0xFF, 0xD8];
    const dataView = new DataView(this.result);
    const bufferUint8Array = new Array(dataView.byteLength).fill('').map((_, index) => dataView.getUint8(index))
    console.log('前8个字节 bufferUint8Array', bufferUint8Array);
    // 用获取到的字节和图片头信息进行对比
    const isMatchType = JPG_HEADER_HEX.every((hex, index) => {
      return hex === bufferUint8Array[index];
    });
    console.log('是否为jpg类型图片', isMatchType);
  }
  reader.readAsArrayBuffer(file.slice(0, 8));
}