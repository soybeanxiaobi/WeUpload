import React from 'react';
import { Tag, Link, Progress, InlineLoading } from 'zent';
import { converSize } from '../utils';
import ChunkShow from '../components/chunkShow';

export const uploadStatus = {
  0: '未上传',
  1: '上传中',
  2: '已上传',
  3: '暂停中',
};

export const getSliceFileUpload = (chunkUploadInfo = {}) => {
  let progress = 0;
  const chunkCountArr = Object.keys(chunkUploadInfo);
  chunkCountArr.forEach(chunkIdx => {
    progress += chunkUploadInfo[chunkIdx] * (100 / chunkCountArr.length)
  })
  return progress;
}

export const mockData = [
  {
    fileName: '测试_未上传',
    fileType: 'img',
    fileSize: 122233,
    uploadStatus: 0,
  },
  {
    fileName: '测试_上传中',
    fileType: 'img',
    fileSize: '33333',
    uploadStatus: 1,
    uploadProgeress: 23.44,
  },
  {
    fileName: '测试_已上传',
    fileType: 'img',
    fileSize: '33333',
    uploadStatus: 2,
  },
];

export const getColumns = ({ chunkType, events }) => {
  const { handleStartUpload, handleOpenFinder, handleStopUpload } = events;
  return [
    {
      title: '文件名',
      name: 'fileName',
    },
    {
      title: '文件类型',
      name: 'fileType',
    },
    {
      title: '文件大小',
      name: 'fileSize',
      bodyRender: ({ fileSize }) => converSize(Number(fileSize)),
    },
    {
      title: '上传状态',
      textAlign: 'left',
      name: 'uploadStatus',
      bodyRender: record => {
        const { isSingle, uploadStatus, currentChunk, chunkCount, chunkUploadInfo = {} } = record;
        console.log('=== record ===', record);
        const uploadProgress = isSingle ? uploadProgeress : getSliceFileUpload(chunkUploadInfo);
        console.log('uploadProgress', uploadProgress);
        if (uploadStatus === 0) {
          return <Tag theme="yellow">未上传</Tag>;
        } else if (uploadStatus === 1) {
          const isSize = chunkType === 'size';
          return (
            <>
              {isSize && (
                <span>
                  {currentChunk} / {chunkCount}
                </span>
              )}
              <Progress percent={uploadProgress.toFixed(2)} format={percent => (
                <div>
                  <div>总进度</div>
                  <div>{percent}%</div>
                </div>
              )} />
            </>
          );
        } else if (uploadStatus === 2) {
          return (
            <>
              <Tag theme="green">已上传</Tag>
              <Link className="tag-extra" onClick={handleOpenFinder}>
                打开文件位置
              </Link>
            </>
          );
        } else if (uploadStatus === 3) {
          return (
            <>
              <Tag theme="yellow" style={{ marginBottom: 5 }}>
                暂停中
              </Tag>
              <p>
                <span>
                  切片数量: {currentChunk} / {chunkCount}
                </span>
              </p>
              <p>当前切片进度: {uploadProgeress.toFixed(2)}%</p>
            </>
          );
        }
      },
    },
    {
      title: '操作',
      textAlign: 'right',
      bodyRender: (record) => (
        <div className="col-action">
          <span onClick={() => handleStopUpload(record)} className={record.uploadStatus !== 1 ? 'button-disabled' : ''}>
            暂停
          </span>
          <span
            onClick={() => handleStartUpload(record, 'multiple')}
            className={![0, 3].includes(record.uploadStatus) ? 'button-disabled' : ''}
          >
            {record.uploadStatus === 3 ? '继续上传' : '上传'}
          </span>
          <span onClick={() => handleStartUpload(record, 'single')}>单文件上传</span>
        </div>
      ),
    },
  ];
};