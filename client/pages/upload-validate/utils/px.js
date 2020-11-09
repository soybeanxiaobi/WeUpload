export const checkPxByImage = async file => {
  const result = await new Promise(resolve => {
    const reader = new FileReader();
    const widthLimit = 100;
    const heightLimit = 100;
    console.log('限制图片的宽度 & 高度', `${widthLimit}px`, `${heightLimit}px`);
    reader.readAsDataURL(file);
    reader.onload = async function () {
      // 加载图片获取图片真实高度和上传
      const src = reader.result;
      const image = new Image();
      image.onload = await function () {
        const width = image.width;
        const height = image.height;
        console.log('上传图片的宽度 & 高度', `${width}px`, `${height}px`);
        if (Number(widthLimit) !== width || Number(heightLimit) !== height) {
          console.log(` %c x 校验不通过 ,请上传${widthLimit}*${heightLimit}的尺寸图片`, 'color: #ed6a0c');
          resolve(false)
        } else {
          console.log('%c y 校验通过!', 'color: #2da641');
          resolve(true);
        }
      }
      // 放置onload后,兼容IE
      image.src = src;
    }
  })
  setDatasets([...datasets, { name: file.name, type: file.type, size: file.size, isMatchPx: result }]);
}

export const checkPxByHeader = file => {
  console.log('文件信息', file);
  const reader = new FileReader();
  reader.onload = function () {
    const dataView = new DataView(this.result);
    isPNG(dataView);
    // isJPG(dataView);
  }
  // jpg图片信息不固定,因此需要遍历整个Buffer,不能切割
  reader.readAsArrayBuffer(file.slice(0, 50));
}

// png文件信息第一块数据表示 IHDR(49 48 44 52)
const isPNG = dataView => {
  const IHDR_HEX = [0x49, 0x48, 0x44, 0x52];
  // 方法一,查找数据块标志
  new Array(dataView.byteLength - 4).fill('').map((_, index) => {
    const fourBytesArr = [index, index + 1, index + 2, index + 3].map(num => dataView.getUint8(num));
    // 是否遍历到了IHDR位置
    const isTouchIHDR = fourBytesArr.every((hex, index) => {
      return hex === IHDR_HEX[index];
    });
    if (isTouchIHDR) {
      // 找到IHDR位置,偏移4个字节后获取4个字节的32位整数即可获取宽度
      const width = dataView.getInt32(index + 4);
      const height = dataView.getInt32(index + 8);
      console.log('方法一获取 width', width);
      console.log('方法一获取 height', height);
    }
    if (!isTouchIHDR && index === dataView.byteLength - 4) {
      console.log('方法一获取 上传文件并非png');
    }
  })

  // 方法二,直接偏移字节
  // 从第17个字节开始读取
  const width = dataView.getInt32(16);
  const height = dataView.getInt32(20);
  console.log('方法二获取 width', width);
  console.log('方法二获取 height', height);
}


// const isJPG = dataView => {
//   const SOF_HEX = 0xC0;
//   new Array(dataView.byteLength).fill('').map((_, index) => {
//     const val = dataView.getUint8(index);
//     if (val === SOF_HEX) {
//       console.log('val index', val, index);
//     }
//   })
// }