import axios from 'axios';

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

// 每次调用构建一个新的axios对象,以便于模拟断点续传
export const smartAxios = () => {
  const axiosCancelToken = axios.CancelToken;
  const axiosSourceCancel = axiosCancelToken.source();

  const request = async config => {
    if(config) {
      await axios({
        ...config,
        cancelToken: axiosSourceCancel.token,
      })
    }
  }

  return {
    request,
    axiosSourceCancel,
  }
}