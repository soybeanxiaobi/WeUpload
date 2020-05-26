import React from 'react';
import { Tag, Link, InlineLoading } from 'zent';
import { converSize } from '../utils';

export const uploadStatus = {
  0: '未上传',
  1: '上传中',
  2: '已上传',
};

export const mockData = [
  {
    fileName: '测试_未上传',
    fileType: 'img',
    fileSize: '33333',
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

export const getColumns = ({ events }) => {
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
      name: 'uploadStatus',
      bodyRender: ({ uploadStatus, currentUploadChunk, chunkCount, uploadProgeress = 0 }) => {
        if (uploadStatus === 0) {
          return <Tag theme="grey">未上传</Tag>;
        } else if (uploadStatus === 1) {
          return (
            <>
              <span>
                {currentUploadChunk} / {chunkCount}
              </span>
              <InlineLoading loading icon="circle" iconText={`${uploadProgeress.toFixed(2)}%`} textPosition="right" />
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
        }
      },
    },
    {
      title: '操作',
      textAlign: 'right',
      bodyRender: (record) => (
        <div className="col-action">
          <span onClick={handleStopUpload} className={record.uploadStatus !== 1 ? 'button-disabled' : ''}>
            暂停
          </span>
          <span
            onClick={() => handleStartUpload(record)}
            className={record.uploadStatus !== 0 ? 'button-disabled' : ''}
          >
            上传
          </span>
        </div>
      ),
    },
  ];
};
