// tabHandler.js
export class TabHandler {
    static preloaded = false; // 静态标志，防止重复预加载

    constructor(tabListSelector, tabData, pjaxInstance) {
        this.tabList = document.querySelector(tabListSelector);
        this.tabData = tabData;
        this.pjax = pjaxInstance;

        if (!this.tabList) {
            console.error('Tab list element not found');
            return;
        }

        this.initTabs();
        this.updateSelectedTab(window.location.pathname);
    }

    // 初始化选项卡（核心修改点）
    initTabs() {
        const tabElements = this.tabData.map(tab => `
            <li data-url="${tab.url}" role="tab">
                <a href="${tab.url}" 
                   data-pjax 
                   data-lang-id="${tab.text}"
                   data-lang-params="[]"></a>
            </li>
        `).join('');

        this.tabList.innerHTML = tabElements;
        this.tabList.addEventListener('click', this.handleTabClick.bind(this));

        // 预加载所有选项卡内容
        this.preloadTabs();
    }

    // 处理选项卡点击事件
    async handleTabClick(event) {
        const clickedTab = event.target.closest('[role="tab"]');
        if (!clickedTab) return;

        const clickedTabUrl = clickedTab.dataset.url;

        if (clickedTabUrl === window.location.pathname) {
            event.preventDefault();
            return;
        }

        event.preventDefault();

        const windowElement = document.querySelector('.window');
        if (windowElement) {
            windowElement.classList.add('active');
        }

        this.updateSelectedTab(clickedTabUrl);

        const startTime = performance.now(); // 记录开始时间
        console.log('开始加载页面:', clickedTabUrl);

        try {
            await this.pjax.loadUrl(clickedTabUrl);
            const loadTime = performance.now() - startTime;
            if (loadTime < 100) {
                console.log('页面加载完成 (来自预加载缓存):', clickedTabUrl, `耗时: ${loadTime.toFixed(2)}ms`);
            } else {
                console.log('页面加载完成 (来自网络):', clickedTabUrl, `耗时: ${loadTime.toFixed(2)}ms`);
            }
        } catch (error) {
            console.error('页面加载失败:', clickedTabUrl, error);
        } finally {
            if (windowElement) {
                setTimeout(() => {
                    windowElement.classList.remove('active');
                }, 150);
            }
        }
    }

    // 更新选项卡的选择状态
    updateSelectedTab(currentUrl) {
        this.tabList.querySelectorAll('[role="tab"]').forEach(tab => {
            const tabUrl = tab.dataset.url;
            const isActive = currentUrl === tabUrl;

            tab.setAttribute('aria-selected', isActive);
            isActive ? tab.classList.add('active') : tab.classList.remove('active');
        });
    }

    // 预加载所有选项卡内容（使用浏览器缓存）
    preloadTabs() {
        if (TabHandler.preloaded) return; // 已预加载，跳过
        TabHandler.preloaded = true;

        this.tabData.forEach(tab => {
            if (tab.url !== window.location.pathname) {
                // 使用fetch预加载，让浏览器缓存HTML
                fetch(tab.url, { method: 'GET' })
                    .then(response => {
                        if (response.ok) {
                            console.log('预加载成功:', tab.url);
                        } else {
                            console.warn('预加载失败:', tab.url, '状态:', response.status);
                        }
                    })
                    .catch(error => {
                        console.warn('预加载失败:', tab.url, error);
                    });
            }
        });
    }
}