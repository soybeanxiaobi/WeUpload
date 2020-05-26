export const getColumns = [
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
    bodyRender: ({ fileSize }) => `${(fileSize / 1024).toFixed(2)}k`,
  },
];
