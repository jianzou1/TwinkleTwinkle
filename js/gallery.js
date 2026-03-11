// gallery.js

const CONFIG = {
    GALLERY_CONFIG_URL: '/cfg/gallery_cfg.json',
    SYSTEM_CONFIG_URL: '/cfg/system_cfg.json'
};

export async function initializeGallery() {
    const galleryImages = document.getElementById('gallery-images');
    const prevButton = document.getElementById('prevPage');
    const nextButton = document.getElementById('nextPage');
    const pageIndicator = document.getElementById('pageIndicator');
    const titleSelect = document.getElementById('titleSelect');
    const topTitleDisplay = document.getElementById('topTitleDisplay');
    const imageModal = document.getElementById('imageModal');
    const modalImage = document.getElementById('modalImage');
    const caption = document.getElementById('caption');
    const modalClose = document.getElementById('modalClose');

    let currentPage = 1;
    let allImages = [];
    let additional = '';
    let maxPage = 1;

    try {
        const [galleryData, systemData] = await Promise.all([
            fetchGalleryConfig(),
            fetchSystemConfig()
        ]);
        additional = getSystemValue(systemData, 'additional');
        allImages = normalizeGalleryData(galleryData);

        populateTitleSelect(allImages);
        titleSelect.addEventListener('change', handleTitleChange);
        modalClose.addEventListener('click', closeModal);
        window.addEventListener('click', handleWindowClick);
        prevButton.addEventListener('click', () => navigatePage(-1));
        nextButton.addEventListener('click', () => navigatePage(1));

        displayImages();
    } catch (error) {
        console.error('错误:', error);
        alert('加载失败: ' + error.message);
    }

    async function fetchGalleryConfig() {
        const response = await fetch(CONFIG.GALLERY_CONFIG_URL);
        if (!response.ok) throw new Error('网络错误，请重试');
        return await response.json();
    }

    async function fetchSystemConfig() {
        const response = await fetch(CONFIG.SYSTEM_CONFIG_URL);
        if (!response.ok) throw new Error('系统配置加载失败');
        return await response.json();
    }

    function getSystemValue(systemData, id) {
        if (!Array.isArray(systemData)) return '';
        return systemData.find(item => item.id === id)?.value || '';
    }

    function normalizeGalleryData(data) {
        if (Array.isArray(data)) {
            if (data[0] && typeof data[0] === 'object' && 'title' in data[0]) {
                return data;
            }
            if (Array.isArray(data[1])) return data[1];
        }
        return [];
    }

    function populateTitleSelect(images) {
        const titles = [...new Set(images.map(image => image.title))];
        titles.forEach(title => {
            const imagesCount = images.filter(image => image.title === title).length;
            const option = document.createElement('option');
            option.value = title;
            option.textContent = `${title} (${imagesCount}p)`;
            titleSelect.appendChild(option);
        });
    }

    function handleTitleChange() {
        currentPage = 1;
        displayImages();
    }

    function displayImages() {
        galleryImages.innerHTML = '';
        const selectedTitle = titleSelect.value;
        const imagesForTitle = allImages.filter(image => image.title === selectedTitle);
        maxPage = Math.max(...imagesForTitle.map(image => image.page)) || 1;

        const imagesToDisplay = imagesForTitle.filter(image => image.page === currentPage);
        imagesToDisplay.forEach(createImageElement);
        
        pageIndicator.textContent = `${currentPage} / ${maxPage} `;
        topTitleDisplay.textContent = `${selectedTitle}`;
        lazyLoadImages();
        updateNavigationButtons();
    }

    function createImageElement(image) {
        const imgElement = document.createElement('img');
        imgElement.setAttribute('data-src', image.url + additional);
        imgElement.alt = image.mark;
        imgElement.title = image.mark;
        imgElement.style.opacity = 0;
        imgElement.addEventListener('click', () => openModal(image));
        galleryImages.appendChild(imgElement);
    }

    function openModal(image) {
        modalImage.src = image.url;
        caption.textContent = image.mark;
        imageModal.style.display = "flex";
    }

    function closeModal() {
        imageModal.style.display = "none";
    }

    function handleWindowClick(event) {
        if (event.target === imageModal) {
            closeModal();
        }
    }

    function navigatePage(direction) {
        currentPage += direction;
        displayImages();
    }

    function updateNavigationButtons() {
        prevButton.disabled = currentPage === 1;
        nextButton.disabled = currentPage === maxPage;
    }

    function lazyLoadImages() {
        const imgs = document.querySelectorAll('#gallery-images img');
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    const img = entry.target;
                    img.src = img.getAttribute('data-src');
                    img.onload = () => { img.style.opacity = 1; };
                    observer.unobserve(img);
                }
            });
        });
        imgs.forEach(img => observer.observe(img));
    }
}
