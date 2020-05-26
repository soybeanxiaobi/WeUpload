import React, { useState, useRef, useEffect } from 'react';
import { Grid, Button, Notify } from 'zent';
import axios from 'axios';
import find from 'lodash/find';

import { getColumns } from './constants';
import { createUploadId } from './utils';
import './index.scss';

const host = 'http://127.0.0.1:3001';

export default () => {
  /** 根据数量切分切片 */
  const FILE_CHUNK_NUM = 5;
  /** 根据大小切分切片,默认5M */
  // const FILE_CHUNK_FILE = 5 * 1024 * 1024;
  const inputRef = useRef(null);
  const [fileList, setFileList] = useState([]);

  // 加载文件
  useEffect(() => {
    axios.get(`${host}/read-upload-files`);
  }, []);

  // 打开文件选择框
  const handleAddFile = () => {
    const inputEv = inputRef.current;
    inputEv.click();
  };

  // 选择文件并添加到表格里
  const handleFileSelect = (e) => {
    const files = e.target.files;
    console.log('files', files);
    if (files) {
      const filesArray = [...files].map((File) => ({
        id: createUploadId(),
        fileName: File.name,
        fileType: File.type,
        fileSize: File.size,
        File,
        uploadStatus: 0,
        uploadProgeress: 0,
      }));
      setFileList([...fileList, ...filesArray]);
    }
  };

  // 处理上传逻辑
  const handleUpload = async (type, record) => {
    console.log('record', record);
    /**
     * 判断文件是否已经上传
     * true: 已上传文件,秒传
     * false: 未找到文件,重新上传
     */
    const result = await axios.get(`${host}/chekck-file-upload?name=${record.fileName}`);
    const { data: isUpload } = result;
    // 秒传
    window.localStorage.setItem
    if (isUpload) {
      const newFileList = [...fileList];
      const currentUploadItem = find(newFileList, { id: record.id });
      currentUploadItem.uploadStatus = 2;
      setFileList([...newFileList]);
      Notify.success('文件已存在,秒传成功');
    } else {
      // 生成切片
      const uploadFileChunkList = createFileChunk(record);
      // 开始上传文件
      uploadFiles(type, record, uploadFileChunkList);
    }
  };

  // 生成文件切片
  const createFileChunk = ({ File }, length = FILE_CHUNK_NUM) => {
    const fileChunkList = [];
    // const blobSlice = File.prototype.slice || File.prototype.mozSlice || File.prototype.webkitSlice;
    // 实现方法1: 根据数量计算切分后大小
    const chunkSize = Math.ceil(File.size / length);
    for (let current = 0; current < File.size; current += chunkSize) {
      // 使用Blob.slice方法来对文件进行分割。
      fileChunkList.push({
        name: File.name,
        file: File.slice(current, current + chunkSize),
      });
    }
    console.log('fileChunkList', fileChunkList);
    return fileChunkList;
  };

  // 上传切片 & 合并切片
  const uploadFiles = async (type, { id, fileName }, uploadChunkList) => {
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
      formData.append('index', index);
      return axios({
        method: 'post',
        data: formData,
        header: {
          'Content-type': 'multipart/form-data',
        },
        url: `${host}/${type}/upload-chunk`,
        onUploadProgress: (uploadInfo) => {
          // 计算上传百分比
          currentUploadItem.uploadProgeress = (uploadInfo.loaded / uploadInfo.total) * 100;
          setFileList([...newFileList]);
        },
      });
    });
    // 开始同步上传切片
    await axios
      .all(uploadPromise)
      .then((res) => {
        console.log('res', res);
        // 合并切片
        return axios
          .post(`${host}/koa-multer/merge-chunk`, {
            fileName,
            chunkCount: FILE_CHUNK_NUM,
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
  const handleStopUpload = () => {};

  const events = {
    handleStartUpload: (record) => handleUpload('koa-multer', record),
    handleOpenFinder,
    handleStopUpload,
  };

  return (
    <div className="upload-wrap">
      <div className="upload-action">
        <input type="file" multiple="multiple" ref={inputRef} style={{ display: 'none' }} onChange={handleFileSelect} />
        <Button type="primary" onClick={handleAddFile}>
          添加文件
        </Button>
        <Button type="primary" outline>
          全部上传
        </Button>
        <Button
          outline
          type="primary"
          onClick={() => axios.get(`${host}/rm-upload-files`).then(() => Notify.success('清空文件夹成功'))}
        >
          清空
        </Button>
      </div>
      <Grid key="id" datasets={fileList} columns={getColumns({ events })} />
    </div>
  );
};
