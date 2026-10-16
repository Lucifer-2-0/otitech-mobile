import { createImageGallery } from './image-gallery.js';

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));
const safeImage = (value = '') => {
    const source = String(value);
    return /^(?:https?:\/\/|\/(?!\/)|\.{1,2}\/)/i.test(source) ? escapeHtml(source) : '';
};

export const propertyTypes = {
    land: 'Land',
    house: 'House',
    apartment: 'Apartment',
    commercial: 'Commercial'
};

export const propertyPurposes = {
    sale: 'For sale',
    rent: 'For rent'
};

export const propertyStatuses = {
    available: 'Available',
    sold: 'Sold',
    under_offer: 'Under Offer',
    let: 'Let'
};

export const sampleProperties = [
    {
        slug: 'ikeja-residential-plot',
        title: 'Residential Plot - Ikeja GRA',
        type: 'land',
        purpose: 'sale',
        status: 'available',
        location: 'Ikeja GRA, Lagos',
        size: '650 sqm',
        price: '185000000.00',
        priceLabel: '₦185M',
        image: '../img/modern-home-960.webp',
        summary: 'Prime residential plot in the heart of Ikeja GRA. Flat, dry land with clear title and excellent road access. Ideal for a luxury family home.',
        features: ['Clear C of O', 'Corner plot', 'Perimeter fencing', 'Gated estate'],
        accent: 'plum'
    },
    {
        slug: 'lekki-luxury-apartment',
        title: '3-Bed Luxury Apartment - Lekki Phase 1',
        type: 'apartment',
        purpose: 'rent',
        status: 'available',
        location: 'Lekki Phase 1, Lagos',
        size: '245 sqm',
        price: '4200000.00',
        priceLabel: '₦4.2M/yr',
        image: '../img/modern-home-960.webp',
        summary: 'Spacious 3-bedroom apartment in a secure, well-managed development. Modern finishes, balcony with lagoon views, 24/7 power backup.',
        features: ['Lagoon views', 'En-suite bedrooms', 'BQ', 'Gym & pool access'],
        accent: 'violet'
    },
    {
        slug: 'ibadan-family-home',
        title: '4-Bed Detached House - Bodija, Ibadan',
        type: 'house',
        purpose: 'sale',
        status: 'under_offer',
        location: 'Bodija, Ibadan, Oyo',
        size: '420 sqm (land) / 320 sqm (built)',
        price: '95000000.00',
        priceLabel: '₦95M',
        image: '../img/modern-home-960.webp',
        summary: 'Elegant 4-bedroom detached home on a generous plot. Mature garden, borehole, solar system, separate staff quarters. Walking distance to top schools.',
        features: ['Solar + inverter', 'Borehole', 'Staff quarters', 'Mature landscaping'],
        accent: 'sand'
    },
    {
        slug: 'abuja-commercial-office',
        title: 'Grade A Office Suite - Wuse 2, Abuja',
        type: 'commercial',
        purpose: 'rent',
        status: 'available',
        location: 'Wuse 2, Abuja, FCT',
        size: '180 sqm',
        price: '12500000.00',
        priceLabel: '₦12.5M/yr',
        image: '../img/modern-home-960.webp',
        summary: 'Modern office suite in a prime commercial building. Raised floors, VRF air-conditioning, high-speed fibre, dedicated parking. Suitable for corporate HQ.',
        features: ['Raised floors', 'VRF AC', 'Fibre ready', '24/7 security'],
        accent: 'ink'
    },
    {
        slug: 'lagos-mixed-use-land',
        title: 'Mixed-Use Development Site - Yaba',
        type: 'land',
        purpose: 'sale',
        status: 'available',
        location: 'Yaba, Lagos',
        size: '1,200 sqm',
        price: '420000000.00',
        priceLabel: '₦420M',
        image: '../img/modern-home-960.webp',
        summary: 'Strategic corner plot in Yaba\'s tech corridor. Suitable for mixed-use residential/commercial development. High footfall, excellent connectivity.',
        features: ['Corner plot', 'Tech hub location', 'High density approved', 'Fibre infrastructure'],
        accent: 'olive'
    },
    {
        slug: 'surulere-starter-apartment',
        title: '2-Bed Apartment - Surulere',
        type: 'apartment',
        purpose: 'sale',
        status: 'sold',
        location: 'Surulere, Lagos',
        size: '95 sqm',
        price: '42000000.00',
        priceLabel: '₦42M',
        image: '../img/modern-home-960.webp',
        summary: 'Well-maintained 2-bedroom apartment in a quiet cul-de-sac. Good for first-time buyers or investment. Recently painted, allocated parking.',
        features: ['Allocated parking', 'Quiet location', 'Good management', 'Near amenities'],
        accent: 'rose'
    },
    {
        slug: 'victoria-island-penthouse',
        title: '5-Bed Penthouse - Victoria Island',
        type: 'apartment',
        purpose: 'sale',
        status: 'available',
        location: 'Victoria Island, Lagos',
        size: '580 sqm',
        price: '1200000000.00',
        priceLabel: '₦1.2B',
        image: '../img/modern-home-960.webp',
        summary: 'Exceptional penthouse with panoramic ocean and city views. Private lift lobby, roof terrace, home automation, wine cellar. 5 en-suite bedrooms.',
        features: ['Ocean views', 'Private lift', 'Roof terrace', 'Smart home', 'Wine cellar'],
        accent: 'violet'
    },
    {
        slug: 'ajah-commercial-plaza',
        title: 'Retail & Office Plaza - Ajah',
        type: 'commercial',
        purpose: 'sale',
        status: 'available',
        location: 'Ajah, Lagos',
        size: '850 sqm (land) / 1,200 sqm (GFA)',
        price: '680000000.00',
        priceLabel: '₦680M',
        image: '../img/modern-home-960.webp',
        summary: 'Multi-level commercial plaza on the Lekki-Epe Expressway. Ground floor retail, upper floors office suites. High visibility, ample parking, strong rental yield.',
        features: ['Expressway frontage', 'Retail + office', 'Parking: 25 cars', 'Generating set'],
        accent: 'ink'
    },
    {
        slug: 'ikeja-commercial-land',
        title: 'Commercial Land - Opebi, Ikeja',
        type: 'land',
        purpose: 'sale',
        status: 'available',
        location: 'Opebi, Ikeja, Lagos',
        size: '900 sqm',
        price: '320000000.00',
        priceLabel: '₦320M',
        image: '../img/modern-home-960.webp',
        summary: 'Commercial plot on Opebi Link Road. High vehicular and pedestrian traffic. Suitable for showroom, office building or mixed-use. Regular shape, dry land.',
        features: ['Main road frontage', 'Commercial zoning', 'Dry land', 'Clear title'],
        accent: 'plum'
    }
];

