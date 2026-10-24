import { createImageGallery } from './image-gallery.js';

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));
const safeImage = (value = '') => {
    const source = String(value);
    return /^(?:https?:\/\/|\/(?!\/)|\.{1,2}\/)/i.test(source) ? escapeHtml(source) : '';
};

export const projectCategories = {
    residential: 'Residential',
    commercial: 'Commercial',
    mixed_use: 'Mixed Use',
    renovation: 'Renovation'
};

export const projectStatuses = {
    completed: 'Completed',
    ongoing: 'Ongoing',
    planning: 'Planning'
};

const projectImageFallbacks = {
    residential: '../img/context/family-house.webp',
    commercial: '../img/context/office-tower.webp',
    mixed_use: '../img/context/urban-courtyard.webp',
    renovation: '../img/context/heritage-renovation.webp'
};

export const sampleProjects = [
    {
        slug: 'modern-home-ikeja',
        title: 'Modern Family Residence - Ikeja GRA',
        category: 'residential',
        status: 'completed',
        location: 'Ikeja GRA, Lagos',
        year: '2024',
        size: '450 sqm',
        value: '180000000.00',
        valueLabel: '₦180M',
        image: '../img/context/residence-lagos.webp',
        description: 'A contemporary 5-bedroom family home featuring clean lines, natural ventilation, and indoor-outdoor flow. Designed for a young family with entertaining spaces on the ground floor and private quarters above.',
        highlights: ['Passive cooling design', 'Solar PV integration', 'Smart home automation', 'Landscaped garden with irrigation'],
        services: ['building_design', 'construction', 'real_estate'],
        accent: 'plum'
    },
    {
        slug: 'bungalow-ibadan',
        title: 'Executive Bungalow - Bodija, Ibadan',
        category: 'residential',
        status: 'completed',
        location: 'Bodija, Ibadan, Oyo',
        year: '2023',
        size: '320 sqm',
        value: '95000000.00',
        valueLabel: '₦95M',
        image: '../img/context/bungalow.webp',
        description: 'Single-storey executive residence on a generous corner plot. Accessible design with wide corridors, step-free access throughout, and a focus on ageing-in-place principles.',
        highlights: ['Universal design', 'Borehole & water treatment', 'Backup power system', 'Perimeter security'],
        services: ['building_design', 'construction', 'project_support'],
        accent: 'sand'
    },
    {
        slug: 'apartment-complex-lekki',
        title: 'Luxury Apartment Block - Lekki Phase 1',
        category: 'residential',
        status: 'ongoing',
        location: 'Lekki Phase 1, Lagos',
        year: '2024-2025',
        size: '2,800 sqm (GFA)',
        value: '2400000000.00',
        valueLabel: '₦2.4B',
        image: '../img/context/apartment-lagos.webp',
        description: '12-unit luxury apartment building (2, 3 & 4 bedroom units) with shared amenities. RC frame construction, curtain wall glazing, podium parking. Targeting high-end rental market.',
        highlights: ['Curtain wall facade', 'Podium car park', 'Rooftop terrace & pool', 'Building management system'],
        services: ['building_design', 'construction', 'project_support'],
        accent: 'violet'
    },
    {
        slug: 'courtyard-residence-victoria-island',
        title: 'Courtyard House - Victoria Island',
        category: 'residential',
        status: 'completed',
        location: 'Victoria Island, Lagos',
        year: '2022',
        size: '600 sqm',
        value: '320000000.00',
        valueLabel: '₦320M',
        image: '../img/context/courtyard.webp',
        description: 'Inward-looking courtyard residence providing privacy and tranquility in a dense urban context. Central courtyard organizes circulation and brings light deep into the plan.',
        highlights: ['Central courtyard', 'Cross ventilation', 'Water feature', 'Art integration'],
        services: ['building_design', 'construction'],
        accent: 'rose'
    },
    {
        slug: 'commercial-office-wuse',
        title: 'Grade A Office Building - Wuse 2, Abuja',
        category: 'commercial',
        status: 'completed',
        location: 'Wuse 2, Abuja, FCT',
        year: '2023',
        size: '3,500 sqm (GFA)',
        value: '1800000000.00',
        valueLabel: '₦1.8B',
        image: '../img/context/office-tower.webp',
        description: '7-storey speculative office development. Raised access floors, VRF air-conditioning, double-glazed curtain wall, 3 levels of basement parking. Pre-let to anchor tenant.',
        highlights: ['LEED Gold target', 'Basement parking (3 levels)', 'BMS & access control', 'Retail podium'],
        services: ['building_design', 'construction', 'project_support'],
        accent: 'ink'
    },
    {
        slug: 'mixed-use-yaba',
        title: 'Mixed-Use Development - Yaba Tech Hub',
        category: 'mixed_use',
        status: 'planning',
        location: 'Yaba, Lagos',
        year: '2025-2027',
        size: '4,200 sqm (GFA)',
        value: '3500000000.00',
        valueLabel: '₦3.5B',
        image: '../img/context/urban-courtyard.webp',
        description: 'Ground-floor retail, 3 floors of co-working/office space, 24 residential units above. Designed for Lagos\'s tech community with high-speed fibre, flexible layouts, and community spaces.',
        highlights: ['Co-working floors', 'Rooftop event space', 'Secure bike storage', 'Fibre-to-the-desk'],
        services: ['building_design', 'project_support'],
        accent: 'olive'
    },
    {
        slug: 'heritage-renovation-ikoyi',
        title: 'Heritage Building Renovation - Ikoyi',
        category: 'renovation',
        status: 'ongoing',
        location: 'Ikoyi, Lagos',
        year: '2024-2025',
        size: '380 sqm',
        value: '220000000.00',
        valueLabel: '₦220M',
        image: '../img/context/heritage-renovation.webp',
        description: 'Sensitive restoration of a 1950s colonial-era residence. Structural repair, facade conservation, modern MEP insertion, and rear extension for contemporary living.',
        highlights: ['Facade retention', 'Structural strengthening', 'MEP integration', 'Heritage compliance'],
        services: ['building_design', 'construction', 'project_support'],
        accent: 'sand'
    },
    {
        slug: 'retail-plaza-ajah',
        title: 'Neighbourhood Retail Plaza - Ajah',
        category: 'commercial',
        status: 'completed',
        location: 'Ajah, Lagos',
        year: '2022',
        size: '1,200 sqm (GFA)',
        value: '450000000.00',
        valueLabel: '₦450M',
        image: '../img/context/retail-plaza.webp',
        description: 'Two-storey retail plaza on the Lekki-Epe Expressway. Anchor supermarket, line shops, food court, and basement parking. Designed for phased tenant fit-out.',
        highlights: ['Expressway visibility', 'Flexible unit sizes', 'Loading bay access', 'Solar water heating'],
        services: ['building_design', 'construction'],
        accent: 'ink'
    }
];

