import React, { useState, useRef, useEffect } from 'react';
import { Grid, Button, Notify, Radio } from 'zent';
import axios from 'axios';
import find from 'lodash/find';

import { getColumns } from './constants';
import { createUploadId } from './utils';

import './index.scss';

const host = 'http://127.0.0.1:3001';
const RadioGroup = Radio.Group;
const axiosCancelToken = axios.CancelToken;
const axiosSource = axiosCancelToken.source();

export default () => {
  /** 根据数量切分切片 */
  const FILE_CHUNK_NUM = 5;
  /** 根据大小切分切片,默认5M */
  const FILE_CHUNK_SIZE = 5 * 1024 * 1024;
  const inputRef = useRef(null);
  const [chunkType, setChunkType] = useState('num');
  const [fileList, setFileList] = useState([]);

  // 加载文件
  useEffect(() => {
    axios.get(`${host}/get-upload-files`);
  }, []);

  const readFileByPath = () => {
    // const result = await axios.get(`${host}/read-file?path=${record.fileName}`);
    console.log('result', result);
  };

  // 打开文件选择框
  const handleAddFile = () => {
    const inputEv = inputRef.current;
    inputEv.click();
  };

  // 选择文件并添加到表格里
  const handleFileSelect = async (e) => {
    const File = e.target.files[0];
    console.log('File', File);
    if (File) {
      // 判断文件是否有上传记录,如果有,则断点续传
      const { data: { hasChunk = false, uploadedChunkCount = 0 } = {} } = await axios.get(
        `${host}/get-upload-record?name=${File.name}`,
      );
      const chunkCount = chunkType === 'num' ? FILE_CHUNK_NUM : Math.ceil(File.size / FILE_CHUNK_SIZE);
      let filesToCurrent = {
        id: createUploadId(),
        fileName: File.name,
        fileType: File.type,
        fileSize: File.size,
        File,
        uploadStatus: hasChunk ? 3 : 0, // 如果有切片记录,则直接为暂停状态
        currentChunk: uploadedChunkCount,
        uploadProgeress: hasChunk ? 100 : 0,
        chunkCount,
      };
      /**
       * 判断文件是否已经上传
       * true: 已上传文件,秒传
       * false: 未找到文件,重新上传
       */
      const result = await axios.get(`${host}/chekck-file-upload?name=${File.name}`);
      const { data: isUpload } = result;
      if (isUpload) {
        filesToCurrent.uploadStatus = 2;
        Notify.success('文件已存在,秒传成功');
      }
      setFileList([...fileList, filesToCurrent]);
    }
  };

  // 处理上传逻辑
  const handleUpload = async (record) => {
    // 生成切片
    const chunkList = createFileChunk(record);
    // 开始上传文件
    uploadFiles(record, chunkList);
  };

  // 生成文件切片
  const createFileChunk = ({ File }, currentStart = 0) => {
    const fileChunkList = [];
    // const blobSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice;
    // 实现方法1: 根据数量计算切分后大小
    const chunkSize = chunkType === 'num' ? Math.ceil(File.size / FILE_CHUNK_NUM) : FILE_CHUNK_SIZE;
    const currentSize = chunkSize * currentStart;
    for (let current = currentSize; current < File.size; current += chunkSize) {
      // 使用Blob.slice方法来对文件进行分割。
      fileChunkList.push({
        name: File.name,
        file: File.slice(current, current + chunkSize),
      });
    }
    return fileChunkList;
  };

  // 上传切片 & 合并切片
  const uploadFiles = async ({ id, fileSize, fileName, currentChunk }, uploadChunkList) => {
    const newFileList = [...fileList];
    const currentUploadItem = find(newFileList, { id });
    currentUploadItem.uploadStatus = 1;
    setFileList([...newFileList]);
    const uploadPromise = uploadChunkList.map(async ({ name, file }, index) => {
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
        onUploadProgress: (uploadInfo) => {
          // 计算上传百分比
          const progress = (uploadInfo.loaded / uploadInfo.total) * 100;
          currentUploadItem.uploadProgeress = progress;
          setFileList([...newFileList]);
        },
      }).then((res) => {
        const { data } = res;
        currentUploadItem.currentChunk = data;
        currentUploadItem.uploadProgeress = 100;
        setFileList([...newFileList]);
      });
    });
    // 开始同步上传切片
    await axios
      .all(uploadPromise)
      .then(() => {
        // 合并切片
        return axios
          .post(`${host}/merge-chunk`, {
            fileName,
            chunkCount: chunkType === 'num' ? FILE_CHUNK_NUM : Math.ceil(fileSize / FILE_CHUNK_SIZE),
          })
          .then(() => {
            currentUploadItem.uploadStatus = 2;
            currentUploadItem.uploadProgeress = 100;
            setFileList([...newFileList]);
            Notify.success('上传成功');
          });
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
    axiosSource.cancel('中断上传');
    const newFileList = [...fileList];
    const currentUploadItem = find(newFileList, { id });
    currentUploadItem.uploadStatus = 3;
    setFileList([...newFileList]);
  };

  // 继续上传
  const handleContinueUpload = (record) => {
    const { currentChunk } = record;
    // 生成切片
    const chunkList = createFileChunk(record, currentChunk);
    // 继续上传文件
    uploadFiles(record, chunkList);
  };

  // 清空文件夹
  const handleEmptyUpload = () => {
    setFileList([]);
    axios.get(`${host}/rm-upload-files`).then(() => Notify.success('清空文件夹成功'));
  };

  const events = {
    handleStartUpload: (record) => {
      if (record.uploadStatus === 3) {
        // 走继续上传逻辑
        handleContinueUpload(record);
      } else {
        handleUpload(record);
      }
    },
    handleOpenFinder,
    handleStopUpload,
  };

  return (
    <div className="upload-wrap">
      <div className="upload-config">
        <RadioGroup onChange={(e) => setChunkType(e.target.value)} value={chunkType}>
          <Radio value="num">切片数量</Radio>
          <Radio value="size">切片大小</Radio>
        </RadioGroup>
      </div>
      <div className="upload-action">
        <input type="file" ref={inputRef} style={{ display: 'none' }} onChange={handleFileSelect} />
        <Button type="primary" onClick={handleAddFile}>
          添加文件
        </Button>
        <Button type="primary" outline>
          全部上传
        </Button>
        <Button outline type="primary" onClick={handleEmptyUpload}>
          清空文件夹
        </Button>
      </div>
      <Grid key="id" datasets={fileList} columns={getColumns({ chunkType, events })} />
    </div>
  );
};
