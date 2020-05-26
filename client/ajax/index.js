// 仅chrome运行
// const request = new XMLHttpRequest();
// request.onreadystatechange = () => {
//   if (request.readyState === 4) {
//     // 校验code
//     if (request.status === 200) {
//       console.log("status 200 request", request);
//       return request.responseText;
//     } else {
//       return request.status;
//     }
//   }
// };

export const ajax = ({
  url,
  data = {},
  async = true,
  method = "get",
  header = {
    "Content-type": "application/json"
  },
}) => {
  if (typeof url === "undefined") {
    throw "请输入请求地址";
  }
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onreadystatechange = () => {
      if (xhr.readyState === 4 && xhr.status === 200) {
        resolve(xhr.responseText);
      }
    };
    xhr.open(method, url, async);
    if (method === "get") {
      xhr.send();
    }
    if (method === "post") {
      Object.keys(header).forEach(key => {
        xhr.setRequestHeader([key], header[key]);
      })
      console.log('ajax data', data);
      xhr.send(JSON.stringify(data));
    }
  });
};
