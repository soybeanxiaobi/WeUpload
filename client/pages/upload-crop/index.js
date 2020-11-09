import React, { useState } from 'react';
import { Input } from 'zent';

import './index.scss';

const UploadCrop = () => {
  const [previewImg, setPreviewImg] = useState({});

  const handleChange = e => {
    const file = e.target.files[0];
    const { name, size } = file;
    const blobUrl = URL.createObjectURL(file);
    setPreviewImg({
      name,
      size,
      url: blobUrl
    });
  }

  return (
    <>
      <Input type="file" onChange={handleChange} />
      {Boolean(Object.keys(previewImg).length) && (
        <>
          上传文件信息
          <div className="preview">
            <ul>
              <ol>名称: {previewImg.name}</ol>
              <ol>大小: {previewImg.size}</ol>
            </ul>
            <img src={previewImg.url} width={300} />
          </div>
        </>
      )}
    </>
  );
}

export default UploadCrop;