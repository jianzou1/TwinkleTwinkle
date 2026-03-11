// scrollToTop.js

export function handleScrollAndScrollToTop() {
    const button = document.querySelector('.back-to-top');

    // 检查滚动位置以显示或隐藏按钮
    if (window.scrollY > 300) {
        button.style.display = 'block';
    } else {
        button.style.display = 'none';
    }

    // 添加点击事件以滚动到顶部
    button.onclick = function() {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
}

// 添加 DOMContentLoaded 事件监听器
document.addEventListener('DOMContentLoaded', function() {
    window.addEventListener('scroll', handleScrollAndScrollToTop);
    handleScrollAndScrollToTop(); // 初始检查滚动位置
});
