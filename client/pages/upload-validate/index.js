import React, { useState, useEffect, useMemo } from 'react';
import { Input, Grid, Tag } from 'zent';

import { checkType } from './utils/type';
import { checkPxByImage, checkPxByHeader } from './utils/px';

const UploadBlog = () => {
  const [datasets, setDatasets] = useState([]);

  useEffect(() => {
    document.title = '01-上传前置校验';
  }, [])

  const handleChange = e => {
    const files = e.target.files;
    // checkType(files[0]);
    // checkPxByImage(files[0])
    checkPxByHeader(files[0])
    // setDatasets([...datasets, { name: files[0].name, type: files[0].type, size: files[0].size }]);
  }

  

  const colums = useMemo(() => [{
    title: '文件名',
    name: 'name',
  }, {
    title: '文件大小',
    name: 'size'
  }, {
    title: '文件类型',
    name: 'type'
  },
  // {
  //   title: '是否为png',
  //   bodyRender: ({ type }) => type === 'image/png' ? <Tag theme="green">是</Tag> : <Tag theme="yellow">否</Tag>
  // },
  {
    title: '是否符合尺寸',
    bodyRender: ({ isMatchPx }) => isMatchPx ? <Tag theme="green">是</Tag> : <Tag theme="yellow">否</Tag>
  }
  ], [datasets]);

  return (
    <>
      <Input type="file" onChange={handleChange} />
      <Grid rowKey="name" columns={colums} datasets={datasets} className="upload-grid" />
    </>
  )
}

export default UploadBlog;