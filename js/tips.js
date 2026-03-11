// tips.js
import langManager from '/js/langManager.js';

let currentElement = null;
let tipsElement = null;

export async function initializeTips() {
    // 等待多语言系统初始化完成
    await langManager.init();

    tipsElement = document.getElementById('tips');
    const offsetX = 80;
    const offsetY = 0;

    // 初始化提示绑定
    const bindTips = (elements) => {
        elements.forEach(element => {
            element.addEventListener('mouseenter', handleMouseEnter);
            element.addEventListener('mouseleave', handleMouseLeave);
        });
    };

    // 处理鼠标进入事件
    const handleMouseEnter = (event) => {
        currentElement = event.target;
        updateTipContent();
        updateTipPosition();
        tipsElement.style.display = 'block';
        tipsElement.style.opacity = 1;
    };

    // 处理鼠标离开事件
    const handleMouseLeave = () => {
        currentElement = null;
        tipsElement.style.display = 'none';
        tipsElement.style.opacity = 0;
    };

    // 更新提示内容
    const updateTipContent = () => {
        if (!currentElement) return;
        const tipsKey = currentElement.getAttribute('data-tips');
        tipsElement.textContent = langManager.translate(tipsKey);
    };

    // 更新提示位置
    const updateTipPosition = () => {
        if (!currentElement) return;
        const rect = currentElement.getBoundingClientRect();
        tipsElement.style.left = `${rect.left + window.scrollX + offsetX}px`;
        tipsElement.style.top = `${rect.bottom + window.scrollY + offsetY}px`;
    };

    // 监听语言变化事件
    document.addEventListener('languageChanged', () => {
        if (currentElement && tipsElement.style.display === 'block') {
            updateTipContent();
            updateTipPosition();
        }
    });

    // 初始绑定所有元素
    const elements = document.querySelectorAll('[data-tips]');
    bindTips(elements);

    // 观察DOM变化动态绑定新元素
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'childList') {
                mutation.addedNodes.forEach((node) => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.hasAttribute('data-tips')) {
                            bindTips([node]);
                        }
                        const elements = node.querySelectorAll('[data-tips]');
                        bindTips(elements);
                    }
                });
            }
        });
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
}