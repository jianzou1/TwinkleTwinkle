import '../css/style.css';
import { initializeApp } from './main.js';

// 初始化应用
let appInstance = initializeApp();

// ================= HMR 配置 =================
if (module.hot) {
    module.hot.accept('./main.js', () => {
        // 销毁之前的实例
        if (appInstance) {
            // 如果有销毁方法，调用它
            // appInstance.destroy(); 
        }
        // 重新导入并初始化应用
        const { initializeApp } = require('./main.js');
        appInstance = initializeApp();
    });
}