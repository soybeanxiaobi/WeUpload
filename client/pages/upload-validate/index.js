import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Button, Grid, Tag } from 'zent';

import { checkType } from './utils/type';
import { checkPxByImage, checkPxByHeader } from './utils/px';

const UploadBlog = () => {
  const inputRef = useRef(null);

  const [datasets, setDatasets] = useState([]);

  useEffect(() => {
    document.title = '01-上传前置校验';
  }, [])

  // 打开文件选择框
  const handleAddFile = () => {
    const inputEv = inputRef.current;
    inputEv.click();
  };

  const handleChange = async e => {
    const files = e.target.files;
    const isPNG = await checkType(files[0]);
    // checkPxByImage(files[0])
    // checkPxByHeader(files[0])
    setDatasets([...datasets, { name: files[0].name, type: isPNG ? 'image/png' : files[0].type, size: files[0].size }]);
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
  {
    title: '是否为png',
    bodyRender: ({ type }) => type === 'image/png' ? <Tag theme="green">是</Tag> : <Tag theme="yellow">否</Tag>
  },
  // {
  //   title: '是否符合尺寸',
  //   bodyRender: ({ isMatchPx }) => isMatchPx ? <Tag theme="green">是</Tag> : <Tag theme="yellow">否</Tag>
  // }
  ], [datasets]);

  return (
    <>
      {/* <Input type="file" onChange={handleChange} /> */}
      <input type="file" ref={inputRef} style={{ display: 'none' }} onChange={handleChange} />
      <Button type="primary" onClick={handleAddFile}>
        添加文件
        </Button>
      <Grid rowKey="name" columns={colums} datasets={datasets} className="upload-grid" />
    </>
  )
}

export default UploadBlog;