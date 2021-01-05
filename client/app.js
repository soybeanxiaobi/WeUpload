import React from 'react';
import UploadValidate from './pages/upload-validate';
import UploadCrop from './pages/upload-crop';
import UploadFilesChunk from './pages/upload-files-chunk';
import UploadFilesBreakContainer from './pages/upload-files-break_container';
import FetchFiles from './pages/fetch-files';
import './app.scss';

export default () => (
  <>
    {/* 切片上传 */}
    <div className="app-wrap">
      <UploadFilesChunk />
    </div>

    {/* 断点续传 */}
    <div className="app-wrap">
      <UploadFilesBreakContainer />
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