export const normalizeProject = (project) => {
    return {
        slug: project.slug,
        title: project.title,
        category: project.category,
        status: project.status,
        location: project.location,
        year: project.year,
        size: project.size,
        value: project.value,
        valueLabel: project.value_label || project.valueLabel || (project.value ? new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(project.value)) : 'Value not disclosed'),
        image: project.images?.find((image) => image.isCover || image.is_cover)?.url || project.images?.[0]?.url || project.image || projectImageFallbacks[project.category] || '../img/context/residence-lagos.webp',
        images: project.images || [],
        description: project.description,
        highlights: project.highlights || [],
        services: project.services || [],
        accent: project.accent || 'plum',
    };
};

export const getProjectBySlug = (slug) => {
    const normalized = sampleProjects.map(normalizeProject);
    return normalized.find((project) => project.slug === slug);
};

export const projectCardMarkup = (project) => {
    const normalized = normalizeProject(project);
    const statusClass = normalized.status === 'completed' ? 'status-completed' :
                       normalized.status === 'ongoing' ? 'status-ongoing' :
                       'status-planning';
    const statusLabel = projectStatuses[normalized.status] || normalized.status;

    return `
    <article class="project-card project-card--enhanced" data-project-category="${escapeHtml(normalized.category)}" data-project-status="${escapeHtml(normalized.status)}">
        <div class="project-card-image">
            <img src="${safeImage(normalized.image)}" alt="" loading="lazy" width="400" height="300">
            <span class="project-status-badge ${statusClass}">${escapeHtml(statusLabel)}</span>
            <span class="project-category-badge">${escapeHtml(projectCategories[normalized.category] || normalized.category)}</span>
        </div>
        <div class="project-card-body">
            <div class="project-card-meta">
                <span class="project-year">${escapeHtml(normalized.year)}</span>
                <span class="project-location">📍 ${escapeHtml(normalized.location.split(',')[0])}</span>
            </div>
            <h2>${escapeHtml(normalized.title)}</h2>
            <p class="project-summary">${escapeHtml(normalized.description)}</p>
            <div class="project-card-facts">
                <span class="fact"><span class="fact-icon" aria-hidden="true">📐</span>${escapeHtml(normalized.size)}</span>
                <span class="fact"><span class="fact-icon" aria-hidden="true">💰</span>${escapeHtml(normalized.valueLabel)}</span>
            </div>
            <div class="project-services">
                ${normalized.services.map(s => `<span class="service-tag">${escapeHtml(s)}</span>`).join('')}
            </div>
            <a href="project-details.html?slug=${encodeURIComponent(normalized.slug)}" class="btn project-card-btn">View Project <span aria-hidden="true">→</span></a>
        </div>
    </article>
    `;
};

