// main.js
import { loadResources } from '/js/cdnLoader.js';
import { TabHandler } from '/js/tabHandler.js';
import { updateProgressBar } from '/js/progressBar.js';
import { loadPreviewLinks } from '/js/previewLoader.js';
import { footerLoader } from '/js/footerLoader.js';
import { handleScrollAndScrollToTop } from '/js/scrollToTop.js';
// import { initializeDailyPopup } from '/js/dailyPopup.js';
import { initializeTips } from '/js/tips.js';
import { gameList } from '/js/gameList.js';
import { initGameRoll } from '/js/gameRoll.js';
import { initializeGallery } from '/js/gallery.js';
import { initCRT } from '/js/crtEffect.js';
// import { initializeRandomLogo } from '/js/logoRandomizer.js';
import { initializePassword } from '/js/password.js';
import langManager from '/js/langManager.js';

const TABLIST_SELECTOR = '[role="tablist"]';
const TAB_DATA = [
  { url: '/page/home.html', text: 'TwinkleTwinkle' }
];

const bindGlobalPjaxNavigation = (pjax, getTabHandler) => {
  const navigateByPjax = (url, event) => {
    const targetUrl = new URL(url, window.location.origin);

    if (targetUrl.origin !== window.location.origin) {
      return;
    }

    if (targetUrl.pathname === window.location.pathname && targetUrl.search === window.location.search) {
      return;
    }

    event.preventDefault();
    pjax.loadUrl(`${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`);
    getTabHandler()?.updateSelectedTab(targetUrl.pathname);
  };

  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0) {
      return;
    }

    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
      return;
    }

    const pjaxTrigger = event.target.closest('[data-pjax-url]');
    if (pjaxTrigger && !pjaxTrigger.closest(TABLIST_SELECTOR)) {
      if (pjaxTrigger.hasAttribute('data-no-pjax')) {
        return;
      }

      const pjaxUrl = pjaxTrigger.getAttribute('data-pjax-url');
      if (!pjaxUrl) {
        return;
      }

      navigateByPjax(pjaxUrl, event);
      return;
    }

    const link = event.target.closest('a[href]');
    if (!link) {
      return;
    }

    if (link.closest(TABLIST_SELECTOR)) {
      return;
    }

    if (link.hasAttribute('download') || link.getAttribute('target') === '_blank' || link.hasAttribute('data-no-pjax')) {
      return;
    }

    const rawHref = link.getAttribute('href');
    if (!rawHref || rawHref.startsWith('#') || rawHref.startsWith('mailto:') || rawHref.startsWith('tel:')) {
      return;
    }

    navigateByPjax(link.href, event);
  });
};

const initializeApp = async () => {
  try {
    // 初始化多语言管理器
    await langManager.init();
    
    // 初始化随机Logo（仅整页加载）
    // initializeRandomLogo();

    // 加载PJAX依赖
    const { Pjax } = await loadResources();

    // 配置PJAX实例
    const pjax = new Pjax({
      selectors: ['head title', '#main'],
      cacheBust: false,
    });

    let currentTabHandler = null;
    const getTabHandler = () => currentTabHandler;

    const refreshTabHandler = () => {
      const tablist = document.querySelector(TABLIST_SELECTOR);
      if (!tablist) {
        currentTabHandler = null;
        return;
      }

      tablist.innerHTML = '';
      currentTabHandler = new TabHandler(TABLIST_SELECTOR, TAB_DATA, pjax);
    };

    bindGlobalPjaxNavigation(pjax, getTabHandler);

    // PJAX事件监听
    document.addEventListener('pjax:complete', () => {
      handlePageLoad();
      langManager.applyTranslations();
    });

    // 页面加载处理器
    const handlePageLoad = () => {
      try {
        const currentUrl = window.location.pathname;

        refreshTabHandler();

        // 页面类型判断
        switch (currentUrl) {
          case '/page/home.html':
            initializePassword(pjax);
            break;
          case '/page/article.html':
            loadPreviewLinks(pjax, currentTabHandler);
            break;
          case '/page/game.html':
            gameList();
            initGameRoll();
            break;
          case '/page/gallery.html':
            initializeGallery();
            break;
          case '/page/password.html':
            initializePassword(pjax);
            break;
          default:
            break;
        }

        // 通用功能初始化
        footerLoader();
        handleScrollAndScrollToTop();
        initializeTips();
        initCRT();
      } catch (error) {
        console.error('页面加载过程中出错:', error);
      }
    };

    // 初始页面加载
    handlePageLoad();
  } catch (error) {
    console.error('应用初始化失败:', error);
  }
};

// 启动应用

export { initializeApp };