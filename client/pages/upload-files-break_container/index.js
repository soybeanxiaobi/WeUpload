import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Grid, Button, Notify, Radio } from 'zent';
import find from 'lodash/find';
import axios from 'axios';
import { getColumns, uploadStatusMap } from './constants';
import { smartAxios } from '../../ajax';
import { createUploadId } from './utils';

import './index.scss';

const host = 'http://127.0.0.1:3001';
const RadioGroup = Radio.Group;
const axiosCancelToken = axios.CancelToken;
const axiosSource = axiosCancelToken.source();

export default () => {
  /** 根据数量切分切片 */
  const FILE_CHUNK_NUM = 5;
  /** 根据大小切分切片,每个切片默认默认5M */
  const FILE_CHUNK_SIZE = 5 * 1024 * 1024;
  const inputRef = useRef(null);
  const [chunkType, setChunkType] = useState('num');
  const [axiosSourceCancel, setAxiosSourceCancel] = useState();
  const [fileList, setFileList] = useState([]);

  // 打开文件选择框
  const handleAddFile = () => {
    const inputEv = inputRef.current;
    inputEv.click();
  };

  // 判断是否存在切片信息
  const dealExistChunks = async ({ fileName, chunkCount }) => {
    let fileInfo = {};
    // 查找文件是否已经存在上传的切片信息
    const existChunksList = await axios.post(`${host}/chekck-file_chunk-upload`, { fileName }).then(({ data = [] }) => data);
    // 存在切片信息
    if (existChunksList.length) {
      // 状态更改为暂停
      fileInfo.uploadStatus = uploadStatusMap.pause;
      fileInfo.currentChunk = existChunksList.length;
      fileInfo.chunkUploadInfo = { ...new Array(chunkCount).fill('').map((_, index) => index < existChunksList.length ? 1 : 0) };
    };
    return fileInfo;
  }

  // 选择文件并添加到表格里
  const handleFileSelect = async (e) => {
    const File = e.target.files[0];
    if (File) {
      const chunkCount = chunkType === 'num' ? FILE_CHUNK_NUM : Math.ceil(File.size / FILE_CHUNK_SIZE);
      let filesToCurrent = {
        id: createUploadId(),
        fileName: File.name,
        fileType: File.type,
        fileSize: File.size,
        File,
        chunkCount,
        currentChunk: 0,
        uploadSingleProgress: 0,
        uploadStatus: uploadStatusMap.pending,
      };
      /**
       * 判断文件是否已经上传
       * true: 已上传文件,秒传
       * false: 未找到文件,重新上传
       */
      const result = await axios.get(`${host}/chekck-file-upload?name=${File.name}`);
      const { data: isUpload } = result;
      if (isUpload) {
        filesToCurrent.uploadStatus = uploadStatusMap.done;
        Notify.success('文件已存在,秒传成功');
      }
      console.log('上传文件信息', filesToCurrent);
      filesToCurrent = {
        ...filesToCurrent,
        ...await dealExistChunks({ fileName: File.name, chunkCount })
      }
      setFileList([...fileList, filesToCurrent]);
    }
  };

  // 处理单文件上传逻辑
  const handleSingleUpload = async ({ id, File, fileName }) => {
    const newFileList = [...fileList];
    const currentUploadItem = find(newFileList, { id });
    currentUploadItem.uploadStatus = 1;
    setFileList([...newFileList]);

    let formData = new FormData();
    formData.append('name', fileName);
    formData.append('file', File);
    return axios({
      method: 'post',
      data: formData,
      header: {
        'Content-type': 'multipart/form-data',
      },
      url: `${host}/upload-single-file`,
      cancelToken: axiosSource.token,
      onUploadProgress: (uploadInfo) => {
        // 计算上传百分比
        const progress = (uploadInfo.loaded / uploadInfo.total) * 100;
        currentUploadItem.isSingle = true;
        currentUploadItem.uploadSingleProgress = progress;
        setFileList([...newFileList]);
      },
    })
      .then(() => {
        currentUploadItem.uploadStatus = 2;
        currentUploadItem.uploadSingleProgress = 100;
        setFileList([...newFileList]);
      });
  }

  // 处理切片上传逻辑
  const handleMultipleUpload = async (record) => {
    // 生成切片
    const chunkList = createFileChunk(record);
    // 开始上传文件
    uploadFiles(record, chunkList);
  };

  // 生成文件切片
  const createFileChunk = ({ File }, currentChunk = 0) => {
    const fileChunkList = [];
    const chunkSize = chunkType === 'num' ? Math.ceil(File.size / FILE_CHUNK_NUM) : FILE_CHUNK_SIZE;
    // 切割位置
    const currentSize = chunkSize * currentChunk;
    for (let current = currentSize; current < File.size; current += chunkSize) {
      fileChunkList.push({
        currentChunk,
        fileName: File.name,
        name: `${File.name}-chunk-${currentChunk + fileChunkList.length + 1}`,
        // 使用Blob.slice方法来对文件进行分割。
        file: File.slice(current, current + chunkSize),
      });
    }
    console.log('createFileChunk fileChunkList', fileChunkList);
    return fileChunkList;
  };

  // 上传切片 & 合并切片
  const uploadFiles = async ({ id, fileSize, fileName, chunkUploadInfo = {} }, uploadChunkList) => {
    const { request, axiosSourceCancel } = smartAxios();
    setAxiosSourceCancel(axiosSourceCancel);
    const newFileList = [...fileList];
    const currentUploadItem = find(newFileList, { id });
    // 状态更新为上传中
    currentUploadItem.uploadStatus = uploadStatusMap.uploading;
    // 初始化所有切片上传进度
    if (!Object.keys(chunkUploadInfo).length) {
      currentUploadItem.chunkUploadInfo = { ...new Array(uploadChunkList.length).fill('').map(() => 0) }
    }
    setFileList([...newFileList]);
    // 开始按顺序同步上传切片
    console.log('uploadFiles uploadChunkList', uploadChunkList);
    for (let [indexStr, { name, file, fileName, currentChunk }] of Object.entries(uploadChunkList)) {
      const formData = new FormData();
      const index = Number(indexStr);
      formData.append('name', name);
      formData.append('fileName', fileName);
      formData.append('file', file);
      await request({
        method: 'post',
        data: formData,
        header: {
          'Content-type': 'multipart/form-data',
        },
        url: `${host}/upload-chunk-continue`,
        // cancelToken: axiosSource.token,
        onUploadProgress: uploadInfo => {
          // 计算当前切片上传百分比  已上传数/总共需要上传数(这里计算的是每个切片的上传进度)
          const chunkProgress = Number((uploadInfo.loaded / uploadInfo.total));
          currentUploadItem.isSingle = false;
          // 总的上传百分比是由 切片上传进度 * 切片分数占比
          currentUploadItem.chunkUploadInfo = {
            ...currentUploadItem.chunkUploadInfo,
            [currentChunk + index]: chunkProgress,
          };
          // 切片上传进度100%时,更新上传切片索引值
          if (chunkProgress === 1) {
            currentUploadItem.currentChunk = currentChunk + index + 1;
          }
          setFileList([...newFileList]);
        },
      });
    }
// 合并切片
axios
  .post(`${host}/merge-chunk-continue`, {
    fileName,
    chunkCount: chunkType === 'num' ? FILE_CHUNK_NUM : Math.ceil(fileSize / FILE_CHUNK_SIZE),
  })
  .then(() => {
    currentUploadItem.uploadStatus = uploadStatusMap.done;
    currentUploadItem.uploadProgress = 100;
    setFileList([...newFileList]);
    Notify.success('上传成功');
  })
  .catch((err) => {
    console.log('axios err', err);
  });
  };

  // 打开文件夹
  const handleOpenFinder = () => {
    axios.get(`${host}/open-upload-finder`);
  };

  // 暂停上传
  const handleStopUpload = ({ id }) => {
    axiosSourceCancel.cancel('中断上传');
    const newFileList = [...fileList];
    const currentUploadItem = find(newFileList, { id });
    currentUploadItem.uploadStatus = uploadStatusMap.pause;
    setFileList([...newFileList]);
  };

  // 继续上传
  const handleContinueUpload = async record => {
    const { id, fileName, chunkCount } = record;
    const newFileList = [...fileList];
    const currentUploadItem = find(newFileList, { id });
    const { currentChunk, chunkUploadInfo } = await dealExistChunks({ fileName, chunkCount });
    currentUploadItem.uploadStatus = uploadStatusMap.uploading;
    currentUploadItem.chunkUploadInfo = chunkUploadInfo;
    setFileList([...newFileList]);
    // 生成切片
    const chunkList = createFileChunk(record, currentChunk);
    // 继续上传文件
    uploadFiles(currentUploadItem, chunkList);
  };

  // 清空文件夹
  const handleEmptyUpload = () => {
    setFileList([]);
    inputRef.current.value = null;
    axios.get(`${host}/rm-upload-files`).then(() => Notify.success('清空文件夹成功'));
  };

  const events = {
    handleStartUpload: (record, type) => {
      if (record.uploadStatus === 3) {
        // 走继续上传逻辑
        handleContinueUpload(record);
      } else {
        if (type === 'multiple') {
          handleMultipleUpload(record);
        } else {
          handleSingleUpload(record);
        }
      }
    },
    handleOpenFinder,
    handleStopUpload,
  };

  return (
    <div className="upload-wrap">
      <div className="upload-config">
        <RadioGroup onChange={(e) => setChunkType(e.target.value)} value={chunkType}>
          <Radio value="num">根据切片数量</Radio>
          <Radio value="size">根据切片大小</Radio>
        </RadioGroup>
      </div>
      <div className="upload-action">
        <input type="file" ref={inputRef} style={{ display: 'none' }} onChange={handleFileSelect} />
        <Button type="primary" onClick={handleAddFile}>
          添加文件
        </Button>
        <Button outline type="primary" onClick={handleEmptyUpload}>
          清空文件夹
        </Button>
      </div>
      <Grid key="id" datasets={fileList} columns={getColumns({ chunkType, events })} />
    </div>
  );
};
