export const initHeroCarousel = () => {
    const hero = document.querySelector('.home-hero');
    const carousel = hero?.querySelector('[data-hero-carousel]');
    if (!hero || !carousel || carousel.dataset.ready === 'true') return;

    const slides = Array.from(carousel.querySelectorAll('[data-carousel-slide]'));
    const previousButton = hero.querySelector('[data-carousel-previous]');
    const nextButton = hero.querySelector('[data-carousel-next]');
    const paginationButtons = Array.from(hero.querySelectorAll('[data-carousel-to]'));
    if (slides.length < 2) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    const rotateEvery = 6800;
    let activeIndex = Math.max(0, slides.findIndex((slide) => slide.classList.contains('is-active')));
    let timer = null;

    const pause = () => {
        window.clearTimeout(timer);
        timer = null;
    };

    const scheduleNext = () => {
        pause();
        if (reducedMotion.matches || document.hidden || hero.matches(':hover') || hero.contains(document.activeElement)) return;
        timer = window.setTimeout(() => showSlide(activeIndex + 1), rotateEvery);
    };

    const showSlide = (requestedIndex) => {
        activeIndex = (requestedIndex + slides.length) % slides.length;

        slides.forEach((slide, index) => {
            const isActive = index === activeIndex;
            slide.classList.toggle('is-active', isActive);
            slide.setAttribute('aria-hidden', String(!isActive));
        });

        paginationButtons.forEach((button, index) => {
            button.setAttribute('aria-pressed', String(index === activeIndex));
        });

        scheduleNext();
    };

    previousButton?.addEventListener('click', () => showSlide(activeIndex - 1));
    nextButton?.addEventListener('click', () => showSlide(activeIndex + 1));
    paginationButtons.forEach((button) => {
        button.addEventListener('click', () => showSlide(Number(button.dataset.carouselTo)));
    });

    hero.addEventListener('mouseenter', pause);
    hero.addEventListener('mouseleave', scheduleNext);
    hero.addEventListener('focusin', pause);
    hero.addEventListener('focusout', (event) => {
        if (!hero.contains(event.relatedTarget)) scheduleNext();
    });
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) pause();
        else scheduleNext();
    });
    reducedMotion.addEventListener?.('change', () => {
        if (reducedMotion.matches) pause();
        else scheduleNext();
    });

    carousel.dataset.ready = 'true';
    scheduleNext();
};