export const normalizeProperty = (property) => {
    return {
        slug: property.slug,
        title: property.title,
        type: property.type,
        purpose: property.purpose,
        status: property.status,
        location: property.location,
        size: property.size,
        price: property.price,
        priceLabel: property.price_label || property.priceLabel,
        image: property.images?.find((image) => image.isCover || image.is_cover)?.url || property.images?.[0]?.url || property.image || '../img/modern-home-960.webp',
        images: property.images || [],
        summary: property.summary || property.description,
        features: property.features || [],
        accent: property.accent || 'plum',
    };
};

export const getPropertyBySlug = (slug) => {
    const normalized = sampleProperties.map(normalizeProperty);
    return normalized.find((property) => property.slug === slug);
};

export const propertyCardMarkup = (property) => {
    const normalized = normalizeProperty(property);
    const statusClass = normalized.status === 'available' ? 'status-available' :
                       normalized.status === 'sold' || normalized.status === 'let' ? 'status-sold' :
                       'status-under-offer';
    const statusLabel = propertyStatuses[normalized.status] || normalized.status;

    return `
    <article class="listing-card listing-card--enhanced" data-property-type="${escapeHtml(normalized.type)}" data-property-purpose="${escapeHtml(normalized.purpose)}" data-property-status="${escapeHtml(normalized.status)}">
        <div class="listing-card-image">
            <img src="${safeImage(normalized.image)}" alt="" loading="lazy" width="400" height="300">
            <span class="property-status-indicator ${statusClass}" aria-label="${escapeHtml(statusLabel)}">
                <span class="status-dot" aria-hidden="true"></span>
                <span class="status-text">${escapeHtml(statusLabel)}</span>
            </span>
            <span class="property-type-badge">${escapeHtml(propertyTypes[normalized.type] || normalized.type)}</span>
        </div>
        <div class="listing-card-body">
            <div class="listing-card-meta">
                <span class="listing-purpose">${escapeHtml(propertyPurposes[normalized.purpose] || normalized.purpose)}</span>
                <span class="listing-location">${escapeHtml(normalized.location.split(',')[0])}</span>
            </div>
            <h2>${escapeHtml(normalized.title)}</h2>
            <div class="listing-card-facts">
                <span class="fact"><span class="fact-icon" aria-hidden="true">📐</span>${escapeHtml(normalized.size)}</span>
                <span class="fact"><span class="fact-icon" aria-hidden="true">💰</span>${escapeHtml(normalized.priceLabel)}</span>
            </div>
            <p class="listing-summary">${escapeHtml(normalized.summary)}</p>
            <div class="listing-card-footer">
                <strong class="listing-price">${escapeHtml(normalized.priceLabel)}</strong>
                <a href="property-details.html?slug=${encodeURIComponent(normalized.slug)}" class="btn listing-card-btn">View Details <span aria-hidden="true">→</span></a>
            </div>
        </div>
    </article>
    `;
};

