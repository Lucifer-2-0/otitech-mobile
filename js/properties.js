import { propertyCardMarkup, propertyDetailMarkup, propertyPurposes, propertyTypes, propertyStatuses, sampleProperties, normalizeProperty } from '../components/property-card.js';
import { propertiesApi } from './api.js';
import { initImageGallery } from '../components/image-gallery.js';

const searchParams = new URLSearchParams(window.location.search);

const localProperties = sampleProperties.map(normalizeProperty);

const filterLocalProperties = (properties, params) => {
    const { type, purpose, status, location, minPrice, maxPrice } = params;
    return properties.filter((property) => {
        if (type && property.type !== type) return false;
        if (purpose && property.purpose !== purpose) return false;
        if (status && property.status !== status) return false;
        if (location && !property.location.toLowerCase().includes(location.toLowerCase())) return false;
        if (minPrice !== null && property.price && parseFloat(property.price) < minPrice) return false;
        if (maxPrice !== null && property.price && parseFloat(property.price) > maxPrice) return false;
        return true;
    });
};

const initialisePropertiesPage = () => {
    const filterForm = document.querySelector('#properties-filter');
    const grid = document.querySelector('#properties-grid');
    const status = document.querySelector('#properties-status');
    const resultsCount = document.querySelector('#properties-count');

    if (!filterForm || !grid || !status) {
        return;
    }

    const typeField = filterForm.elements.type;
    const purposeField = filterForm.elements.purpose;
    const statusField = filterForm.elements.status;
    const locationField = filterForm.elements.location;
    const minPriceField = filterForm.elements.min_price;
    const maxPriceField = filterForm.elements.max_price;

    typeField.value = searchParams.get('type') || '';
    purposeField.value = searchParams.get('purpose') || '';
    statusField.value = searchParams.get('status') || '';
    locationField.value = searchParams.get('location') || '';
    minPriceField.value = searchParams.get('min_price') || '';
    maxPriceField.value = searchParams.get('max_price') || '';

    const parsePrice = (str) => {
        if (!str) return null;
        const num = parseFloat(str.replace(/[^0-9.]/g, ''));
        return isNaN(num) ? null : num;
    };

    const render = async () => {
        const selectedType = typeField.value;
        const selectedPurpose = purposeField.value;
        const selectedStatus = statusField.value;
        const selectedLocation = locationField.value.trim();
        const minPrice = parsePrice(minPriceField.value);
        const maxPrice = parsePrice(maxPriceField.value);

        const params = {};
        if (selectedType) params.type = selectedType;
        if (selectedPurpose) params.purpose = selectedPurpose;
        if (selectedStatus) params.status = selectedStatus;
        if (selectedLocation) params.location = selectedLocation;
        if (minPrice !== null) params.minPrice = minPrice;
        if (maxPrice !== null) params.maxPrice = maxPrice;

        grid.innerHTML = '<p class="loading-state">Loading properties...</p>';

        try {
            const response = await propertiesApi.list(params);
            const { data: properties, pagination } = response;

            grid.innerHTML = properties.length
                ? properties.map(propertyCardMarkup).join('')
                : '<p class="empty-state">No properties match those filters. Clear a filter or contact OTI-TECH with your requirements.</p>';

            if (resultsCount) {
                resultsCount.textContent = `${pagination.total} ${pagination.total === 1 ? 'property' : 'properties'} found`;
            }
            status.textContent = `Showing ${properties.length} of ${pagination.total} ${pagination.total === 1 ? 'listing' : 'listings'}.`;

            const updatedParams = new URLSearchParams();
            if (selectedType) updatedParams.set('type', selectedType);
            if (selectedPurpose) updatedParams.set('purpose', selectedPurpose);
            if (selectedStatus) updatedParams.set('status', selectedStatus);
            if (selectedLocation) updatedParams.set('location', selectedLocation);
            if (minPriceField.value.trim()) updatedParams.set('min_price', minPriceField.value.trim());
            if (maxPriceField.value.trim()) updatedParams.set('max_price', maxPriceField.value.trim());
            const query = updatedParams.toString();
            window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
        } catch (err) {
            console.warn('API unavailable, falling back to local data:', err.message);

            const filtered = filterLocalProperties(localProperties, params);
            const total = localProperties.length;

            grid.innerHTML = filtered.length
                ? filtered.map(propertyCardMarkup).join('')
                : '<p class="empty-state">No sample listings match those filters. Clear a filter or contact OTI-TECH with your requirements.</p>';

            if (resultsCount) {
                resultsCount.textContent = `${total} ${total === 1 ? 'property' : 'properties'} found`;
            }
            status.textContent = `Showing ${filtered.length} illustrative sample ${filtered.length === 1 ? 'listing' : 'listings'} (offline mode).`;
        }
    };

    filterForm.addEventListener('submit', (event) => {
        event.preventDefault();
        render();
    });

    filterForm.addEventListener('reset', () => {
        window.setTimeout(render, 0);
    });

    render();
};

const initialisePropertyDetailsPage = async () => {
    const detail = document.querySelector('#property-detail');

    if (!detail) {
        return;
    }

    const slug = searchParams.get('slug');

    detail.innerHTML = '<p class="loading-state">Loading property details...</p>';

    try {
        const response = await propertiesApi.get(slug);
        const property = response.data;

        document.title = `${property.title} | OTI-TECH`;
        detail.innerHTML = propertyDetailMarkup(property);
        initImageGallery(detail);
    } catch (err) {
        console.warn('API unavailable, falling back to local data:', err.message);

        const property = localProperties.find(p => p.slug === slug) || localProperties[0];

        document.title = `${property.title} | OTI-TECH`;
        detail.innerHTML = propertyDetailMarkup(property);
        initImageGallery(detail);
    }
};

initialisePropertiesPage();
initialisePropertyDetailsPage();
