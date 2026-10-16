export const navigationHTML = (currentPage = 'home', basePath = '') => {
    const navItems = [
        { href: `${basePath}index.html`, label: 'Home', id: 'home' },
        { href: `${basePath}pages/services.html`, label: 'Services', id: 'services' },
        { href: `${basePath}pages/properties.html`, label: 'Properties', id: 'properties' },
        { href: `${basePath}pages/projects.html`, label: 'Projects', id: 'projects' },
        { href: `${basePath}pages/about.html`, label: 'About', id: 'about' },
        { href: `${basePath}pages/contact.html`, label: 'Contact', id: 'contact' },
        { href: `${basePath}index.html#contact`, label: 'Get a Quote', id: 'quote', cta: true }
    ];

    const navLinks = navItems.map(item => {
        const isActive = item.id === currentPage;
        const ctaClass = item.cta ? ' nav-cta' : '';
        const ariaCurrent = isActive ? ' aria-current="page"' : '';
        const dataNav = ` data-nav="${item.id}"`;
        return `<a href="${item.href}"${dataNav}${ariaCurrent}${ctaClass}>${item.label}</a>`;
    }).join('');

    return `
<header class="nav">
    <div class="wrap navin">
        <a class="logo" href="${basePath}index.html" aria-label="OTI-TECH Home"><span class="logo-text">OTI-TECH</span></a>
        <button class="nav-toggle" type="button" aria-label="Open navigation menu" aria-expanded="false" aria-controls="main-nav"><span></span><span></span><span></span></button>
        <nav id="main-nav" aria-label="Main navigation">
            ${navLinks}
        </nav>
    </div>
</header>
`;
};

export const initNavigation = () => {
    const navToggle = document.querySelector('.nav-toggle');
    const mainNav = document.querySelector('#main-nav');

    const setNavigationOpen = (isOpen, returnFocus = false) => {
        if (!navToggle || !mainNav) return;

        navToggle.setAttribute('aria-expanded', String(isOpen));
        navToggle.setAttribute('aria-label', isOpen ? 'Close navigation menu' : 'Open navigation menu');
        navToggle.classList.toggle('is-open', isOpen);
        mainNav.classList.toggle('is-open', isOpen);
        document.body.classList.toggle('nav-open', isOpen);

        if (returnFocus) navToggle.focus();
    };

    navToggle?.addEventListener('click', () => {
        setNavigationOpen(navToggle.getAttribute('aria-expanded') !== 'true');
    });

    mainNav?.querySelectorAll('a').forEach((link) => {
        link.addEventListener('click', () => setNavigationOpen(false));
    });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && mainNav?.classList.contains('is-open')) {
            setNavigationOpen(false, true);
        }
    });

    document.addEventListener('click', (event) => {
        if (mainNav?.classList.contains('is-open') && !mainNav.contains(event.target) && !navToggle?.contains(event.target)) {
            setNavigationOpen(false);
        }
    });

    const mobileNavigation = window.matchMedia('(max-width: 900px)');
    mobileNavigation.addEventListener('change', (event) => {
        if (!event.matches) setNavigationOpen(false);
    });
};