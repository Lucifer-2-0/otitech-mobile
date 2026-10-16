const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));

const safeImageSource = (value = '') => {
    const source = String(value);
    return /^(?:https?:\/\/|\/(?!\/)|\.{1,2}\/)/i.test(source) ? escapeHtml(source) : '';
};

export const createImageGallery = (images, options = {}) => {
    const {
        containerClass = 'image-gallery',
        mainClass = 'gallery-main',
        thumbClass = 'gallery-thumbs',
        mainImageClass = 'gallery-main-image',
        thumbImageClass = 'gallery-thumb',
        activeClass = 'is-active',
    } = options;

    if (!images || !images.length) {
        return '';
    }

    const mainImage = images.find(img => img.is_cover || img.isCover) || images[0];
    const mainImageIndex = images.indexOf(mainImage);

    const mainHtml = `
        <div class="${mainClass}">
            <img class="${mainImageClass}" src="${safeImageSource(mainImage.url)}" alt="${escapeHtml(mainImage.alt_text || mainImage.altText || 'Property image')}" loading="eager" width="800" height="600">
        </div>
    `;

    if (images.length <= 1) {
        return `<div class="${containerClass}">${mainHtml}</div>`;
    }

    const thumbsHtml = images.map((img, index) => `
        <button class="${thumbImageClass} ${index === mainImageIndex ? activeClass : ''}" 
                data-index="${index}" 
                aria-label="View image ${index + 1}"
                aria-pressed="${index === mainImageIndex}">
                <img src="${safeImageSource(img.url)}" alt="${escapeHtml(img.alt_text || img.altText || `Image ${index + 1}`)}" loading="lazy" width="120" height="90">
        </button>
    `).join('');

    return `
        <div class="${containerClass}" data-gallery>
            ${mainHtml}
            <div class="${thumbClass}" role="list" aria-label="Image gallery">
                ${thumbsHtml}
            </div>
        </div>
    `;
};

export const initImageGallery = (container) => {
    const mainImage = container.querySelector('[data-gallery] .gallery-main-image');
    const thumbnails = container.querySelectorAll('[data-gallery] .gallery-thumb');

    if (!mainImage || !thumbnails.length) return;

    thumbnails.forEach((thumb, index) => {
        thumb.addEventListener('click', () => {
            const newSrc = thumb.querySelector('img').src;
            const newAlt = thumb.querySelector('img').alt;

            mainImage.src = newSrc;
            mainImage.alt = newAlt;

            thumbnails.forEach(t => t.classList.remove('is-active'));
            thumb.classList.add('is-active');
        });

        thumb.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                thumb.click();
            }
        });
    });

    let currentIndex = Array.from(thumbnails).findIndex((thumb) => thumb.classList.contains('is-active'));
    if (currentIndex < 0) currentIndex = 0;
    const total = thumbnails.length;

    const navigate = (direction) => {
        currentIndex = (currentIndex + direction + total) % total;
        thumbnails[currentIndex].click();
        thumbnails[currentIndex].focus();
    };

    container.addEventListener('keydown', (e) => {
        if (e.key === 'ArrowLeft') {
            e.preventDefault();
            navigate(-1);
        } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            navigate(1);
        }
    });
};

export const enhancePropertyDetailMarkup = (property, baseMarkup) => {
    if (baseMarkup.includes('data-gallery')) return baseMarkup;
    const images = property.images || (property.image ? [{ url: property.image, altText: property.title, isCover: true }] : []);
    if (!images.length) return baseMarkup;
    return baseMarkup.replace(/(<div class="detail-visual[^\"]*"[^>]*>)\s*<img\b[^>]*>/,
        (match, openingTag) => `${openingTag}${createImageGallery(images)}`);
};

export const enhanceProjectDetailMarkup = (project, baseMarkup) => {
    if (baseMarkup.includes('data-gallery')) return baseMarkup;
    const images = project.images || (project.image ? [{ url: project.image, altText: project.title, isCover: true }] : []);
    if (!images.length) return baseMarkup;
    return baseMarkup.replace(/(<div class="project-detail-visual[^\"]*"[^>]*>)\s*<img\b[^>]*>/,
        (match, openingTag) => `${openingTag}${createImageGallery(images)}`);
};

export default { createImageGallery, initImageGallery, enhancePropertyDetailMarkup, enhanceProjectDetailMarkup };
