import React from 'react';

import './index.scss';

export default () => {
  const doneChunk = [1, 2, 3];
  const chunkCount = 10;
  return (
    <div>
      {new Array(chunkCount).fill('').map((_, idx) => (
        <div key={idx} className={`chunk-block ${doneChunk.includes(idx) ? 'chunk-block-done' : ''}`} />
      ))}
    </div>
  );
};
