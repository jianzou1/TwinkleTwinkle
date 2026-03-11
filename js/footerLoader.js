// footerLoader.js
import langManager from '/js/langManager.js'; 
export function footerLoader() {
    const footerContainer = document.querySelector('.dynamic-footer');

    if (!footerContainer) {
        console.error(langManager.translate('errors.element_not_found', 'dynamic-footer'));
        return;
    }

    // 检查路径是否包含'post'
    const isPostPage = window.location.href.includes('post');

    // 页脚模板（根据条件决定是否包含last-updated元素）
    const footerContent = `
      <div class="status-bar">
        <p class="status-bar-field" data-lang-id="footer_name"></p>
        ${!isPostPage ? '<p class="status-bar-field" id="last-updated" data-lang-id="footer_update_time"></p>' : ''}
              </div>
    `;
    
    footerContainer.innerHTML = footerContent;

    // 如果不是post页面，则处理更新时间
    if (!isPostPage) {
        const lastUpdatedElement = footerContainer.querySelector('#last-updated');

        const handleParameters = async () => {
            try {
                const lastUpdated = await getLastUpdatedDateFromGitHub();
                // 使用新的参数传递方式
                langManager.applyParameters(
                    lastUpdatedElement,
                    'footer_update_time',
                    lastUpdated
                );
            } catch (error) {
                console.error(langManager.translate('errors.update_time_fetch'));
                langManager.applyParameters(
                    lastUpdatedElement,
                    'footer_update_time',
                    '---'
                );
            }
        };

        // 初始化语言管理器
        if (!langManager.isInitialized) {
            langManager.init().then(handleParameters);
        } else {
            handleParameters();
        }
    }
}

// 从GitHub获取最后更新时间的函数
async function getLastUpdatedDateFromGitHub() {
    const url = 'https://api.github.com/repos/jianzou1/drunkfrog';
    const cacheKey = 'lastUpdatedDate';
    const cacheExpiration = 86400000; // 24小时缓存（增加从1小时）
    const fallbackDate = new Date().toLocaleString([], {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    });

    // 检查缓存
    let cachedData = null;
    try {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
            cachedData = JSON.parse(cached);
        }
    } catch (e) {
        console.warn('[Footer] 缓存读取失败:', e);
    }

    // 如果缓存有效，直接返回
    if (cachedData) {
        const { timestamp, date } = cachedData;
        if (Date.now() - timestamp < cacheExpiration) {
            console.log('[Footer] 使用缓存的更新时间:', date);
            return date;
        }
    }

    // 获取最新数据
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000); // 5秒超时

        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);

        if (!response.ok) {
            // 403 或 429 是速率限制，返回过期缓存而不是报错
            if ((response.status === 403 || response.status === 429) && cachedData) {
                console.warn(`[Footer] API 返回 ${response.status}，使用过期缓存`);
                return cachedData.date;
            }
            throw new Error(`HTTP ${response.status}`);
        }
        
        const data = await response.json();
        const lastUpdated = new Date(data.updated_at).toLocaleString([], {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });

        // 更新缓存
        try {
            localStorage.setItem(cacheKey, JSON.stringify({
                timestamp: Date.now(),
                date: lastUpdated
            }));
            console.log('[Footer] 缓存已更新:', lastUpdated);
        } catch (e) {
            console.warn('[Footer] 缓存写入失败:', e);
        }

        return lastUpdated;
    } catch (error) {
        console.error('[Footer] GitHub API 调用失败:', error.message);
        
        // 如果有任何缓存（即使过期），优先返回它
        if (cachedData) {
            console.log('[Footer] API 失败，返回最后一次缓存:', cachedData.date);
            return cachedData.date;
        }

        // 所有都失败，返回当前日期作为最后降级
        console.log('[Footer] 返回当前日期作为降级方案');
        return fallbackDate;
    }
}