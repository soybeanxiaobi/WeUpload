import React, { useState, useRef, useEffect } from 'react';
import { Grid, Button, Notify, Radio } from 'zent';
import axios from 'axios';
import find from 'lodash/find';

import { getColumns, uploadStatusMap } from './constants';
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
  const [fileList, setFileList] = useState([]);
  /**
   * @index {number} 切片序列值
   * @progress {number} 切片上传进度
   */
  const [chunkUploadList, setChunkUploadList] = useState([]);

  // 获取已上传文件
  // const getInitFiles = async () => {
  //   const result = await axios.get(`${host}/get-upload-files`);
  //   console.log('result.data', result.data);
  // }

  // 获取已上传的切片
  // const getUploadedChunk = async () => {

  // }

  //   // 初始化
  //   useEffect(() => {
  //     getInitFiles()
  //   }, []);

  // 打开文件选择框
  const handleAddFile = () => {
    const inputEv = inputRef.current;
    inputEv.click();
  };

  // 选择文件并添加到表格里
  const handleFileSelect = async (e) => {
    const File = e.target.files[0];
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
        chunkCount,
        uploadProgress: 0,
        currentChunk: uploadedChunkCount,
        uploadStatus: hasChunk ? uploadStatusMap.pause : uploadStatusMap.pending, // 如果有切片记录,则直接为暂停状态
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
      console.log('上传文件信息', filesToCurrent);
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
        currentUploadItem.uploadProgress = progress;
        setFileList([...newFileList]);
      },
    })
      .then(() => {
        currentUploadItem.uploadStatus = 2;
        currentUploadItem.uploadProgress = 100;
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
  const createFileChunk = ({ File }, currentStart = 0) => {
    const fileChunkList = [];
    const chunkSize = chunkType === 'num' ? Math.ceil(File.size / FILE_CHUNK_NUM) : FILE_CHUNK_SIZE;
    const currentSize = chunkSize * currentStart;
    console.log('chunkSize', chunkSize);
    console.log('currentSize', currentSize);
    console.log('File.name', File.name);
    for (let current = currentSize; current < File.size; current += chunkSize) {
      fileChunkList.push({
        name: `${File.name.split('.')[0]}-chunk-${fileChunkList.length + 1}`,
        // 使用Blob.slice方法来对文件进行分割。
        file: File.slice(current, current + chunkSize),
      });
    }
    console.log('生成的切片信息', fileChunkList);
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
          console.log('当前上传切片序号:', index);
          console.log('当前上传切片进度', `${(chunkProgress * 100).toFixed(2)}%`);
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
      })
      .then(() => {
        currentUploadItem.uploadStatus = 2;
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
