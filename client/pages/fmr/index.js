
import React, { useState } from 'react';
import axios from 'axios';
import { Button, Notify } from 'zent';

function Fmr(props) {
  const [loading, setLoading] = useState(false);
  const handSubmitMR = () => {
    const params = {
      title: '测试',
      id: 9890,
      source_branch: 'feature/init',
      target_branch: 'master',
      assignee_id: 1518,
    };
    setLoading(true);
    axios({
      method: 'post',
      data: params,
      headers: {
        'Private-Token': 'WkX_J3yGncfsNxUfHrKy',
      },
      url: 'https://gitlab.qima-inc.com/api/v4/projects/9890/merge_requests',
    }).then(res => {
      Notify.success('提交成功');
      console.log('res', res);
    }).catch(err => {
      console.log('err', err);
    }).finally(() => setLoading(false));
  }
  return (
    <div>
      <Button loading={loading} onClick={handSubmitMR}>提交MR</Button>
    </div>
  );
}

export default Fmr;