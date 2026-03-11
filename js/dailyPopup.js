// dailyPopup.js

// 配置项
const POPUP_CONFIG = {
    interval: 1, // 24小时（秒）
    htmlPath: '/ui/dailyPopup.html',
    popupId: 'welcome-popup',
    overlayId: 'overlay',
    closeButtonId: 'close-popup'
  };
  
  // DOM元素缓存
  let cachedElements = {
    popup: null,
    overlay: null,
    closeButton: null
  };
  
  // 初始化每日弹窗
  export function initializeDailyPopup() {
    document.addEventListener('DOMContentLoaded', showDailyPopup);
  }
  
  // 获取并处理内容
  async function fetchAndProcess(url, successCallback, errorCallback) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.statusText}`);
      }
      const data = await response.text();
      successCallback(data);
    } catch (error) {
      console.error('Error loading content:', error);
      errorCallback?.(error);
    }
  }
  
  // 显示每日弹窗
  async function showDailyPopup() {
    // 只在一级域名（根路径）生效
    if (window.location.pathname !== '/') {
      return;
    }

    const now = Date.now();
    const lastShown = localStorage.getItem('dailyPopupLastShown');
    const lastShownTime = lastShown ? new Date(lastShown).getTime() : 0;
  
    if (!lastShown || (now - lastShownTime) / 1000 >= POPUP_CONFIG.interval) {
      await fetchAndProcess(
        POPUP_CONFIG.htmlPath,
        displayPopupContent,
        error => console.error('Error loading daily popup:', error)
      );
    }
  }
  
  // 显示弹窗内容
  function displayPopupContent(html) {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
  
    // 创建并添加弹窗容器
    const popupContainer = document.createElement('div');
    popupContainer.innerHTML = doc.body.innerHTML;
    document.body.appendChild(popupContainer);
  
    // 添加样式和脚本（避免重复）
    [...doc.querySelectorAll('style, script')].forEach(element => {
      const selector = `${element.tagName.toLowerCase()}[data-id="${element.getAttribute('data-id')}"]`;
      if (!document.querySelector(selector)) {
        document[element.tagName === 'STYLE' ? 'head' : 'body'].appendChild(element);
      }
    });
  
    // 缓存DOM元素
    cachedElements = {
      popup: document.getElementById(POPUP_CONFIG.popupId),
      overlay: document.getElementById(POPUP_CONFIG.overlayId),
      closeButton: document.getElementById(POPUP_CONFIG.closeButtonId)
    };
  
    initPopup();
    localStorage.setItem('dailyPopupLastShown', new Date().toISOString());
  }
  
  // 初始化弹窗
  function initPopup() {
    const { popup, overlay, closeButton } = cachedElements;
  
    if (!popup || !overlay || !closeButton) {
      console.error('Popup elements not found');
      return;
    }
  
    // 关闭处理函数
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closePopup();
      }
    };
  
    // 增强关闭功能
    let isClosed = false;
    const originalClose = closePopup;
  
    closePopup = () => {
      if (isClosed) return;
      isClosed = true;
      
      document.removeEventListener('keydown', handleKeyDown);
      originalClose();
    };
  
    // 事件监听
    document.addEventListener('keydown', handleKeyDown);
    closeButton.addEventListener('click', closePopup);
    overlay.addEventListener('click', closePopup);
    popup.addEventListener('click', e => e.stopPropagation());
  }
  
  // 基础关闭逻辑
  function closePopup() {
    const { popup, overlay } = cachedElements;
    if (overlay) overlay.style.display = 'none';
    if (popup) popup.style.display = 'none';
  }
  
  // 全局访问
  window.closePopup = closePopup;
  
  // 初始化
  // initializeDailyPopup();