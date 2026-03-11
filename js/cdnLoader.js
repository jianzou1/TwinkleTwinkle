// cdn-loader.js

// 定义 CDN 配置 - 支持多个备用源
export const CDN_CONFIG = {
  pjax: [
    'https://github.elemecdn.com/pjax@0.2.8/pjax.min.js',
    'https://cdn.jsdelivr.net/npm/pjax@0.2.8/pjax.min.js',
    'https://unpkg.com/pjax@0.2.8/pjax.min.js',
    'https://cdn.bootcdn.net/ajax/libs/pjax/0.2.8/pjax.js',
    'https://cdn.staticfile.net/pjax/0.2.8/pjax.js'
  ],
  css98: [
    'https://cdn.jsdelivr.net/npm/98.css@0.1.21/dist/98.min.css',
    'https://unpkg.com/98.css@0.1.20/dist/98.min.css',
    'https://cdn.jsdelivr.net/npm/98.css@0.1.21/build.min.js'
  ]
};

// 通用加载函数 - 支持多个备用源
const loadScript = (urls) => {
  const urlList = Array.isArray(urls) ? urls : [urls];
  const start = performance.now();

  // 并行 fetch 多个源，优先使用第一个成功返回的内容（避免多个脚本同时执行）
  const fetchPromises = urlList.map(url =>
    fetch(url, { mode: 'cors' }).then(resp => {
      if (!resp.ok) throw new Error(`HTTP ${resp.status} for ${url}`);
      return resp.text().then(code => ({ url, code }));
    })
  );

  // 首选 Promise.any（第一个 fulfilled），浏览器环境现代均支持
  return Promise.any(fetchPromises)
    .then(({ url, code }) => {
      // 注入脚本内容为 blob，避免其他源的脚本也被执行
      const blob = new Blob([code], { type: 'text/javascript' });
      const blobUrl = URL.createObjectURL(blob);

      return new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = blobUrl;
        script.onload = () => {
          console.log(`Successfully loaded from: ${url} (${Math.round(performance.now() - start)}ms)`);
          URL.revokeObjectURL(blobUrl);
          resolve();
        };
        script.onerror = () => {
          URL.revokeObjectURL(blobUrl);
          reject(new Error(`Script injection failed for ${url}`));
        };
        document.head.appendChild(script);
      });
    })
    .catch(err => {
      // Promise.any 在所有 promise 都 reject 时会到这里（AggregateError）
      console.warn('Parallel fetch failed or all sources unreachable, falling back to sequential script append', err);

      // 回退到顺序加载（通过创建 script 标签）以兼容无法 fetch 的跨域源
      return new Promise((resolve, reject) => {
        let idx = 0;
        const tryLoadSequential = () => {
          if (idx >= urlList.length) {
            reject(new Error(`Failed to load script from all sources: ${urlList.join(', ')}`));
            return;
          }

          const url = urlList[idx++];
          const script = document.createElement('script');
          script.src = url;
          script.onload = () => {
            console.log(`Successfully loaded (sequential) from: ${url} (${Math.round(performance.now() - start)}ms)`);
            resolve();
          };
          script.onerror = () => {
            console.warn(`Failed to load (sequential) from: ${url}, trying next...`);
            tryLoadSequential();
          };
          document.head.appendChild(script);
        };
        tryLoadSequential();
      });
    });
};

const loadStylesheet = async (urls, id) => {
  const orderedUrls = Array.isArray(urls) ? [...urls] : [urls];
  const start = performance.now();

  if (id && document.getElementById(id)) {
    return;
  }

  return new Promise((resolve, reject) => {
    let idx = 0;

    const tryLoad = () => {
      if (idx >= orderedUrls.length) {
        reject(new Error(`Failed to load stylesheet from all sources: ${orderedUrls.join(', ')}`));
        return;
      }

      const url = orderedUrls[idx++];
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      if (id) {
        link.id = id;
      }

      link.onload = () => {
        console.log(`Successfully loaded stylesheet from: ${url} (${Math.round(performance.now() - start)}ms)`);
        resolve();
      };
      link.onerror = () => {
        console.warn(`Failed to load stylesheet from: ${url}, trying next...`);
        link.remove();
        tryLoad();
      };

      document.head.appendChild(link);
    };

    tryLoad();
  });
};

export const loadExternal98Css = async (id = 'external-98css') => {
  return loadStylesheet(CDN_CONFIG.css98, id);
};

// 动态加载资源
const loadPjax = () => loadScript(CDN_CONFIG.pjax).then(() => window.Pjax);
const loadExternalStyle = () => loadExternal98Css('external-98css');

// 统一加载所有资源
export const loadResources = async () => {
  try {
    // 98.css 失败不阻塞主流程，保证页面逻辑仍可执行
    await loadExternalStyle().catch(error => {
      console.warn('Failed to load external style resources:', error);
    });

    const Pjax = await loadPjax();
    return { Pjax };
  } catch (error) {
    console.error('Failed to load resources:', error);
    throw error;
  }
};