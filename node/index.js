const Koa = require('koa');
const cors = require('koa2-cors');
const bodyParser = require('koa-bodyparser');
const Router = require('koa-router');
const koaMulter = require('koa-multer');
const path = require('path');
const http = require('http');
const request = require('request');
const { exec } = require('child_process');
/** fs的封装模块 */
const fs = require('fs-extra');

/** 文件合并存放位置 */
const uploadFilePath = path.join(__dirname, '../static');
/** 流存放位置 */
const chunksPath = path.join(__dirname, '../static/stream');
/** 第三方资源存放位置 */
const thirdPartyResourcePath = path.join(__dirname, '../third-party-static');
const thirdPartyResourceChunkPath = path.join(__dirname, '../third-party-static/stream');
const app = new Koa();
const router = new Router();
/** koa-multer实例 */
const koaMulterUpload = koaMulter({ dest: chunksPath });

// 跨域
app.use(cors());
app.use(bodyParser());
app.use(router.routes());

/**
 * 查询文件上传记录,如果存在,则断点续传
 */
router.get('/get-upload-record', async (ctx) => {
  const { name } = ctx.query;
  // const streamPath = `${chunksPath}/${name}`;
  let streamList;
  // if (fs.existsSync(streamPath)) {
  //   streamList = fs.readdirSync(streamPath);
  // }
  const hasChunk = streamList ? Boolean(streamList.length) : false;
  ctx.status = 200;
  ctx.body = {
    hasChunk,
    uploadedChunkCount: streamList ? streamList.length : 1,
  };
});

/**
 * 校验文件是否已上传
 */
router.get('/chekck-file-upload', async (ctx) => {
  const {
    query: { name },
  } = ctx;
  const uploadFileList = fs.readdirSync(uploadFilePath);
  if (uploadFileList.includes(name)) {
    ctx.body = true;
  } else {
    ctx.body = false;
  }
});

/**
 * 校验上传文件是否有已上传切片
 */
router.post('/chekck-file_chunk-upload', async (ctx) => {
  const { fileName = '' } = ctx.request.body || {};
  const chunksContinuePath = `${chunksPath}/${fileName}`;
  let uploadedChunksList = [];
  if (fs.existsSync(chunksContinuePath)) {
    uploadedChunksList = fs.readdirSync(chunksContinuePath);
  }
  ctx.body = uploadedChunksList
});

/**
 * 接收单个文件上传
 */
router.post('/upload-single-file', koaMulterUpload.single('singleFile'), async (ctx) => {
  const { name } = ctx.req.body;
  const { path } = ctx.req.file;
  const fileFullPath = `${uploadFilePath}/${name}`;
  console.log('fileFullPath', fileFullPath);
  fs.appendFileSync(fileFullPath, fs.readFileSync(path));
  /** 删除chunk文件 */
  // fs.emptyDirSync(path);
  ctx.status = 200;
  ctx.res.end('successful');
})

/**
 * 使用@koa/multer实现切片上传
 */
router.post('/upload-chunk', koaMulterUpload.single('file'), async (ctx) => {
  /**
   * axios方法
   * ctx.req.file 文件流信息
   * ctx.req.body 请求参数
   */
  const { name } = ctx.req.body;
  const file = ctx.req.file;
  const chunkName = `${chunksPath}/${name}`;
  /**
   * 重命名二进制流文件
   * 注意路径需要对齐
   */
  fs.renameSync(file.path, chunkName);
  ctx.status = 200;
  ctx.res.end(`upload chunk: ${name} success!`);
});

/**
 * 使用@koa/multer实现切片上传+断点续传
 */
router.post('/upload-chunk-continue', koaMulterUpload.single('file'), async (ctx) => {
  /**
   * axios方法
   * ctx.req.file 文件流信息
   * ctx.req.body 请求参数
   */
  const { name, fileName } = ctx.req.body;
  const file = ctx.req.file;
  const chunksContinuePath = `${chunksPath}/${fileName}`;
  console.log('chunksContinuePath', chunksContinuePath);
  console.log('=== file ===', file);
  if (!fs.existsSync(chunksContinuePath)) {
    await fs.mkdirs(chunksContinuePath);
  }
  /**
   * 重命名二进制流文件
   * 注意路径需要对齐
   */
  const chunkName = `${chunksPath}/${fileName}/${name}`;
  fs.renameSync(file.path, chunkName);
  ctx.status = 200;
  ctx.res.end(`upload success!`);
});

/**
 *
 */

/**
 * 对流进行存储
 */
router.post('/merge-chunk', async (ctx) => {
  /**
   * axios.post方法
   * ctx.request.body 请求参数
   */
  const { fileName = '未命名', chunkCount } = ctx.request.body || {};
  // 1.创建存储文件,初始为空
  const filePath = `${uploadFilePath}/${fileName}`;
  fs.writeFileSync(filePath, '');
  console.log('chunkCount', chunkCount);
  // 2.读取所有chunk数据
  // 3.开始写入数据
  for (let idx = 1; idx <= chunkCount; idx++) {
    /**
     * 约定的chunk文件名格式: fileName + '-' + index
     */
    const chunkFile = `${chunksPath}/${fileName}-chunk-${idx}`;
    fs.appendFileSync(filePath, fs.readFileSync(chunkFile));
  }
  /** 删除chunk文件 */
  // fs.emptyDirSync(`${chunksPath}/${fileName}`);
  ctx.status = 200;
  ctx.res.end('successful');
});

/**
 * 对流进行存储 - 断点续传
 */
