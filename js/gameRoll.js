// gameRoll.js
export function initGameRoll() {
  const CONFIG = {
    GAME_JSON_PATH: '/cfg/game_time_cfg.json',
    SYSTEM_JSON_PATH: '/cfg/system_cfg.json',
    VISIBLE_ITEMS: 3,
    PARTICIPATION_COUNT: 100,
    ANIMATION_DURATION: 1500,
    ITEM_HEIGHT: 30
  };

  const state = {
    isRolling: false,
    gameData: [],
    wonNames: new Set(JSON.parse(sessionStorage.getItem('gameWonNames') || '[]')),
    currentWinner: null,
    loopData: [],
    currentPos: 0,
    uniqueId: Date.now(),
    containerOffset: 0,  // 缓存，避免滚动时反复触发布局
    systemConfig: {
      typeName: {},
      qualityName: {}
    }
  };

  const dom = {
    rollBtn: null,
    result: null,
    story: null,
    container: null,
    items: []
  };

  const ITEM_STYLE = {
    height: `${CONFIG.ITEM_HEIGHT}px`,
    lineHeight: `${CONFIG.ITEM_HEIGHT}px`,
    position: 'absolute',
    width: '100%',
    willChange: 'transform',
    backfaceVisibility: 'hidden'
  };

  function init() {
    setupDOM()
      .then(() => {
        dom.story = document.getElementById('story');
        createScrollContainer();
        loadSystemConfig();
        loadGameData();
        bindEvents();
      })
      .catch(() => {
        dom.result.innerHTML = '<div class="error">系统初始化失败，请检查网络</div>';
      });
  }

  function setupDOM() {
    return new Promise((resolve, reject) => {
      let retries = 0;
      const checkElements = () => {
        dom.rollBtn = document.getElementById('gameRollBtn');
        dom.result = document.getElementById('gameResult');

        if (dom.rollBtn && dom.result) {
          resolve();
        } else if (retries++ < 20) {
          setTimeout(checkElements, 50);
        } else {
          reject(new Error('DOM元素加载超时'));
        }
      };
      checkElements();
    });
  }

  function createScrollContainer() {
    dom.container = document.createElement('div');
    dom.container.className = 'scroll-container';
    dom.container.style.height = `${CONFIG.ITEM_HEIGHT * CONFIG.VISIBLE_ITEMS}px`;

    const totalItems = CONFIG.VISIBLE_ITEMS + 4;
    dom.items = Array.from({ length: totalItems }, (_, i) => {
      const item = document.createElement('div');
      item.className = 'scroll-item';
      Object.assign(item.style, ITEM_STYLE);
      const span = document.createElement('span');
      span.textContent = `游戏${i + 1}`;
      item.appendChild(span);
      return item;
    });

    dom.result.appendChild(dom.container);
    dom.container.append(...dom.items);
  }

  // 返回尚未中过奖的游戏列表
  function getAvailableData() {
    return state.gameData.filter(item => !state.wonNames.has(item.name));
  }

  function bindEvents() {
    dom.rollBtn.addEventListener('click', handleRollClick);
  }

  // 加载系统配置（typeName 和 qualityName）
  async function loadSystemConfig() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(CONFIG.SYSTEM_JSON_PATH, { signal: controller.signal });
      clearTimeout(timeoutId);

      const data = await response.json();
      
      // 解析系统配置
      data.forEach(item => {
        if (item.id === 'typeName' && item.value) {
          state.systemConfig.typeName = parseConfigString(item.value);
        } else if (item.id === 'qualityName' && item.value) {
          state.systemConfig.qualityName = parseConfigString(item.value);
        }
      });
    } catch (err) {
      console.warn('系统配置加载失败，使用默认值:', err);
    }
  }

  // 解析格式为 "1:value1,2:value2" 的字符串为对象
  function parseConfigString(str) {
    const result = {};
    if (!str) return result;
    const pairs = str.split(',');
    pairs.forEach(pair => {
      const [key, val] = pair.split(':');
      if (key && val) {
        result[key.trim()] = val.trim();
      }
    });
    return result;
  }

  function handleRollClick() {
    if (!state.isRolling && state.gameData.length) {
      // 全部游戏已抽完时自动重置记录
      if (!getAvailableData().length) {
        state.wonNames.clear();
        sessionStorage.removeItem('gameWonNames');
      }
      startNewRoll();
    }
  }

  async function loadGameData() {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(CONFIG.GAME_JSON_PATH, { signal: controller.signal });
      clearTimeout(timeoutId);

      const data = await response.json();
      const gameData = normalizeGameData(data);
      if (!gameData.length) throw new Error('无效的游戏数据格式');

      state.gameData = shuffleArray(gameData).map(item => ({
        ...item,
        _uid: ++state.uniqueId
      }));

      state.loopData = generateLoopData();
      updateItems();
      dom.rollBtn.disabled = false;
    } catch {
      dom.result.innerHTML = '<div class="error">数据加载失败，请刷新页面</div>';
      dom.rollBtn.disabled = true;
    }
  }

  function normalizeGameData(data) {
    if (Array.isArray(data)) {
      if (data[0] && typeof data[0] === 'object' && 'name' in data[0]) {
        return data;
      }
      if (Array.isArray(data[1])) return data[1];
    }
    return [];
  }

  // 填充滚动列表数据，数量不足时重复打乱填充，确保始终达到 PARTICIPATION_COUNT
  function generateLoopData() {
    const loop = state.currentWinner ? [state.currentWinner] : [];
    // base 排除当前 winner（避免 loop 中重复出现）
    const base = getAvailableData().filter(
      item => !state.currentWinner || item.name !== state.currentWinner.name
    );

    if (base.length) {
      while (loop.length < CONFIG.PARTICIPATION_COUNT) {
        const needed = CONFIG.PARTICIPATION_COUNT - loop.length;
        loop.push(...shuffleArray([...base]).slice(0, needed));
      }
    }

    return shuffleArray(loop);
  }

  function startNewRoll() {
    state.isRolling = true;
    dom.items.forEach(item => item.classList.remove('winner-spring'));

    if (dom.story) {
      dom.story.textContent = '\u00A0';
      dom.story.style.animation = '';
    }

    state.currentWinner = getWeightedRandom();
    if (!state.currentWinner) {
      state.isRolling = false;
      return;
    }

    // 开始前测量一次，整个动画期间复用
    state.containerOffset = Math.round(dom.result.offsetHeight / 2 - CONFIG.ITEM_HEIGHT / 2);

    state.loopData = generateLoopData();
    state.currentPos = 0;
    updateItems();
    startAnimation(calculateTargetDistance());
  }

  function calculateTargetDistance() {
    const winnerIndex = state.loopData.findIndex(i => i._uid === state.currentWinner._uid);
    return Math.round(
      winnerIndex * CONFIG.ITEM_HEIGHT - state.containerOffset
    ) + CONFIG.PARTICIPATION_COUNT * CONFIG.ITEM_HEIGHT;
  }

  function startAnimation(distance) {
    let startTime = null;
    const startPos = state.currentPos;

    const animate = timestamp => {
      if (!startTime) startTime = timestamp;
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / CONFIG.ANIMATION_DURATION, 1);
      // Cubic ease-in-out：从零速加速、中段全速、末段减速（老虎机感）
      const easing = progress < 0.5
        ? 4 * progress * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      state.currentPos = startPos + distance * easing;
      updateItems();

      progress < 1 ?
        requestAnimationFrame(animate) :
        finalizeAnimation();
    };

    requestAnimationFrame(animate);
  }

  function updateItems() {
    const maxPos = state.loopData.length * CONFIG.ITEM_HEIGHT;
    const normalizedPos = (state.currentPos % maxPos + maxPos) % maxPos;
    const startIndex = Math.floor(normalizedPos / CONFIG.ITEM_HEIGHT);
    const offset = normalizedPos % CONFIG.ITEM_HEIGHT;

    dom.items.forEach((item, i) => {
      const dataIndex = (startIndex + i) % state.loopData.length;
      const itemData = state.loopData[dataIndex];
      const yPos = Math.round(i * CONFIG.ITEM_HEIGHT - offset - state.containerOffset);
      const isWinner = !!state.currentWinner && itemData?._uid === state.currentWinner._uid;

      // 仅在内容变化时写入，减少不必要的 DOM 操作
      const span = item.firstElementChild;
      const newText = itemData?.name || `游戏${i + 1}`;
      const newClass = `scroll-item quality-${itemData?.quality || 1}`;
      if (span.textContent !== newText) span.textContent = newText;
      if (item.className !== newClass) item.className = newClass;

      item.style.transform = `translateY(${yPos}px)`;
      const fw = isWinner ? 'bold' : '';
      const bs = isWinner ? '0 2px 8px rgba(255, 215, 0, 0.5)' : '';
      if (item.style.fontWeight !== fw) item.style.fontWeight = fw;
      if (item.style.boxShadow !== bs) item.style.boxShadow = bs;
    });
  }

  function finalizeAnimation() {
    requestAnimationFrame(() => {
      const winnerIndex = state.loopData.findIndex(i => i._uid === state.currentWinner._uid);
      state.currentPos = Math.round(
        winnerIndex * CONFIG.ITEM_HEIGHT - state.containerOffset
      );
      updateItems();

      // 对停在正中央（yPos=0）的中奖项播放弹簧动画
      const winnerItem = dom.items.find(item => item.style.transform === 'translateY(0px)');
      if (winnerItem) {
        winnerItem.classList.remove('winner-spring');
        void winnerItem.offsetWidth; // 重置动画
        winnerItem.classList.add('winner-spring');
      }

      // 记录本次中奖游戏，临时保存至 sessionStorage（刷新自动清除）
      state.wonNames.add(state.currentWinner.name);
      sessionStorage.setItem('gameWonNames', JSON.stringify([...state.wonNames]));

      if (dom.story) {
        dom.story.style.animation = 'none';
        void dom.story.offsetWidth;
        dom.story.textContent = state.currentWinner?.story || '\u00A0';
      }

      state.isRolling = false;
    });
  }

  function getWeightedRandom() {
    const available = getAvailableData();
    if (!available.length) return null;

    const weights = available.map(item => Math.pow(2, item.quality));
    const totalWeight = weights.reduce((a, b) => a + b, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < available.length; i++) {
      if (random < weights[i]) return available[i];
      random -= weights[i];
    }
    return available[0];
  }

  function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
  }

  init();
}