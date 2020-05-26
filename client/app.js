import React from 'react';
import UploadFiles from './pages/upload-files';
import FetchFiles from './pages/fetch-files';
import './app.scss';

export default () => (
  <>
    <h1 className="page-title">上传文件</h1>
    <div className="app-wrap">
      <UploadFiles />
    </div>

    <h1 className="page-title">已上传文件</h1>
    <div className="app-wrap">
      <FetchFiles />
    </div>
  </>
);