router.post('/merge-chunk-continue', async (ctx) => {
  /**
   * axios.post方法
   * ctx.request.body 请求参数
   */
  const { fileName = '未命名', chunkCount } = ctx.request.body || {};
  // 1.创建存储文件,初始为空
  const filePath = `${uploadFilePath}/${fileName}`;
  fs.writeFileSync(filePath, '');
  console.log('chunkCount', chunkCount);
  // 2.读取所有chunk数据
  // 3.开始写入数据
  for (let idx = 1; idx <= chunkCount; idx++) {
    /**
     * 约定的chunk文件名格式: fileName + '-' + index
     */
    const chunkFile = `${chunksPath}/${fileName}/${fileName}-chunk-${idx}`;
    fs.appendFileSync(filePath, fs.readFileSync(chunkFile));
  }
  /** 删除chunk文件 */
  // fs.emptyDirSync(`${chunksPath}/${fileName}`);
  ctx.status = 200;
  ctx.res.end('successful');
});

// 打开已上传文件所在文件夹
router.get('/open-upload-finder', async (ctx) => {
  exec(`open ${uploadFilePath}`);
  ctx.body = {
    code: 200,
    msg: 'success',
    data: {},
  };
});

// 获取已上传文件
router.get('/get-upload-files', async (ctx) => {
  const uploadFileList = await fs.readdirSync(uploadFilePath);
  ctx.body = {
    code: 200,
    msg: 'success',
    data: uploadFileList,
  };
});

// 清空已上传文件
router.get('/rm-upload-files', async (ctx) => {
  /** 清空chunk文件夹 */
  fs.emptyDirSync(uploadFilePath);
  if (!fs.existsSync(chunksPath)) {
    fs.mkdirsSync(chunksPath);
  }
  ctx.body = true;
});

// 下载第三方资源
router.get('/download-third_party_resource', async (ctx) => {
  const time = new Date().valueOf();
  const startIdx = 10;
  const endIdx = 50;
  const file = `${thirdPartyResourcePath}/resource-${time}.mp4`;
  fs.writeFileSync(file, '');
  for (let idx = startIdx; idx < endIdx; idx++) {
    const chunkName = `${thirdPartyResourceChunkPath}/resources-chunk-${idx}.ts`;
    var stream = fs.createWriteStream(chunkName);
    // http.get(`http://haoa.haozuida.com/20180119/JK9oXan5/800kb/hls/TwrY44670${idx}.ts`, (res) => {
    //   console.log('res', res);
    //   res.pipe(stream);
    // });
    request(`http://haoa.haozuida.com/20180119/JK9oXan5/800kb/hls/TwrY44670${idx}.ts`).pipe(stream);
  }
  for (let idx = startIdx; idx < endIdx; idx++) {
    const chunkName = `${thirdPartyResourceChunkPath}/resources-chunk-${idx}.ts`;
    fs.appendFileSync(file, fs.readFileSync(chunkName));
  }
  ctx.status = 200;
  ctx.res.end('success');
});

// 清空下载第三方文件
router.get('/rm-resources-files', async (ctx) => {
  /** 清空chunk文件夹 */
  fs.emptyDirSync(thirdPartyResourcePath);
  if (!fs.existsSync(thirdPartyResourceChunkPath)) {
    fs.mkdirsSync(thirdPartyResourceChunkPath);
  }
  ctx.body = true;
});

const port = 3001;
app.listen(port, () => console.log(`监听${port}端口中....`));

const uploadPromise = () => uploadChunkList.map(async ({ name, file }, index) => {
  let formData = new FormData();
  formData.append('name', name);
  formData.append('file', file);
  /**
   * 因为流的http请求是并发的,后端要按顺序合并,必须要加入文件流顺序
   */
  formData.append('index', currentChunk + index);
  return axios({
    method: 'post',
    data: formData,
    header: {
      'Content-type': 'multipart/form-data',
    },
    url: `${host}/upload-chunk`,
    cancelToken: axiosSource.token,
    onUploadProgress: uploadInfo => {
      let chunkUploadInfo = {};
      // 计算当前切片上传百分比  已上传数/总共需要上传数(这里计算的是每个切片的上传进度)
      const chunkProgress = Number((uploadInfo.loaded / uploadInfo.total));
      chunkUploadInfo[index] = chunkProgress;
      currentUploadItem.isSingle = false;
      // 总的上传百分比是由 切片上传进度 * 切片分数占比
      currentUploadItem.chunkUploadInfo = {
        ...currentUploadItem.chunkUploadInfo,
        ...chunkUploadInfo
      };
      setFileList([...newFileList]);
    },
  })
});

var longestPalindrome = function(s) {
  let result = "";
  if(s === '') return '';
  if(s.length === 1) return s;

  // 寻找某个对称轴为中心的最长回文子串
  function maxSubstring(left, right) {
    while (left >= 0 && right < s.length) {
    if (s[left] === s[right]) {
        left--;
        right++;
    }
    else break;
    }
    // 使用slice的时候是左闭右开结构，所以left要+1指向子串第一个字符
    left++;
    // right到末尾使用slice会越界，单独考虑
    if (right === s.length){
    // console.log('1 '+s.slice(left));
    return s.slice(left);
    }
    // console.log('2 '+s.slice(left,right));
    return s.slice(left, right);
  }

  for (let i = 0; i < s.length - 1; i++) {
      // 子串长度奇数和偶数都搜索一遍
      let a = maxSubstring(i, i);
      let b = maxSubstring(i, i + 1);
      let temp = a.length > b.length ? a : b;
      result = result.length > temp.length ? result : temp;
  }
  return result;
};
console.log("longestPalindrome('aabacc')", longestPalindrome('aabacc')); // aba
console.log("longestPalindrome('aabaa')", longestPalindrome('aabaa')); // aabaa
console.log("longestPalindrome('cbbd')", longestPalindrome('cbbd')); //bb