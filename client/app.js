import React from 'react';
import UploadValidate from './pages/upload-validate';
import UploadCrop from './pages/upload-crop';
import UploadFiles from './pages/upload-files';
import FetchFiles from './pages/fetch-files';
import './app.scss';

export default () => (
  <>
    <div className="app-wrap">
      <UploadFiles />
    </div>

    {/* <h1 className="page-title">已上传文件</h1>
    <div className="app-wrap">
      <FetchFiles />
    </div> */}

    {/* <div className="block">
      <UploadValidate />
    </div> */}

    {/* <div className="block">
      <UploadCrop />
    </div> */}
  </>
);