export const propertyDetailMarkup = (property) => {
    const normalized = normalizeProperty(property);
    const statusClass = normalized.status === 'available' ? 'status-available' :
                       normalized.status === 'sold' || normalized.status === 'let' ? 'status-sold' :
                       'status-under-offer';
    const statusLabel = propertyStatuses[normalized.status] || normalized.status;

    return `
        <div class="detail-visual detail-visual--${escapeHtml(normalized.accent)}">
            ${normalized.images.length ? createImageGallery(normalized.images) : `<img src="${safeImage(normalized.image)}" alt="${escapeHtml(normalized.title)}" loading="eager" width="800" height="600">`}
            <span class="property-status-indicator ${statusClass}" aria-label="${escapeHtml(statusLabel)}">
                <span class="status-dot" aria-hidden="true"></span>
                <span class="status-text">${escapeHtml(statusLabel)}</span>
            </span>
        </div>
        <div class="detail-content">
            <p class="eyebrow">Illustrative sample listing · ${escapeHtml(propertyPurposes[normalized.purpose] || normalized.purpose)}</p>
            <div class="detail-header">
                <h1>${escapeHtml(normalized.title)}</h1>
                <div class="detail-meta">
                    <span class="detail-location">📍 ${escapeHtml(normalized.location)}</span>
                    <span class="detail-size">📐 ${escapeHtml(normalized.size)}</span>
                </div>
            </div>
            <p class="detail-lead">${escapeHtml(normalized.summary)}</p>
            <dl class="detail-facts">
                <div><dt>Type</dt><dd>${escapeHtml(propertyTypes[normalized.type] || normalized.type)}</dd></div>
                <div><dt>Purpose</dt><dd>${escapeHtml(propertyPurposes[normalized.purpose] || normalized.purpose)}</dd></div>
                <div><dt>Status</dt><dd><span class="property-status-indicator ${statusClass} inline"><span class="status-dot" aria-hidden="true"></span><span class="status-text">${escapeHtml(statusLabel)}</span></span></dd></div>
                <div><dt>Guide Price</dt><dd>${escapeHtml(normalized.priceLabel)}</dd></div>
            </dl>
            <section class="detail-features" aria-labelledby="detail-features-title">
                <h2 id="detail-features-title">Key Features</h2>
                <ul>${normalized.features.map((feature) => `<li>${escapeHtml(feature)}</li>`).join('')}</ul>
            </section>
            <div class="detail-actions">
                <a class="btn detail-primary" href="https://wa.me/2349017017156?text=${encodeURIComponent('Hello OTI-TECH, I would like to discuss the ' + normalized.title.toLowerCase() + ' listing.')}" target="_blank" rel="noopener noreferrer">Enquire About This Property <span aria-hidden="true">→</span></a>
                <a class="btn detail-secondary" href="properties.html">Back to Properties</a>
            </div>
        </div>
    `;
};