export const projectDetailMarkup = (project) => {
    const normalized = normalizeProject(project);
    const statusClass = normalized.status === 'completed' ? 'status-completed' :
                       normalized.status === 'ongoing' ? 'status-ongoing' :
                       'status-planning';
    const statusLabel = projectStatuses[normalized.status] || normalized.status;

    return `
        <div class="project-detail-visual">
            ${normalized.images.length ? createImageGallery(normalized.images) : `<img src="${safeImage(normalized.image)}" alt="${escapeHtml(normalized.title)}" loading="eager" width="800" height="600">`}
            <div class="project-detail-badges">
                <span class="project-status-badge ${statusClass}">${escapeHtml(statusLabel)}</span>
                <span class="project-category-badge">${escapeHtml(projectCategories[normalized.category] || normalized.category)}</span>
            </div>
        </div>
        <div class="project-detail-content">
            <p class="eyebrow">Project Portfolio · ${escapeHtml(projectCategories[normalized.category] || normalized.category)}</p>
            <div class="project-detail-header">
                <h1>${escapeHtml(normalized.title)}</h1>
                <div class="project-detail-meta">
                    <span class="detail-location">📍 ${escapeHtml(normalized.location)}</span>
                    <span class="detail-year">📅 ${escapeHtml(normalized.year)}</span>
                    <span class="detail-size">📐 ${escapeHtml(normalized.size)}</span>
                    <span class="detail-value">💰 ${escapeHtml(normalized.valueLabel)}</span>
                </div>
            </div>
            <p class="project-detail-lead">${escapeHtml(normalized.description)}</p>
            <section class="project-highlights" aria-labelledby="highlights-title">
                <h2 id="highlights-title">Key Highlights</h2>
                <ul>${normalized.highlights.map((h) => `<li>${escapeHtml(h)}</li>`).join('')}</ul>
            </section>
            ${normalized.services.length ? `
            <section class="project-services-rendered" aria-labelledby="services-title">
                <h2 id="services-title">Services Rendered</h2>
                <div class="services-rendered-tags">
                    ${normalized.services.map(s => `<span class="service-tag">${escapeHtml(s)}</span>`).join('')}
                </div>
            </section>` : ''}
            <div class="project-detail-actions">
                <a class="btn detail-primary" href="https://wa.me/2349017017156?text=${encodeURIComponent('Hello OTI-TECH, I would like to discuss the ' + normalized.title + ' project.')}" target="_blank" rel="noopener noreferrer">Discuss Similar Project <span aria-hidden="true">→</span></a>
                <a class="btn detail-secondary" href="projects.html">Back to Projects</a>
            </div>
        </div>
    `;
};
