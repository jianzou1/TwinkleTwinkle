/**
 * 增强型多语言管理器 (v3.1)
 * 核心功能：
 * - 统一参数处理
 * - DOM自动绑定
 * - 用户语言缓存
 * - 集中错误处理
 * - HTML安全转义
 * - 换行符自动转换
 */
class LangManager {
  static DEFAULT_CONFIG = {
    debug: false,
    version: '3.1',
    fallbackLang: 'en',
    storageKey: 'user_lang', // 仅存储用户语言设置
    langFile: '/cfg/lang_cfg.json',
    observerOptions: {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ['data-lang-id', 'data-lang-placeholder']
    },
    logger: console,
    placeholderFormats: ['braced', 'numbered']
  };

  constructor(config = {}) {
    this.config = { ...LangManager.DEFAULT_CONFIG, ...config };
    this.currentLang = this.config.fallbackLang;
    this.langData = {};
    this.isInitialized = false;
    this.domObserver = null;
    this.updateInProgress = false;
    this.pendingUpdates = new Set();
    this.dynamicParams = new Map();
    this.paramCache = new Map();
  }

  // ========== 私有方法 ==========
  #log(...args) {
    if (this.config.debug) {
      this.config.logger.log('%c[Lang]', 'color: #4CAF50;', ...args);
    }
  }

  #warn(...args) {
    this.config.logger.warn('%c[Lang]', 'color: #FFC107;', ...args);
  }

  #error(...args) {
    this.config.logger.error('%c[Lang]', 'color: #F44336;', ...args);
  }

  #escapeHtml(text) {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, (m) => map[m]);
  }

  #handleTranslationError(element, key, error) {
    this.#error(`翻译失败 ${key}:`, error);
    if (element) {
      element.classList.add('lang-error');
      element.setAttribute('title', `翻译错误: ${key}`);
    }
    return key;
  }

  async #loadLanguageData() {
    try {
      const response = await fetch(`${this.config.langFile}?v=${this.config.version}`);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const rawData = await response.json();
      this.langData = rawData.reduce((acc, item) => {
        if (!item.id) {
          this.#warn('跳过无效条目:', item);
          return acc;
        }
        acc[item.id] = Object.entries(item).reduce((o, [k, v]) => {
          if (k !== 'id') o[k] = v;
          return o;
        }, {});
        return acc;
      }, {});

      this.#log('语言数据加载成功');
      return true;
    } catch (err) {
      this.#error('语言数据加载失败:', err);
      this.langData = {};
      return false;
    }
  }

  #replacePlaceholders(text, params = []) {
    if (!params.length) return text;

    return params.reduce((str, param, index) => {
      const escapedParam = this.#escapeHtml(param);
      if (this.config.placeholderFormats.includes('braced')) {
        str = str.replace(new RegExp(`\\{${index}\\}`, 'g'), escapedParam);
      }
      if (this.config.placeholderFormats.includes('numbered')) {
        str = str.replace(new RegExp(`%${index + 1}\\$s`, 'g'), escapedParam);
      }
      return str;
    }, text);
  }

  #applyTranslations() {
    if (this.updateInProgress) return;
    this.updateInProgress = true;
    this.pendingUpdates.clear();

    const elements = document.querySelectorAll('[data-lang-id], [data-lang-placeholder]');
    elements.forEach(element => {
      this.#translateElement(element);
    });

    this.updateInProgress = false;

    // 翻译期间 observer 新入队的元素，在下一个微任务中处理
    if (this.pendingUpdates.size > 0) {
      Promise.resolve().then(() => this.#applyTranslations());
    }
  }

  #translateElement(element) {
    // 处理 placeholder 翻译
    if (element.dataset.langPlaceholder) {
      const placeholderId = element.dataset.langPlaceholder;
      const translations = this.langData[placeholderId] || {};
      const text = translations[this.currentLang] ||
                   translations[this.config.fallbackLang] ||
                   placeholderId;
      try {
        element.placeholder = text;
      } catch (err) {
        this.#handleTranslationError(element, placeholderId, err);
      }
      if (!element.dataset.langId) return;
    }

    const id = element.dataset.langId;
    if (!id) return;

    const translations = this.langData[id] || {};
    let text = translations[this.currentLang] || 
               translations[this.config.fallbackLang] || 
               id;

    const dynamicParams = this.dynamicParams.get(id) || [];
    const elementParams = JSON.parse(element.dataset.langParams || '[]');
    const allParams = [...dynamicParams, ...elementParams];

    const isInput = element.tagName === 'INPUT' || element.tagName === 'TEXTAREA';

    try {
      text = this.#replacePlaceholders(text, allParams);

      if (!isInput) {
        text = text.replace(/\n/g, '<br>');
        element.innerHTML = text;
      } else {
        element.value = text;
      }
    } catch (err) {
      this.#handleTranslationError(element, id, err);
      if (!isInput) {
        element.innerHTML = id;
      } else {
        element.value = id;
      }
    }
  }

  #safeBindSwitcher() {
    const switcher = document.getElementById('lang-switcher');
    if (!switcher) return;

    const newSwitcher = switcher.cloneNode(true);
    switcher.parentNode.replaceChild(newSwitcher, switcher);

    if (newSwitcher.value !== this.currentLang) {
      newSwitcher.value = this.currentLang;
    }

    newSwitcher.addEventListener('change', async (e) => {
      const lang = e.target.value;
      if (lang === this.currentLang) return;

      this.#log(`切换语言至: ${lang}`);
      this.currentLang = lang;
      localStorage.setItem(this.config.storageKey, lang);
      this.paramCache.clear();
      this.#applyTranslations();
    });
  }

  #startSmartObserver() {
    if (this.domObserver) return;

    this.domObserver = new MutationObserver((mutations) => {
      if (this.updateInProgress) {
        mutations.forEach(mutation => {
          if (mutation.type === 'childList') {
            mutation.addedNodes.forEach(node => {
              if (node.nodeType === Node.ELEMENT_NODE) {
                if (node.hasAttribute('data-lang-id') || node.hasAttribute('data-lang-placeholder')) {
                  this.pendingUpdates.add(node);
                }
                const langElements = node.querySelectorAll('[data-lang-id], [data-lang-placeholder]');
                langElements.forEach(el => this.pendingUpdates.add(el));
              }
            });
          } else if (mutation.type === 'attributes') {
            this.pendingUpdates.add(mutation.target);
          }
        });
        return;
      }

      const needsUpdate = mutations.some(mutation => {
        return (
          (mutation.type === 'childList' && 
           Array.from(mutation.addedNodes).some(n => 
             n.nodeType === Node.ELEMENT_NODE &&
             (n.hasAttribute('data-lang-id') || 
              n.querySelector('[data-lang-id]'))
           )) ||
          (mutation.type === 'attributes' && 
           mutation.attributeName === 'data-lang-id')
        );
      });

      if (needsUpdate) {
        this.#applyTranslations();
        this.#safeBindSwitcher();
      }
    });

    this.domObserver.observe(document.documentElement, this.config.observerOptions);
  }

  // ========== 公共API ==========
  applyParameters(element, translationKey, ...params) {
    try {
      if (!element.dataset.langId) {
        element.dataset.langId = translationKey;
      }
      
      this.dynamicParams.set(translationKey, params);
      
      const translation = this.translate(translationKey, ...params);
      const isInput = element.tagName === 'INPUT' || element.tagName === 'TEXTAREA';
      
      if (!isInput) {
        element.innerHTML = translation.replace(/\n/g, '<br>');
      } else {
        element.value = translation;
      }
      return true;
    } catch (error) {
      this.#handleTranslationError(element, translationKey, error);
      return false;
    }
  }

  bindDynamicElement(selector, translationKey, paramGenerator) {
    const elements = document.querySelectorAll(selector);
    elements.forEach(element => {
      element.dataset.langId = translationKey;
      this.dynamicParams.set(translationKey, paramGenerator(element));
      this.pendingUpdates.add(element);
    });
    this.#applyTranslations();
  }

  cachedTranslate(key, ...params) {
    const cacheKey = `${key}_${params.join('_')}`;
    if (!this.paramCache.has(cacheKey)) {
      this.paramCache.set(cacheKey, this.translate(key, ...params));
    }
    return this.paramCache.get(cacheKey);
  }

  // 供外部（如 PJAX complete）主动触发一次完整翻译+切换器绑定
  applyTranslations() {
    this.#applyTranslations();
    this.#safeBindSwitcher();
  }

  async init(defaultLang = this.config.fallbackLang) {
    if (this.isInitialized) return;

    await new Promise(resolve => {
      document.readyState === 'complete' ? resolve() : window.addEventListener('load', resolve);
    });

    this.currentLang = localStorage.getItem(this.config.storageKey) || defaultLang;
    await this.#loadLanguageData();
    
    this.#applyTranslations();
    this.#safeBindSwitcher();
    this.#startSmartObserver();
    
    this.isInitialized = true;
    this.#log('初始化完成');
  }

  translate(id, ...params) {
    const translations = this.langData[id] || {};
    const text = translations[this.currentLang] || 
                 translations[this.config.fallbackLang] || 
                 id;
    
    return this.#replacePlaceholders(text, params);
  }

  setLanguage(lang) {
    if (lang === this.currentLang) return;
    this.currentLang = lang;
    localStorage.setItem(this.config.storageKey, lang);
    this.paramCache.clear();
    
    this.dynamicParams.forEach((params, id) => {
      const elements = document.querySelectorAll(`[data-lang-id="${id}"]`);
      elements.forEach(el => this.pendingUpdates.add(el));
    });
    
    this.#applyTranslations();
  }

  getCurrentLang() {
    return this.currentLang;
  }

  setParams(id, params = []) {
    if (!Array.isArray(params)) params = [params];
    this.dynamicParams.set(id, params);
    const elements = document.querySelectorAll(`[data-lang-id="${id}"]`);
    elements.forEach(el => this.pendingUpdates.add(el));
    
    if (!this.updateInProgress) {
      this.#applyTranslations();
    }
  }

  clearParams(id) {
    this.dynamicParams.delete(id);
    this.setParams(id, []);
  }

  async reload() {
    await this.#loadLanguageData();
    this.paramCache.clear();
    this.#applyTranslations();
  }

  configure(newConfig) {
    Object.assign(this.config, newConfig);
  }

  enableDebug(enable = true) {
    this.config.debug = enable;
  }
}

// 单例实例
const langManager = new LangManager();

// 全局暴露
if (typeof window !== 'undefined' && !window.LangManager) {
  window.LangManager = langManager;
}

export default langManager;