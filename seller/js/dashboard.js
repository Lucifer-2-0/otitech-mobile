import { authApi, mediaApi, propertiesApi } from '../../js/api.js';
import { getPublicUrl, uploadAsset } from '../../js/supabase.js';

const ACCESS_TOKEN_KEY = 'otitech_access_token';
const REFRESH_TOKEN_KEY = 'otitech_refresh_token';
const form = document.querySelector('#sellerPropertyForm');
const formTitle = document.querySelector('#listing-form-title');
const formStatus = document.querySelector('#sellerPropertyStatus');
const listingsStatus = document.querySelector('#sellerListingsStatus');
const listingsContainer = document.querySelector('#sellerListings');
const cancelEdit = document.querySelector('#cancelListingEdit');
let currentUser;
let mediaProvider;

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));
const pretty = (value = '') => String(value).replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const statusLabel = (property) => {
    if (property.reviewStatus === 'approved' && property.isPublished) return 'Approved and published';
    if (property.reviewStatus === 'rejected') return 'Rejected';
    if (property.reviewStatus === 'pending') return 'Pending review';
    return 'Not submitted';
};
const formatDate = (value) => value
    ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value))
    : '—';

const setFormMode = (property = null) => {
    form.elements.propertyId.value = property?.id || '';
    formTitle.textContent = property ? 'Edit and resubmit listing' : 'Add a property';
    form.querySelector('[type="submit"]').textContent = property ? 'Submit changes for review' : 'Submit for review';
    cancelEdit.hidden = !property;
    if (!property) {
        form.reset();
        form.elements.propertyId.value = '';
        return;
    }
    for (const field of ['title', 'type', 'purpose', 'location', 'size', 'price', 'priceLabel', 'description']) {
        form.elements[field].value = property[field] ?? '';
    }
    form.elements.features.value = (property.features || []).join('\n');
    form.elements.images.value = '';
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const renderListing = (property) => {
    const status = property.reviewStatus || (property.isPublished ? 'approved' : 'not_submitted');
    const canEditListing = ['pending', 'rejected'].includes(status);
    const publicLink = status === 'approved' && property.isPublished
        ? '<a class="btn btn-secondary" href="../pages/property-details.html?slug=' + encodeURIComponent(property.slug) + '" target="_blank" rel="noopener noreferrer">View published listing</a>'
        : '';
    const editButton = canEditListing
        ? '<button class="btn btn-secondary" type="button" data-edit-listing="' + Number(property.id) + '">Edit and resubmit</button>'
        : '';
    const imageCount = Array.isArray(property.images) ? property.images.length : 0;
    return '<article class="seller-listing-card">' +
        '<div class="seller-listing-top"><span class="seller-listing-status seller-listing-status--' + escapeHtml(status) + '">' + escapeHtml(statusLabel(property)) + '</span><span class="seller-muted">' + escapeHtml(formatDate(property.createdAt || property.created_at)) + '</span></div>' +
        '<h3>' + escapeHtml(property.title) + '</h3>' +
        '<p>' + escapeHtml(pretty(property.type)) + ' · ' + escapeHtml(pretty(property.purpose)) + ' · ' + escapeHtml(property.location) + '</p>' +
        '<p>' + escapeHtml(property.priceLabel || (property.price ? new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(property.price)) : 'Price on request')) + ' · ' + imageCount + ' photo' + (imageCount === 1 ? '' : 's') + '</p>' +
        (status === 'rejected' ? '<p>You can edit this listing and submit it again for review.</p>' : '') +
        editButton + publicLink +
        '</article>';
};

const loadListings = async () => {
    listingsStatus.textContent = 'Loading your listings…';
    try {
        const response = await propertiesApi.mine();
        const properties = response.data || [];
        listingsContainer.innerHTML = properties.length
            ? properties.map(renderListing).join('')
            : '<p class="seller-empty">You have not submitted any properties yet.</p>';
        listingsStatus.textContent = properties.length ? properties.length + ' listing' + (properties.length === 1 ? '' : 's') : '';
        listingsContainer.querySelectorAll('[data-edit-listing]').forEach((button) => {
            button.addEventListener('click', () => {
                const property = properties.find((item) => String(item.id) === button.dataset.editListing);
                if (property) setFormMode(property);
            });
        });
    } catch (error) {
        listingsStatus.textContent = error.message;
    }
};

const getMediaProvider = async () => {
    if (mediaProvider) return mediaProvider;
    const response = await mediaApi.storageStatus();
    mediaProvider = response.data?.provider || 'local';
    return mediaProvider;
};

