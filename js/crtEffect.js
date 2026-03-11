// crtEffect.js


const CONFIG = {
    CANVAS_CLASS: 'crt-effect',
    CHECKBOX_ID: 'crtToggle',
    STORAGE_KEY: 'crtEffectEnabled',
    SCAN_LINE: {
        INTERVAL: 4,
        SPEED: 0.06,
        COLORS: [
            'rgba(255, 0, 0, 0.08)',
            'rgba(0, 255, 0, 0.08)',
            'rgba(0, 0, 255, 0.08)'
        ],
        OSCILLATION: {
            FREQ: 50,
            AMP: 0.2
        }
    }
};

// 单例控制器
let instance = null;
let instanceCount = 0;

export function initCRT() {
    if (instance) {
        instanceCount++;
        console.info(`[CRT] Using existing instance (count: ${instanceCount})`);
        return instance;
    }

    // ==== 核心元素 ====
    const canvas = document.querySelector(`.${CONFIG.CANVAS_CLASS}`);
    if (!canvas) {
        console.warn('[CRT] Canvas element not found');
        return null;
    }

    const ctx = canvas.getContext('2d');
    let isEffectEnabled = true;
    let animationId = null;
    let checkbox = null;
    let observer = null;

    // ==== 事件追踪系统 ====
    const eventRegistry = {
        resize: { handler: null, target: window },
        domReady: { handler: null, target: document },
        checkbox: { handler: null, target: null }
    };

    // ==== 动画渲染模块 ====
    let scanOffset = 0;
    
    const renderFrame = () => {
        if (!isEffectEnabled) return;

        // 动态调整画布尺寸
        if (canvas.width !== window.innerWidth || canvas.height !== window.innerHeight) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        }

        // 清除并绘制背景
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.fillStyle = 'rgba(0, 0, 0, 0.05)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // 绘制扫描线效果
        for (let y = 0; y < canvas.height; y += CONFIG.SCAN_LINE.INTERVAL) {
            const baseOffset = scanOffset % CONFIG.SCAN_LINE.INTERVAL;
            
            CONFIG.SCAN_LINE.COLORS.forEach((color, index) => {
                const waveOffset = Math.sin(y / CONFIG.SCAN_LINE.OSCILLATION.FREQ) * 
                                 CONFIG.SCAN_LINE.OSCILLATION.AMP;
                const lineOffset = baseOffset + waveOffset + index * 0.3;
                
                ctx.fillStyle = color;
                ctx.fillRect(
                    0, 
                    (y + lineOffset) % canvas.height,
                    canvas.width,
                    1
                );
            });
        }

        scanOffset += CONFIG.SCAN_LINE.SPEED;
        animationId = requestAnimationFrame(renderFrame);
    };

    const stopAnimation = () => {
        if (animationId) {
            cancelAnimationFrame(animationId);
            animationId = null;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
    };

    // ==== 状态管理 ====
    const loadSettings = () => {
        try {
            const saved = localStorage.getItem(CONFIG.STORAGE_KEY);
            return saved !== null ? JSON.parse(saved) : true;
        } catch (error) {
            console.warn('[CRT] Settings load error:', error);
            return true;
        }
    };

    const saveSettings = (enabled) => {
        try {
            localStorage.setItem(CONFIG.STORAGE_KEY, JSON.stringify(enabled));
        } catch (error) {
            console.error('[CRT] Settings save error:', error);
        }
    };

    // ==== DOM元素管理 ====
    const setupCheckbox = (element) => {
        if (checkbox) return;

        checkbox = element;
        eventRegistry.checkbox.target = checkbox;
        
        eventRegistry.checkbox.handler = (e) => {
            const newState = e.target.checked;
            if (newState === isEffectEnabled) return;
            
            isEffectEnabled = newState;
            saveSettings(newState);
            
            if (newState) {
                renderFrame();
            } else {
                stopAnimation();
            }
        };

        checkbox.addEventListener('change', eventRegistry.checkbox.handler);
        checkbox.checked = isEffectEnabled;
    };

    const initObserver = () => {
        if (observer) return;

        observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    const target = document.getElementById(CONFIG.CHECKBOX_ID);
                    if (target) setupCheckbox(target);
                }
            }
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributeFilter: ['id']
        });
    };

    // ==== 事件管理 ====
    const initEventListeners = () => {
        // 窗口大小变化事件
        eventRegistry.resize.handler = () => {
            if (isEffectEnabled) renderFrame();
        };
        eventRegistry.resize.target.addEventListener(
            'resize',
            eventRegistry.resize.handler,
            { passive: true }
        );

        // DOM加载事件
        if (document.readyState === 'loading') {
            eventRegistry.domReady.handler = initialize;
            eventRegistry.domReady.target.addEventListener(
                'DOMContentLoaded',
                eventRegistry.domReady.handler,
                { once: true }
            );
        } else {
            initialize();
        }
    };

    const removeEventListeners = () => {
        Object.values(eventRegistry).forEach(({ target, handler }) => {
            if (target && handler) {
                target.removeEventListener('resize', handler);
                target.removeEventListener('DOMContentLoaded', handler);
                target.removeEventListener('change', handler);
            }
        });
    };

    // ==== 初始化流程 ====
    const initialize = () => {
        isEffectEnabled = loadSettings();
        
        const existingCheckbox = document.getElementById(CONFIG.CHECKBOX_ID);
        if (existingCheckbox) {
            setupCheckbox(existingCheckbox);
        } else {
            initObserver();
        }

        if (isEffectEnabled) renderFrame();
    };

    // ==== 清理流程 ====
    const cleanup = () => {
        // 1. 停止动画
        stopAnimation();
        
        // 2. 移除事件监听
        removeEventListeners();
        
        // 3. 断开DOM观察
        if (observer) {
            observer.disconnect();
            observer = null;
        }
        
        // 4. 重置引用
        checkbox = null;
        instance = null;
        instanceCount = 0;
    };

    // ==== 公共API ====
    const api = {
        enable() {
            if (isEffectEnabled) return;
            isEffectEnabled = true;
            saveSettings(true);
            if (checkbox) checkbox.checked = true;
            renderFrame();
        },

        disable() {
            if (!isEffectEnabled) return;
            isEffectEnabled = false;
            saveSettings(false);
            if (checkbox) checkbox.checked = false;
            stopAnimation();
        },

        destroy() {
            if (instanceCount > 0) {
                instanceCount--;
                return;
            }
            cleanup();
        }
    };

    // ==== 单例初始化 ====
    initEventListeners();
    instance = api;
    instanceCount = 1;

    return api;
}