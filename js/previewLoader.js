// previewLoader.js

export async function loadPreviewLinks(pjax, tabHandler) {
    const links = await fetchLinks(); // 获取包含name字段的配置数据

    const linksContainer = document.getElementById('links-container');
    if (!linksContainer) {
        console.warn('Links container not found');
        return;
    }

    linksContainer.innerHTML = ''; // 清空容器

    // 同步创建所有链接
    links.forEach(link => {
        linksContainer.appendChild(
            createLinkDiv(link.name, { 
                url: link.url, 
                icon: link.icon 
            })
        );
    });

    setupLinksContainer(linksContainer, pjax, tabHandler); // 绑定事件
}

const fetchLinks = async () => {
    try {
        const response = await fetch('/cfg/article_cfg.json');
        if (!response.ok) throw new Error('配置加载失败');

        const links = await response.json();
        return links.map(({ id, url, icon, name }) => ({
            id,
            url: `/post/${url}`,  // 构造完整URL
            icon: `/icon/${icon}`,           // 构造图标路径
            name: name || '未命名'           // 使用配置表标题，缺省时用"未命名"
        }));
    } catch (error) {
        console.error('配置加载失败:', error);
        return [];
    }
};

const createLinkDiv = (title, { url, icon }) => {
    const linkDiv = document.createElement('div');
    linkDiv.className = 'link-preview';
    linkDiv.innerHTML = `
        <div class="link-container" data-url="${url}">
            <span class="link-icon" style="background-image: url('${icon}')"></span>
            <p class="link-title">${title}</p>
        </div>
    `;
    return linkDiv;
};

const setupLinksContainer = (linksContainer, pjax, tabHandler) => {
    linksContainer.addEventListener('click', event => {
        const target = event.target.closest('.link-container');
        if (target?.dataset.url) {
            event.preventDefault();
            pjax.loadUrl(target.dataset.url);
            tabHandler.updateSelectedTab(target.dataset.url);
        }
    });
};