const uploadPhoto = async (propertyId, file, title) => {
    const provider = await getMediaProvider();
    const safeName = file.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-120) || 'photo';
    const uniqueId = globalThis.crypto?.randomUUID?.() || Date.now() + '-' + Math.random().toString(36).slice(2);
    const path = 'properties/' + propertyId + '/' + uniqueId + '-' + safeName;
    let url;
    if (provider === 'supabase') {
        const { error } = await uploadAsset(file, 'otitech-assets', path);
        if (error) throw error;
        url = getPublicUrl('otitech-assets', path);
    } else if (provider === 's3') {
        const response = await mediaApi.presignedUpload({ prefix: 'properties', fileName: file.name, contentType: file.type });
        const upload = response.data;
        const result = await fetch(upload.uploadUrl, {
            method: upload.method || 'PUT',
            headers: upload.headers || { 'Content-Type': file.type },
            body: file,
        });
        if (!result.ok) throw new Error('Photo upload failed. Check the storage bucket CORS settings.');
        url = upload.publicUrl;
    } else {
        throw new Error('Property photo storage is not configured. Set STORAGE_PROVIDER to supabase or s3.');
    }
    await mediaApi.addPropertyImage(propertyId, {
        url,
        altText: 'Property photo: ' + title,
    });
};

const uploadSelectedPhotos = async (propertyId, title) => {
    const files = Array.from(form.elements.images.files || []).filter((file) => file.size > 0);
    if (files.length > 6) throw new Error('Choose no more than 6 photos.');
    for (const file of files) {
        if (file.size > 5 * 1024 * 1024) throw new Error('Each photo must be 5 MB or smaller.');
        if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) {
            throw new Error('Choose JPG, PNG, WebP, or AVIF photos.');
        }
    }
    for (const file of files) await uploadPhoto(propertyId, file, title);
};

form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const save = form.querySelector('[type="submit"]');
    save.disabled = true;
    formStatus.textContent = 'Saving your listing…';
    try {
        const data = new FormData(form);
        const payload = {
            title: data.get('title').toString().trim(),
            type: data.get('type'),
            purpose: data.get('purpose'),
            location: data.get('location').toString().trim(),
            size: data.get('size').toString().trim() || undefined,
            price: data.get('price') ? Number(data.get('price')) : undefined,
            priceLabel: data.get('priceLabel').toString().trim() || undefined,
            description: data.get('description').toString().trim() || undefined,
            features: data.get('features').toString().split(/\r?\n/).map((value) => value.trim()).filter(Boolean),
        };
        const editingId = data.get('propertyId').toString();
        const response = editingId
            ? await propertiesApi.updateSeller(editingId, payload)
            : await propertiesApi.createSeller(payload);
        const property = response.data;
        let photoIssue = '';
        try {
            await uploadSelectedPhotos(property.id, property.title);
        } catch (error) {
            photoIssue = ' Listing saved, but photos were not uploaded: ' + error.message;
        }
        formStatus.textContent = (response.message || 'Listing submitted for admin review.') + photoIssue;
        setFormMode();
        await loadListings();
    } catch (error) {
        formStatus.textContent = error.message;
    } finally {
        save.disabled = false;
    }
});

cancelEdit.addEventListener('click', () => {
    setFormMode();
    formStatus.textContent = '';
});
document.querySelector('#refreshListings').addEventListener('click', loadListings);
document.querySelector('#sellerLogout').addEventListener('click', () => {
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    window.location.replace('index.html');
});
window.addEventListener('otitech:session-expired', () => window.location.replace('index.html'));

const start = async () => {
    if (!sessionStorage.getItem(ACCESS_TOKEN_KEY)) return window.location.replace('index.html');
    try {
        const response = await authApi.me();
        if (response.data.role !== 'seller') {
            sessionStorage.removeItem(ACCESS_TOKEN_KEY);
            sessionStorage.removeItem(REFRESH_TOKEN_KEY);
            return window.location.replace('../admin/index.html');
        }
        currentUser = response.data;
        document.querySelector('#sellerName').textContent = currentUser.fullName || 'Seller';
        document.querySelector('#sellerEmail').textContent = currentUser.email || '';
        await loadListings();
    } catch {
        sessionStorage.removeItem(ACCESS_TOKEN_KEY);
        sessionStorage.removeItem(REFRESH_TOKEN_KEY);
        window.location.replace('index.html');
    }
};

start();
