import React, { useEffect } from 'react';
import axios from 'axios';
import { Notify, Grid, Button } from 'zent';
import { getColumns } from './constants';

const host = 'http://127.0.0.1:3001';

export default () => {
  const handleMergeThirdPartyResource = () => {
    axios
      .get('http://127.0.0.1:3001/download-third_party_resource')
      .then((res) => {
        console.log('res', res);
      })
      .catch((err) => Notify.error(`合并失败 ${err}`));
  };

  return (
    <>
      <div className="upload-action">
        <Button type="primary" onClick={handleMergeThirdPartyResource}>
          下载并合并
        </Button>
        <Button
          outline
          type="primary"
          onClick={() => axios.get(`${host}/rm-resources-files`).then(() => Notify.success('清空文件夹成功'))}
        >
          清空
        </Button>
      </div>
    </>
  );
};
