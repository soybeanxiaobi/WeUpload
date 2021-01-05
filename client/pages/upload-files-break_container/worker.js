console.log('self', self);
self.onmessage = e => {
  console.log('worker 接收信息', e);
}