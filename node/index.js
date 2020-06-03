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
  const streamPath = `${chunksPath}/${name}`;
  let streamList;
  if (fs.existsSync(streamPath)) {
    streamList = fs.readdirSync(streamPath);
  }
  ctx.status = 200;
  ctx.body = {
    hasChunk: !!streamList,
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
 * 使用@koa/multer实现断点上传
 */
router.post('/upload-chunk', koaMulterUpload.single('file'), async (ctx) => {
  /**
   * axios方法
   * ctx.req.file 文件流信息
   * ctx.req.body 请求参数
   */
  const { name, index } = ctx.req.body;
  const file = ctx.req.file;
  const chunkName = `${chunksPath}/${name}/${name}-chunk-${index}`;
  /** 创建对应流的目录 */
  if (!fs.existsSync(`${chunksPath}/${name}`)) {
    fs.mkdirsSync(`${chunksPath}/${name}`);
  }
  /**
   * 重命名二进制流文件
   * 注意路径需要对齐
   */
  fs.renameSync(file.path, chunkName);
  ctx.status = 200;
  ctx.res.end(index);
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
  const file = `${uploadFilePath}/${fileName}`;
  fs.writeFileSync(file, '');
  // 2.读取所有chunk数据
  // 3.开始写入数据
  for (let idx = 1; idx < chunkCount; idx++) {
    /**
     * chunk文件名格式: fileName + '-' + index
     * 例如: 《陪著你走》伴奏Variation.pdf-0
     */
    const chunkFile = `${chunksPath}/${fileName}/${fileName}-chunk-${idx}`;
    fs.appendFileSync(file, fs.readFileSync(chunkFile));
  }
  /** 删除chunk文件 */
  fs.emptyDirSync(`${chunksPath}/${fileName}`);
  ctx.status = 200;
  ctx.res.end('上传成功');
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
  const uploadFileList = fs.readdirSync(uploadFilePath);
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
