import {
    adminApi,
    authApi,
    enquiriesApi,
    mediaApi,
    propertiesApi,
    projectsApi,
    settingsApi,
} from '../../js/api.js';
import { supabase, getCurrentUser, signOut as supabaseSignOut, getSession, uploadAsset, getPublicUrl } from '../../js/supabase.js';

const Papa = window.Papa;
const ACCESS_TOKEN_KEY = 'otitech_access_token';
const REFRESH_TOKEN_KEY = 'otitech_refresh_token';
const title = document.querySelector('#adminPageTitle');
const titles = {
    dashboard: 'Dashboard',
    properties: 'Properties',
    projects: 'Projects',
    enquiries: 'Enquiries',
    settings: 'Site Settings',
    users: 'User Management',
};
const canEdit = () => ['admin', 'staff'].includes(currentUser?.role);
const isAdmin = () => currentUser?.role === 'admin';
let currentUser;

const getMain = () => document.querySelector('#main-content');

const escapeHtml = (value = '') => String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));

const isPublished = (record) => Boolean(record.isPublished ?? record.is_published);
const recordStatus = (record) => record.status || 'unknown';
const pretty = (value = '') => String(value).replaceAll('_', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
const formatDate = (value) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value)) : '—';
const formatMoney = (value, label) => label || (value === null || value === undefined || value === ''
    ? 'Price on request'
    : new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(Number(value)));
const unwrap = (response) => response?.data;

const showToast = (message, tone = 'success') => {
    let toast = document.querySelector('#adminToast');
    if (!toast) {
        toast = document.createElement('div');
        toast.id = 'adminToast';
        toast.className = 'admin-toast';
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');
        document.body.append(toast);
    }
    toast.dataset.tone = tone;
    toast.textContent = message;
    toast.classList.add('is-visible');
    window.clearTimeout(showToast.timeout);
    showToast.timeout = window.setTimeout(() => toast.classList.remove('is-visible'), 3600);
};

const confirmAction = (message, confirmLabel = 'Delete') => new Promise((resolve) => {
    const dialog = document.createElement('dialog');
    dialog.className = 'admin-dialog admin-confirm-dialog';
    dialog.setAttribute('aria-labelledby', 'adminConfirmTitle');
    dialog.innerHTML = `
        <div class="admin-dialog-heading"><div><p class="admin-eyebrow">CONFIRM ACTION</p><h2 id="adminConfirmTitle">Are you sure?</h2></div></div>
        <p>${escapeHtml(message)}</p>
        <div class="admin-dialog-actions"><button class="btn btn-secondary" type="button" data-confirm-cancel>Cancel</button><button class="btn btn-danger" type="button" data-confirm-action>${escapeHtml(confirmLabel)}</button></div>`;

    let settled = false;
    const finish = (confirmed) => {
        if (settled) return;
        settled = true;
        if (dialog.open) dialog.close();
        dialog.remove();
        resolve(confirmed);
    };

    dialog.querySelector('[data-confirm-cancel]').addEventListener('click', () => finish(false));
    dialog.querySelector('[data-confirm-action]').addEventListener('click', () => finish(true));
    dialog.addEventListener('cancel', (event) => {
        event.preventDefault();
        finish(false);
    });
    dialog.addEventListener('click', (event) => {
        if (event.target === dialog) finish(false);
    });
    document.body.append(dialog);
    dialog.showModal();
    dialog.querySelector('[data-confirm-cancel]').focus();
});

const showPageError = (error) => {
    const mainEl = getMain();
    if (!mainEl) return;
    mainEl.innerHTML = `<section class="admin-empty-state" role="alert"><h2>Could not load this page</h2><p>${escapeHtml(error.message || 'An unexpected error occurred.')}</p><button class="btn btn-primary" type="button" data-action="retry">Try again</button></section>`;
    mainEl.querySelector('[data-action="retry"]')?.addEventListener('click', renderView);
};

const bindSidebar = () => {
    const sidebar = document.querySelector('#adminSidebar');
    const overlay = document.querySelector('#adminOverlay');
    const menuButton = document.querySelector('.admin-mobile-menu-btn');
    const collapseButton = document.querySelector('.admin-sidebar-toggle');

    const closeMobile = () => {
        sidebar.classList.remove('is-open');
        overlay.classList.remove('is-visible');
        menuButton.setAttribute('aria-expanded', 'false');
        overlay.setAttribute('aria-hidden', 'true');
    };

    menuButton.addEventListener('click', () => {
        const open = sidebar.classList.toggle('is-open');
        overlay.classList.toggle('is-visible', open);
        menuButton.setAttribute('aria-expanded', String(open));
        overlay.setAttribute('aria-hidden', String(!open));
    });
    overlay.addEventListener('click', closeMobile);
    collapseButton.addEventListener('click', () => {
        const collapsed = sidebar.classList.toggle('is-collapsed');
        collapseButton.setAttribute('aria-expanded', String(!collapsed));
        collapseButton.setAttribute('aria-label', collapsed ? 'Expand sidebar' : 'Collapse sidebar');
    });
    document.querySelector('#logoutBtn').addEventListener('click', logout);

    document.querySelectorAll('.admin-nav-link[data-section]').forEach((link) => {
        link.addEventListener('click', closeMobile);
    });
};

const logout = async () => {
    await supabaseSignOut();
    sessionStorage.removeItem(ACCESS_TOKEN_KEY);
    sessionStorage.removeItem(REFRESH_TOKEN_KEY);
    window.location.replace('index.html');
};

const setCurrentUser = (user) => {
    currentUser = user;
    const name = user.fullName || user.email || 'Team member';
    const initials = name.split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
    document.querySelector('#adminUserName').textContent = name;
    document.querySelector('#adminUserRole').textContent = pretty(user.role);
    document.querySelector('#adminUserAvatar').textContent = initials || 'OT';
    document.querySelectorAll('[data-section="settings"]').forEach((link) => {
        link.hidden = !isAdmin();
    });
};

const updateActiveNav = (view) => {
    document.querySelectorAll('.admin-nav-link[data-section]').forEach((link) => {
        if (link.dataset.section === view) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
    });
    title.textContent = titles[view] || titles.dashboard;
};

const loadNavigationCounts = async () => {
    try {
        const { data } = await adminApi.summary();
        document.querySelector('#propertiesCount').textContent = String(data.properties.total);
        document.querySelector('#projectsCount').textContent = String(data.projects.total);
        document.querySelector('#enquiriesCount').textContent = String(data.enquiries.new);
        document.querySelector('#usersCount').textContent = String(data.users?.total || 0);
    } catch { /* The active page will show the API error if the service is unavailable. */ }
};

const renderView = async () => {
    const mainEl = getMain();
    if (!mainEl) return;
    const view = window.location.hash.slice(1) || 'dashboard';
    const selectedView = titles[view] ? view : 'dashboard';
    if (view !== selectedView) history.replaceState(null, '', '#dashboard');
    updateActiveNav(selectedView);

    try {
        mainEl.setAttribute('aria-busy', 'true');
        if (selectedView === 'dashboard') await renderDashboard();
        if (selectedView === 'properties') await renderProperties();
        if (selectedView === 'projects') await renderProjects();
        if (selectedView === 'enquiries') await renderEnquiries();
        if (selectedView === 'settings') await renderSettings();
        if (selectedView === 'users') await renderUsers();
    } catch (error) {
        if (error.status === 401) return logout();
        showPageError(error);
    } finally {
        mainEl.removeAttribute('aria-busy');
    }
};

const recentEnquiryRows = (items) => items.length ? items.map((item) => `
    <tr>
        <td><strong>${escapeHtml(item.name)}</strong><span class="admin-table-secondary">${escapeHtml(item.email || item.phone)}</span></td>
        <td>${escapeHtml(pretty(item.service))}</td>
        <td><span class="admin-status admin-status--${escapeHtml(item.status)}">${escapeHtml(pretty(item.status))}</span></td>
        <td>${escapeHtml(formatDate(item.createdAt || item.created_at))}</td>
    </tr>`).join('') : '<tr><td colspan="4" class="admin-table-empty">No enquiries have arrived yet.</td></tr>';

const renderDashboard = async () => {
    const mainEl = getMain();
    if (!mainEl) return;
    const [summaryResponse, enquiriesResponse] = await Promise.all([
        adminApi.summary(),
        enquiriesApi.list({ limit: 5 }),
    ]);
    const summary = summaryResponse.data;
    const recent = enquiriesResponse.data || [];
    const greeting = currentUser.fullName?.split(' ')[0] || 'there';

    mainEl.innerHTML = `
        <section class="admin-welcome"><div><p class="admin-eyebrow">OTI-TECH OVERVIEW</p><h2>Welcome back, ${escapeHtml(greeting)}</h2><p>Here is the latest activity across your property and project pages.</p></div><a class="btn btn-secondary" href="../index.html" target="_blank" rel="noopener noreferrer">Open public site <span aria-hidden="true">↗</span></a></section>
        <section class="admin-stat-grid" aria-label="Site totals">
            <a class="admin-stat-card" href="#properties"><span class="admin-stat-label">Properties</span><strong>${summary.properties.total}</strong><span>${summary.properties.published} published</span></a>
            <a class="admin-stat-card" href="#projects"><span class="admin-stat-label">Projects</span><strong>${summary.projects.total}</strong><span>${summary.projects.published} published</span></a>
            <a class="admin-stat-card" href="#enquiries"><span class="admin-stat-label">Enquiries</span><strong>${summary.enquiries.total}</strong><span>${summary.enquiries.new} new · ${summary.enquiries.inProgress} in progress</span></a>
        </section>
        <section class="admin-panel"><div class="admin-panel-heading"><div><p class="admin-eyebrow">INBOX</p><h2>Recent enquiries</h2></div><a href="#enquiries" class="admin-text-link">View all <span aria-hidden="true">→</span></a></div><div class="admin-table-wrap"><table class="admin-table"><thead><tr><th scope="col">Contact</th><th scope="col">Service</th><th scope="col">Status</th><th scope="col">Received</th></tr></thead><tbody>${recentEnquiryRows(recent)}</tbody></table></div></section>`;
};

const propertyCard = (property) => `
    <article class="admin-record-card">
        <div class="admin-record-top"><span class="admin-status admin-status--${escapeHtml(recordStatus(property))}">${escapeHtml(pretty(recordStatus(property)))}</span><span class="admin-publish-state ${isPublished(property) ? 'is-published' : ''}">${isPublished(property) ? 'Published' : 'Draft'}</span></div>
        <h3>${escapeHtml(property.title)}</h3><p class="admin-record-meta">${escapeHtml(pretty(property.type))} · ${escapeHtml(pretty(property.purpose))} · ${escapeHtml(property.location)}</p>
        <p class="admin-record-price">${escapeHtml(formatMoney(property.price, property.priceLabel))}</p>
        <div class="admin-record-actions">${canEdit() ? `<button class="btn btn-secondary" type="button" data-action="edit-property" data-id="${property.id}">Edit</button><button class="btn btn-secondary" type="button" data-action="images-property" data-id="${property.id}">Images</button>` : ''}${isAdmin() ? `<button class="btn btn-danger" type="button" data-action="delete-property" data-id="${property.id}">Delete</button>` : ''}</div>
    </article>`;

const projectCard = (project) => `
    <article class="admin-record-card">
        <div class="admin-record-top"><span class="admin-status admin-status--${escapeHtml(recordStatus(project))}">${escapeHtml(pretty(recordStatus(project)))}</span><span class="admin-publish-state ${isPublished(project) ? 'is-published' : ''}">${isPublished(project) ? 'Published' : 'Draft'}</span></div>
        <h3>${escapeHtml(project.title)}</h3><p class="admin-record-meta">${escapeHtml(pretty(project.category))} · ${escapeHtml(project.location)}${project.year ? ` · ${escapeHtml(project.year)}` : ''}</p>
        <p class="admin-record-price">${escapeHtml(formatMoney(project.value))}</p>
        <div class="admin-record-actions">${canEdit() ? `<button class="btn btn-secondary" type="button" data-action="edit-project" data-id="${project.id}">Edit</button><button class="btn btn-secondary" type="button" data-action="images-project" data-id="${project.id}">Images</button>` : ''}${isAdmin() ? `<button class="btn btn-danger" type="button" data-action="delete-project" data-id="${project.id}">Delete</button>` : ''}</div>
    </article>`;

const renderProperties = async (location = '') => {
    const mainEl = getMain();
    if (!mainEl) return;
    const response = await adminApi.properties({ limit: 50, location });
    const items = response.data || [];
    mainEl.innerHTML = `
        <section class="admin-page-toolbar"><div><p class="admin-eyebrow">INVENTORY</p><h2>Manage properties</h2><p>${response.pagination?.total ?? items.length} records, including unpublished drafts.</p></div><div class="admin-toolbar-actions">${canEdit() ? '<button class="btn btn-primary" type="button" data-action="new-property">Add property <span aria-hidden="true">+</span></button>' : ''}${isAdmin() ? '<button class="btn btn-secondary" type="button" data-action="import-properties">Import CSV</button>' : ''}</div></section>
        <form class="admin-filter-form" id="propertySearch"><label for="propertyLocation">Search by location</label><input id="propertyLocation" name="location" type="search" value="${escapeHtml(location)}" placeholder="e.g. Lekki, Lagos"><button class="btn btn-secondary" type="submit">Search</button>${location ? '<a class="admin-text-link" href="#properties">Clear</a>' : ''}</form>
        ${items.length ? `<section class="admin-record-grid" aria-label="Properties">${items.map(propertyCard).join('')}</section>` : '<section class="admin-empty-state"><h3>No properties found</h3><p>Add a property or change the location filter.</p></section>'}`;

    document.querySelector('#propertySearch').addEventListener('submit', (event) => {
        event.preventDefault();
        renderProperties(new FormData(event.currentTarget).get('location').toString().trim());
    });
    bindRecordActions('property', items);
};

const renderProjects = async (location = '') => {
    const mainEl = getMain();
    if (!mainEl) return;
    const response = await adminApi.projects({ limit: 50, location });
    const items = response.data || [];
    mainEl.innerHTML = `
        <section class="admin-page-toolbar"><div><p class="admin-eyebrow">PORTFOLIO</p><h2>Manage projects</h2><p>${response.pagination?.total ?? items.length} records, including unpublished drafts.</p></div><div class="admin-toolbar-actions">${canEdit() ? '<button class="btn btn-primary" type="button" data-action="new-project">Add project <span aria-hidden="true">+</span></button>' : ''}${isAdmin() ? '<button class="btn btn-secondary" type="button" data-action="import-projects">Import CSV</button>' : ''}</div></section>
        <form class="admin-filter-form" id="projectSearch"><label for="projectLocation">Search by location</label><input id="projectLocation" name="location" type="search" value="${escapeHtml(location)}" placeholder="e.g. Ikeja, Lagos"><button class="btn btn-secondary" type="submit">Search</button>${location ? '<a class="admin-text-link" href="#projects">Clear</a>' : ''}</form>
        ${items.length ? `<section class="admin-record-grid" aria-label="Projects">${items.map(projectCard).join('')}</section>` : '<section class="admin-empty-state"><h3>No projects found</h3><p>Add a project or change the location filter.</p></section>'}`;

    document.querySelector('#projectSearch').addEventListener('submit', (event) => {
        event.preventDefault();
        renderProjects(new FormData(event.currentTarget).get('location').toString().trim());
    });
    bindRecordActions('project', items);
};

const bindRecordActions = (kind, items) => {
    const singular = kind;
    const records = items;
    const mainEl = getMain();
    if (!mainEl) return;
    mainEl.querySelectorAll('[data-action]').forEach((button) => {
        button.addEventListener('click', async () => {
            const { action, id } = button.dataset;
            const record = records.find((item) => String(item.id) === id);
            try {
                if (action === `new-${singular}`) openRecordEditor(kind);
                if (action === `edit-${singular}` && record) openRecordEditor(kind, record);
                if (action === `images-${singular}` && record) openImageManager(kind, record);
                if (action === `delete-${singular}` && record && await confirmAction(`Delete “${record.title}”? This cannot be undone.`)) {
                    const api = kind === 'property' ? propertiesApi : projectsApi;
                    await api.delete(record.id);
                    showToast(`${pretty(kind)} deleted.`);
                    renderView();
                }
            } catch (error) {
                showToast(error.message, 'error');
            }
        });
    });
    mainEl.querySelector('[data-action="import-properties"]')?.addEventListener('click', () => openCsvImportDialog('properties'));
    mainEl.querySelector('[data-action="import-projects"]')?.addEventListener('click', () => openCsvImportDialog('projects'));
};

const options = (choices, selected) => choices.map(([value, label]) => `<option value="${escapeHtml(value)}" ${value === selected ? 'selected' : ''}>${escapeHtml(label)}</option>`).join('');
const formField = (label, name, value = '', type = 'text', required = false) => `
    <label class="admin-field"><span>${escapeHtml(label)}${required ? ' <b aria-hidden="true">*</b>' : ''}</span><input name="${name}" type="${type}" value="${escapeHtml(value)}" ${required ? 'required' : ''}></label>`;
const textAreaField = (label, name, value = '', hint = '') => `
    <label class="admin-field admin-field--wide"><span>${escapeHtml(label)}</span><textarea name="${name}" rows="4" ${hint ? `aria-describedby="${name}Hint"` : ''}>${escapeHtml(value)}</textarea>${hint ? `<small id="${name}Hint">${escapeHtml(hint)}</small>` : ''}</label>`;
const selectField = (label, name, choices, selected) => `
    <label class="admin-field"><span>${escapeHtml(label)}</span><select name="${name}">${options(choices, selected)}</select></label>`;

const editorShell = (heading, formMarkup, record) => {
    const dialog = document.createElement('dialog');
    dialog.className = 'admin-dialog';
    dialog.setAttribute('aria-labelledby', 'adminDialogTitle');
    dialog.innerHTML = `
        <div class="admin-dialog-heading"><div><p class="admin-eyebrow">CONTENT MANAGER</p><h2 id="adminDialogTitle">${escapeHtml(heading)}</h2></div><button class="admin-icon-button" type="button" data-close-dialog aria-label="Close">×</button></div>
        <p class="admin-form-error" id="recordFormError" role="alert" hidden></p>
        <form id="recordForm" class="admin-record-form"><div class="admin-form-grid">${formMarkup}</div><label class="admin-checkbox"><input type="checkbox" name="isPublished" ${isPublished(record || {}) ? 'checked' : ''}><span>Publish on the public website</span></label><div class="admin-dialog-actions"><button class="btn btn-secondary" type="button" data-close-dialog>Cancel</button><button class="btn btn-primary" type="submit">Save changes</button></div></form>
        ${record?.id ? '<section class="admin-dialog-media" id="editorImageManager"></section>' : ''}`;
    document.body.append(dialog);
    dialog.showModal();
    dialog.addEventListener('close', () => dialog.remove(), { once: true });
    dialog.querySelectorAll('[data-close-dialog]').forEach((button) => button.addEventListener('click', () => dialog.close()));
    return dialog;
};

const openRecordEditor = (kind, record = null) => {
    const editing = Boolean(record?.id);
    let fields;
    if (kind === 'property') {
        fields = `${formField('Title', 'title', record?.title || '', 'text', true)}${formField('URL slug', 'slug', record?.slug || '', 'text', !editing)}
            ${selectField('Property type', 'type', [['land', 'Land'], ['house', 'House'], ['apartment', 'Apartment'], ['commercial', 'Commercial']], record?.type || 'house')}
            ${selectField('Purpose', 'purpose', [['sale', 'For sale'], ['rent', 'For rent']], record?.purpose || 'sale')}
            ${selectField('Availability', 'status', [['available', 'Available'], ['under_offer', 'Under offer'], ['sold', 'Sold'], ['let', 'Let']], record?.status || 'available')}
            ${formField('Location', 'location', record?.location || '', 'text', true)}${formField('Size', 'size', record?.size || '')}
            ${formField('Price (NGN)', 'price', record?.price || '', 'number')}${formField('Display price label', 'priceLabel', record?.priceLabel || '')}
            ${textAreaField('Description', 'description', record?.description || '')}${textAreaField('Features', 'features', (record?.features || []).join('\n'), 'One feature per line.')}`;
    } else {
        fields = `${formField('Title', 'title', record?.title || '', 'text', true)}${formField('URL slug', 'slug', record?.slug || '', 'text', !editing)}
            ${selectField('Category', 'category', [['residential', 'Residential'], ['commercial', 'Commercial'], ['mixed_use', 'Mixed use'], ['renovation', 'Renovation']], record?.category || 'residential')}
            ${selectField('Status', 'status', [['planning', 'Planning'], ['ongoing', 'Ongoing'], ['completed', 'Completed']], record?.status || 'planning')}
            ${formField('Location', 'location', record?.location || '', 'text', true)}${formField('Year', 'year', record?.year || '')}
            ${formField('Size', 'size', record?.size || '')}${formField('Project value (NGN)', 'value', record?.value || '', 'number')}
            ${textAreaField('Description', 'description', record?.description || '')}${textAreaField('Highlights', 'highlights', (record?.highlights || []).join('\n'), 'One highlight per line.')}
            ${textAreaField('Services', 'services', (record?.services || []).join('\n'), 'Use: building_design, construction, real_estate or project_support; one per line.')}`;
    }

    const dialog = editorShell(`${editing ? 'Edit' : 'Add'} ${kind}`, fields, record);
    const slugInput = dialog.querySelector('[name="slug"]');
    if (!editing) {
        dialog.querySelector('[name="title"]').addEventListener('input', (event) => {
            slugInput.value = event.currentTarget.value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
        });
    }
    if (editing) loadImageManager(dialog.querySelector('#editorImageManager'), kind, record.id);

    dialog.querySelector('#recordForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        if (!form.reportValidity()) return;
        const data = new FormData(form);
        const payload = kind === 'property'
            ? {
                slug: data.get('slug').toString().trim(), title: data.get('title').toString().trim(), type: data.get('type'),
                purpose: data.get('purpose'), status: data.get('status'), location: data.get('location').toString().trim(),
                size: data.get('size').toString().trim(), price: data.get('price') ? Number(data.get('price')) : undefined,
                priceLabel: data.get('priceLabel').toString().trim(), description: data.get('description').toString().trim(),
                features: data.get('features').toString().split(/\r?\n/).map((value) => value.trim()).filter(Boolean),
                isPublished: data.get('isPublished') === 'on',
            }
            : {
                slug: data.get('slug').toString().trim(), title: data.get('title').toString().trim(), category: data.get('category'),
                status: data.get('status'), location: data.get('location').toString().trim(), year: data.get('year').toString().trim(),
                size: data.get('size').toString().trim(), value: data.get('value') ? Number(data.get('value')) : undefined,
                description: data.get('description').toString().trim(),
                highlights: data.get('highlights').toString().split(/\r?\n/).map((value) => value.trim()).filter(Boolean),
                services: data.get('services').toString().split(/\r?\n/).map((value) => value.trim()).filter(Boolean),
                isPublished: data.get('isPublished') === 'on',
            };

        const save = form.querySelector('[type="submit"]');
        const error = dialog.querySelector('#recordFormError');
        error.hidden = true;
        save.disabled = true;
        try {
            const api = kind === 'property' ? propertiesApi : projectsApi;
            const response = editing ? await api.update(record.id, payload) : await api.create(payload);
            const saved = response.data;
            showToast(`${pretty(kind)} ${editing ? 'updated' : 'created'}.`);
            dialog.close();
            await renderView();
            if (!editing && saved) openRecordEditor(kind, saved);
        } catch (saveError) {
            error.textContent = saveError.message;
            error.hidden = false;
        } finally {
            save.disabled = false;
        }
    });
};

const imageApiFor = (kind) => kind === 'property'
    ? { list: mediaApi.propertyImages, add: mediaApi.addPropertyImage, update: mediaApi.updatePropertyImage, delete: mediaApi.deletePropertyImage }
    : { list: mediaApi.projectImages, add: mediaApi.addProjectImage, update: mediaApi.updateProjectImage, delete: mediaApi.deleteProjectImage };

let mediaStorageProvider;
const getMediaStorageProvider = async () => {
    if (mediaStorageProvider) return mediaStorageProvider;
    const response = await mediaApi.storageStatus();
    mediaStorageProvider = response.data?.provider || 'local';
    return mediaStorageProvider;
};

const uploadImageFile = async (kind, id, file) => {
    const provider = await getMediaStorageProvider();
    const prefix = kind === 'property' ? 'properties' : 'projects';
    const safeName = file.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]+/g, '-').slice(-120) || 'image';
    const uniqueId = globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const path = `${prefix}/${id}/${uniqueId}-${safeName}`;

    if (provider === 'supabase') {
        const { error } = await uploadAsset(file, 'otitech-assets', path);
        if (error) throw error;
        return { url: getPublicUrl('otitech-assets', path), storagePath: path };
    }

    if (provider === 's3') {
        const response = await mediaApi.presignedUpload({ prefix, fileName: file.name, contentType: file.type });
        const upload = response.data;
        const result = await fetch(upload.uploadUrl, {
            method: upload.method || 'PUT',
            headers: upload.headers || { 'Content-Type': file.type },
            body: file,
        });
        if (!result.ok) throw new Error(`Storage upload failed (HTTP ${result.status}). Check the storage bucket CORS settings.`);
        return { url: upload.publicUrl, storagePath: upload.key };
    }

    throw new Error('Image storage is not configured. Set STORAGE_PROVIDER to supabase or s3.');
};

const loadImageManager = async (container, kind, id) => {
    if (!container) return;
    container.innerHTML = '<p class="admin-muted">Loading images…</p>';
    try {
        const api = imageApiFor(kind);
        const images = unwrap(await api.list(id)) || [];
        container.innerHTML = `
            <div class="admin-panel-heading"><div><p class="admin-eyebrow">MEDIA</p><h3>Image gallery</h3></div><span class="admin-muted">${images.length} images</span></div>
            ${images.length ? `<div class="admin-image-grid">${images.map((image) => `
                <article class="admin-image-card"><img src="${escapeHtml(image.url)}" alt="${escapeHtml(image.altText || '')}" loading="lazy"><div><form class="admin-image-edit" data-save-image="${image.id}"><label><span class="visually-hidden">Alternative text</span><input name="altText" maxlength="255" value="${escapeHtml(image.altText || '')}" placeholder="Alternative text"></label><label class="admin-image-order"><span>Order</span><input name="sortOrder" type="number" min="0" value="${Number(image.sortOrder) || 0}"></label><button class="admin-text-link" type="submit">Save image details</button></form>${image.isCover || image.is_cover ? '<span class="admin-publish-state is-published">Cover image</span>' : `<button class="admin-text-link" type="button" data-cover-image="${image.id}">Set as cover</button>`}<button class="admin-text-link admin-text-link--danger" type="button" data-delete-image="${image.id}">Remove</button></div></article>`).join('')}</div>` : '<p class="admin-muted">No images yet. Add a clear, well-lit photo below.</p>'}
            <form class="admin-upload-form" id="imageUploadForm"><label class="admin-field"><span>Image file</span><input name="image" type="file" accept="image/jpeg,image/png,image/webp,image/avif" required></label><label class="admin-field"><span>Alternative text</span><input name="altText" maxlength="255" placeholder="Describe the image"></label><label class="admin-checkbox"><input name="isCover" type="checkbox" value="true"><span>Use as cover image</span></label><button class="btn btn-secondary" type="submit">Upload image</button></form>`;

        container.querySelector('#imageUploadForm').addEventListener('submit', async (event) => {
            event.preventDefault();
            const button = event.currentTarget.querySelector('[type="submit"]');
            button.disabled = true;
            try {
                const formData = new FormData(event.currentTarget);
                const file = formData.get('image');
                if (!file || !file.size) throw new Error('Choose an image file first.');
                if (file.size > 5 * 1024 * 1024) throw new Error('Images must be 5 MB or smaller.');
                if (!['image/jpeg', 'image/png', 'image/webp', 'image/avif'].includes(file.type)) {
                    throw new Error('Choose a JPG, PNG, WebP, or AVIF image.');
                }

                const uploaded = await uploadImageFile(kind, id, file);
                const response = await api.add(id, {
                    url: uploaded.url,
                    altText: formData.get('altText')?.toString().trim() || '',
                    isCover: formData.get('isCover') === 'true',
                });
                showToast(response.data?.message || 'Image uploaded.');
                await loadImageManager(container, kind, id);
            } catch (error) {
                showToast(error.message, 'error');
                button.disabled = false;
            }
        });
        container.querySelectorAll('[data-cover-image]').forEach((button) => button.addEventListener('click', async () => {
            try {
                await api.update(id, button.dataset.coverImage, { isCover: true });
                await loadImageManager(container, kind, id);
                showToast('Cover image updated.');
            } catch (error) { showToast(error.message, 'error'); }
        }));
        container.querySelectorAll('[data-save-image]').forEach((form) => form.addEventListener('submit', async (event) => {
            event.preventDefault();
            const values = new FormData(event.currentTarget);
            const button = event.currentTarget.querySelector('[type="submit"]');
            button.disabled = true;
            try {
                await api.update(id, event.currentTarget.dataset.saveImage, {
                    altText: values.get('altText').toString(),
                    sortOrder: Number(values.get('sortOrder')),
                });
                await loadImageManager(container, kind, id);
                showToast('Image details saved.');
            } catch (error) { showToast(error.message, 'error'); }
            finally { button.disabled = false; }
        }));
        container.querySelectorAll('[data-delete-image]').forEach((button) => button.addEventListener('click', async () => {
            if (!await confirmAction('Remove this image?')) return;
            try {
                await api.delete(id, button.dataset.deleteImage);
                await loadImageManager(container, kind, id);
                showToast('Image removed.');
            } catch (error) { showToast(error.message, 'error'); }
        }));
    } catch (error) {
        container.innerHTML = `<p class="admin-form-error" role="alert">${escapeHtml(error.message)}</p>`;
    }
};

const openImageManager = (kind, record) => {
    const dialog = document.createElement('dialog');
    dialog.className = 'admin-dialog admin-dialog--media';
    dialog.setAttribute('aria-labelledby', 'adminDialogTitle');
    dialog.innerHTML = `<div class="admin-dialog-heading"><div><p class="admin-eyebrow">${escapeHtml(pretty(kind))} MEDIA</p><h2 id="adminDialogTitle">${escapeHtml(record.title)}</h2></div><button class="admin-icon-button" type="button" aria-label="Close" data-close-dialog>×</button></div><section class="admin-dialog-media" id="standaloneImageManager"></section>`;
    document.body.append(dialog);
    dialog.showModal();
    dialog.querySelector('[data-close-dialog]').addEventListener('click', () => dialog.close());
    dialog.addEventListener('close', () => dialog.remove(), { once: true });
    loadImageManager(dialog.querySelector('#standaloneImageManager'), kind, record.id);
};

const statusOptions = [['new', 'New'], ['in_progress', 'In progress'], ['contacted', 'Contacted'], ['closed', 'Closed']];
const serviceNames = {
    building_design: 'Building design', construction: 'Construction', real_estate: 'Real estate', project_support: 'Project support',
};

const renderEnquiries = async (statusFilter = '') => {
    const mainEl = getMain();
    if (!mainEl) return;
    const response = await enquiriesApi.list({ limit: 50, status: statusFilter });
    const items = response.data || [];
    mainEl.innerHTML = `
        <section class="admin-page-toolbar"><div><p class="admin-eyebrow">CLIENT MESSAGES</p><h2>Enquiries</h2><p>Track new requests and follow up with clients.</p></div><div class="admin-toolbar-actions">${isAdmin() ? '<button class="btn btn-secondary" type="button" data-action="import-enquiries">Import CSV</button>' : ''}</div></section>
        <form class="admin-filter-form" id="enquiryFilter"><label for="enquiryStatus">Filter by status</label><select id="enquiryStatus" name="status"><option value="">All statuses</option>${options(statusOptions, statusFilter)}</select></form>
        ${items.length ? `<section class="admin-enquiry-list" aria-label="Enquiries">${items.map((item) => `
            <article class="admin-enquiry-card"><header><div><span class="admin-status admin-status--${escapeHtml(item.status)}">${escapeHtml(pretty(item.status))}</span><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(serviceNames[item.service] || pretty(item.service))} · ${escapeHtml(formatDate(item.createdAt || item.created_at))}</p></div><label class="admin-field admin-enquiry-status"><span>Status</span><select data-enquiry-status="${item.id}" ${canEdit() ? '' : 'disabled'}>${options(statusOptions, item.status)}</select></label></header>
                <div class="admin-contact-links"><a href="tel:${encodeURIComponent(item.phone)}">${escapeHtml(item.phone)}</a>${item.email ? `<a href="mailto:${escapeHtml(item.email)}">${escapeHtml(item.email)}</a>` : ''}</div><p class="admin-enquiry-message">${escapeHtml(item.message)}</p>
                <label class="admin-field"><span>Staff notes</span><textarea rows="2" data-enquiry-notes="${item.id}" ${canEdit() ? '' : 'disabled'}>${escapeHtml(item.notes || '')}</textarea></label>
                <footer><span class="admin-muted">Received ${escapeHtml(formatDate(item.createdAt || item.created_at))}</span>${canEdit() ? `<button class="btn btn-secondary" type="button" data-save-enquiry="${item.id}">Save updates</button>` : ''}${isAdmin() ? `<button class="btn btn-danger" type="button" data-delete-enquiry="${item.id}">Delete</button>` : ''}</footer>
            </article>`).join('')}</section>` : '<section class="admin-empty-state"><h3>No enquiries match this filter</h3><p>New client requests will appear here.</p></section>'}`;

document.querySelector('#enquiryFilter').addEventListener('change', (event) => {
        if (event.target.name === 'status') renderEnquiries(event.target.value);
    });
    mainEl.querySelectorAll('[data-enquiry-status]').forEach((select) => select.addEventListener('change', async (event) => {
        try {
            await enquiriesApi.update(event.currentTarget.dataset.enquiryStatus, { status: event.currentTarget.value });
            showToast('Enquiry status updated.');
        } catch (error) { showToast(error.message, 'error'); }
    }));
    mainEl.querySelectorAll('[data-save-enquiry]').forEach((button) => button.addEventListener('click', async () => {
        const id = button.dataset.saveEnquiry;
        const item = items.find((entry) => String(entry.id) === id);
        const statusValue = mainEl.querySelector(`[data-enquiry-status="${id}"]`)?.value || item.status;
        const notes = mainEl.querySelector(`[data-enquiry-notes="${id}"]`).value;
        button.disabled = true;
        try {
            await enquiriesApi.update(id, { status: statusValue, notes });
            showToast('Enquiry updates saved.');
        } catch (error) { showToast(error.message, 'error'); }
        finally { button.disabled = false; }
    }));
    mainEl.querySelectorAll('[data-delete-enquiry]').forEach((button) => button.addEventListener('click', async () => {
        if (!await confirmAction('Delete this enquiry? This cannot be undone.')) return;
        try {
            await enquiriesApi.delete(button.dataset.deleteEnquiry);
            showToast('Enquiry deleted.');
            renderEnquiries(statusFilter);
        } catch (error) { showToast(error.message, 'error'); }
    }));
    mainEl.querySelector('[data-action="import-enquiries"]')?.addEventListener('click', () => openCsvImportDialog('enquiries'));
};

const renderUsers = async (search = '', page = 1) => {
    const mainEl = getMain();
    if (!mainEl) return;
    const limit = 20;
    try {
        const response = await adminApi.users({ search, page, limit });
        const users = response.data || [];
        const pagination = response.pagination || {};

        mainEl.innerHTML = `
            <section class="admin-page-toolbar"><div><p class="admin-eyebrow">USER MANAGEMENT</p><h2>Staff accounts</h2><p>Invite team members, assign roles, and manage access.</p></div>${isAdmin() ? '<button class="btn btn-primary" type="button" data-action="new-user">Invite user <span aria-hidden="true">+</span></button>' : ''}</section>
            <form class="admin-filter-form" id="userSearch"><label for="userSearchInput">Search</label><input id="userSearchInput" name="search" type="search" value="${escapeHtml(search)}" placeholder="Search by name or email"><button class="btn btn-secondary" type="submit">Search</button>${search ? '<a class="admin-text-link" href="#users">Clear</a>' : ''}</form>
            ${users.length ? `<section class="admin-user-table-wrap"><table class="admin-table"><thead><tr><th scope="col">Name</th><th scope="col">Email</th><th scope="col">Role</th><th scope="col">Status</th><th scope="col">Last login</th><th scope="col">Actions</th></tr></thead><tbody>${users.map((user) => `
                <tr>
                    <td><strong>${escapeHtml(user.fullName)}</strong></td>
                    <td>${escapeHtml(user.email)}</td>
                    <td><span class="admin-status admin-status--${escapeHtml(user.role)}">${escapeHtml(pretty(user.role))}</span></td>
                    <td><span class="admin-status ${user.isActive ? 'admin-status--available' : 'admin-status--sold'}">${user.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td>${escapeHtml(formatDate(user.lastLoginAt))}</td>
                    <td>
                        ${isAdmin() ? `
                            <button class="btn btn-secondary" type="button" data-action="edit-user" data-id="${user.id}">Edit</button>
                            <button class="btn btn-danger" type="button" data-action="delete-user" data-id="${user.id}">Delete</button>
                        ` : ''}
                    </td>
                </tr>`).join('')}</tbody></table></section>` : '<section class="admin-empty-state"><h3>No users found</h3><p>Invite your first team member.</p></section>'}
            ${pagination.totalPages > 1 ? `
                <nav class="admin-pagination" aria-label="Pagination">
                    ${page > 1 ? `<a class="btn btn-secondary" href="#users?search=${encodeURIComponent(search)}&page=${page - 1}">Previous</a>` : ''}
                    <span class="admin-pagination-info">Page ${page} of ${pagination.totalPages}</span>
                    ${page < pagination.totalPages ? `<a class="btn btn-secondary" href="#users?search=${encodeURIComponent(search)}&page=${page + 1}">Next</a>` : ''}
                </nav>` : ''}`;
        
        document.querySelector('#userSearch')?.addEventListener('submit', (event) => {
            event.preventDefault();
            renderUsers(new FormData(event.currentTarget).get('search').toString().trim(), 1);
        });
        
        bindUserActions(users);
    } catch (err) {
        showPageError(err);
    }
};

const bindUserActions = (users) => {
    if (!isAdmin()) return;
    
    const mainEl = getMain();
    if (!mainEl) return;

    mainEl.querySelector('[data-action="new-user"]')?.addEventListener('click', () => openUserEditor());
    
    mainEl.querySelectorAll('[data-action="edit-user"]').forEach((button) => {
        button.addEventListener('click', () => openUserEditor(users.find(u => String(u.id) === button.dataset.id)));
    });
    
    mainEl.querySelectorAll('[data-action="delete-user"]').forEach((button) => {
        button.addEventListener('click', async () => {
            const user = users.find(u => String(u.id) === button.dataset.id);
            if (!user || !await confirmAction(`Delete "${user.fullName}"? This cannot be undone.`)) return;
            try {
                await adminApi.deleteUser(button.dataset.id);
                showToast('User deleted.');
                renderUsers(document.querySelector('#userSearchInput')?.value || '', 1);
            } catch (err) { showToast(err.message, 'error'); }
        });
    });
};

const openUserEditor = (user = null) => {
    const editing = Boolean(user?.id);
    const dialog = document.createElement('dialog');
    dialog.className = 'admin-dialog';
    dialog.setAttribute('aria-labelledby', 'adminDialogTitle');
    dialog.innerHTML = `
        <div class="admin-dialog-heading"><div><p class="admin-eyebrow">USER MANAGEMENT</p><h2 id="adminDialogTitle">${editing ? 'Edit' : 'Invite'} user</h2></div><button class="admin-icon-button" type="button" data-close-dialog aria-label="Close">×</button></div>
        <p class="admin-form-error" id="userFormError" role="alert" hidden></p>
        <form id="userForm" class="admin-record-form">
            <div class="admin-form-grid">
                <label class="admin-field"><span>Full name<b aria-hidden="true">*</b></span><input name="fullName" value="${escapeHtml(user?.fullName || '')}" required></label>
                <label class="admin-field"><span>Email<b aria-hidden="true">*</b></span><input name="email" type="email" value="${escapeHtml(user?.email || '')}" ${!editing ? 'required' : ''} ${editing ? 'disabled' : ''}></label>
                <label class="admin-field"><span>Role<b aria-hidden="true">*</b></span><select name="role" required>${[['admin', 'Administrator'], ['staff', 'Staff'], ['viewer', 'Viewer']].map(([v, l]) => `<option value="${v}" ${user?.role === v || (!user && v === 'staff') ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
                <label class="admin-field admin-checkbox"><input type="checkbox" name="isActive" ${user ? (user.isActive ? 'checked' : '') : 'checked'}><span>Active</span></label>
                ${!editing ? `
                    <label class="admin-field"><span>Password<b aria-hidden="true">*</b></span><input name="password" type="password" required minlength="12" placeholder="Min 12 chars, upper, lower, number, symbol"></label>
                ` : ''}
            </div>
            <label class="admin-checkbox"><input type="checkbox" name="sendInvite" ${!editing ? 'checked' : ''}><span>${!editing ? 'Send invitation email' : 'Email user about changes'}</span></label>
            <div class="admin-dialog-actions"><button class="btn btn-secondary" type="button" data-close-dialog>Cancel</button><button class="btn btn-primary" type="submit">${editing ? 'Save changes' : 'Invite user'}</button></div>
        </form>`;
    document.body.append(dialog);
    dialog.showModal();
    dialog.addEventListener('close', () => dialog.remove(), { once: true });
    dialog.querySelectorAll('[data-close-dialog]').forEach((button) => button.addEventListener('click', () => dialog.close()));

    dialog.querySelector('#userForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const form = event.currentTarget;
        if (!form.reportValidity()) return;
        const data = new FormData(form);
        const payload = {
            fullName: data.get('fullName').toString().trim(),
            email: data.get('email').toString().trim().toLowerCase(),
            role: data.get('role'),
            isActive: data.get('isActive') === 'on',
            sendInvite: data.get('sendInvite') === 'on',
        };
        if (!editing) payload.password = data.get('password').toString();

        const error = dialog.querySelector('#userFormError');
        const save = dialog.querySelector('[type="submit"]');
        error.hidden = true;
        save.disabled = true;

        try {
            const userApi = user ? adminApi.updateUser(user.id, payload) : adminApi.createUser(payload);
            await userApi;
            showToast(`${editing ? 'User updated' : 'User invited'}.`);
            dialog.close();
            renderUsers(document.querySelector('#userSearchInput')?.value || '', 1);
        } catch (err) {
            error.textContent = err.message;
            error.hidden = false;
        } finally {
            save.disabled = false;
        }
    });
};
const openCsvImportDialog = (kind) => {
    const configs = {
        properties: {
            title: 'Import Properties',
            endpoint: 'properties',
            requiredFields: ['slug', 'title', 'type', 'purpose', 'status', 'location'],
            optionalFields: ['size', 'price', 'priceLabel', 'description', 'features', 'accent', 'isPublished'],
            sampleHeaders: 'slug,title,type,purpose,status,location,size,price,priceLabel,description,features,accent,isPublished',
            sampleRow: 'my-property,My Property,house,sale,available,Lagos,200 sqm,50000000,₦50M,"Beautiful home",["Feature 1","Feature 2"],plum,false',
        },
        projects: {
            title: 'Import Projects',
            endpoint: 'projects',
            requiredFields: ['slug', 'title', 'category', 'status', 'location'],
            optionalFields: ['year', 'size', 'value', 'description', 'highlights', 'services', 'accent', 'isPublished'],
            sampleHeaders: 'slug,title,category,status,location,year,size,value,description,highlights,services,accent,isPublished',
            sampleRow: 'my-project,My Project,residential,completed,Lagos,2024,300 sqm,100000000,"Great project",["Highlight 1"],["building_design"],plum,false',
        },
        enquiries: {
            title: 'Import Enquiries',
            endpoint: 'enquiries',
            requiredFields: ['name', 'phone', 'service', 'message'],
            optionalFields: ['email', 'propertyId', 'projectId', 'status', 'assignedTo', 'notes'],
            sampleHeaders: 'name,phone,email,service,message,propertyId,projectId,status,assignedTo,notes',
            sampleRow: 'John Doe,+2348012345678,john@example.com,building_design,"Need design for house",,,new,,',
        },
    };

    const config = configs[kind];
    if (!config) {
        showToast('Unknown import type', 'error');
        return;
    }

    const dialog = document.createElement('dialog');
    dialog.className = 'admin-dialog admin-dialog--wide';
    dialog.setAttribute('aria-labelledby', 'csvImportTitle');
    dialog.innerHTML = `
        <div class="admin-dialog-heading"><div><p class="admin-eyebrow">BULK IMPORT</p><h2 id="csvImportTitle">${config.title}</h2></div><button class="admin-icon-button" type="button" data-close-dialog aria-label="Close">×</button></div>
        <p class="admin-form-error" id="csvImportError" role="alert" hidden></p>
        <form id="csvImportForm" class="admin-record-form">
            <div class="admin-form-grid">
                <label class="admin-field admin-field--wide"><span>CSV File<b aria-hidden="true">*</b></span><input name="csvFile" type="file" accept=".csv,text/csv" required></label>
            </div>
            <details class="admin-csv-help">
                <summary>CSV Format Guide</summary>
                <p class="admin-muted">Required fields: ${config.requiredFields.join(', ')}</p>
                <p class="admin-muted">Optional fields: ${config.optionalFields.join(', ')}</p>
                <p class="admin-muted"><strong>Sample headers:</strong> ${config.sampleHeaders}</p>
                <p class="admin-muted"><strong>Sample row:</strong> ${config.sampleRow}</p>
                <p class="admin-muted">Use quotes for fields containing commas. Boolean values: true/false.</p>
            </details>
            <div class="admin-dialog-actions">
                <button class="btn btn-secondary" type="button" data-close-dialog>Cancel</button>
                <button class="btn btn-primary" type="button" data-action="preview">Preview Import</button>
                <button class="btn btn-primary" type="submit" data-action="import">Import ${config.requiredFields.length} Records</button>
            </div>
            <div id="csvPreview" class="admin-csv-preview" hidden></div>
        </form>`;
    document.body.append(dialog);
    dialog.showModal();
    dialog.addEventListener('close', () => dialog.remove(), { once: true });
    dialog.querySelectorAll('[data-close-dialog]').forEach((button) => button.addEventListener('click', () => dialog.close()));

    let previewData = null;

    dialog.querySelector('[data-action="preview"]').addEventListener('click', async () => {
        const fileInput = dialog.querySelector('[name="csvFile"]');
        if (!fileInput.files[0]) {
            showToast('Please select a CSV file', 'error');
            return;
        }

        const file = fileInput.files[0];
        const text = await file.text();

        try {
            const result = Papa.parse(text, {
                header: true,
                skipEmptyLines: true,
                transformHeader: (header) => header.trim(),
                transform: (value) => value.trim(),
            });

            if (result.errors.length > 0) {
                throw new Error(`CSV parsing errors: ${result.errors.map(e => e.message).join(', ')}`);
            }

            if (result.data.length === 0) {
                throw new Error('CSV file is empty');
            }

            const missingFields = config.requiredFields.filter(f => !result.meta.fields.includes(f));
            if (missingFields.length > 0) {
                throw new Error(`Missing required columns: ${missingFields.join(', ')}`);
            }

            previewData = result.data;
            const previewContainer = dialog.querySelector('#csvPreview');
            previewContainer.hidden = false;
            previewContainer.innerHTML = `
                <h3>Preview (${previewData.length} rows)</h3>
                <div class="admin-table-wrap" style="max-height: 300px; overflow: auto;">
                    <table class="admin-table">
                        <thead>
                            <tr>${result.meta.fields.map(f => `<th scope="col">${escapeHtml(f)}</th>`).join('')}</tr>
                        </thead>
                        <tbody>
                            ${previewData.slice(0, 10).map(row => `
                                <tr>${result.meta.fields.map(f => `<td>${escapeHtml(row[f] || '')}</td>`).join('')}</tr>
                            `).join('')}
                            ${previewData.length > 10 ? `<tr><td colspan="${result.meta.fields.length}" class="admin-muted">... and ${previewData.length - 10} more rows</td></tr>` : ''}
                        </tbody>
                    </table>
                </div>`;
        } catch (err) {
            const errorEl = dialog.querySelector('#csvImportError');
            errorEl.textContent = err.message;
            errorEl.hidden = false;
        }
    });

    dialog.querySelector('#csvImportForm').addEventListener('submit', async (event) => {
        event.preventDefault();
        const action = event.submitter.dataset.action;

        if (action === 'preview') return;

        if (!previewData || previewData.length === 0) {
            const errorEl = dialog.querySelector('#csvImportError');
            errorEl.textContent = 'Please preview the CSV first';
            errorEl.hidden = false;
            return;
        }

        const errorEl = dialog.querySelector('#csvImportError');
        errorEl.hidden = true;
        const submitBtn = dialog.querySelector('[type="submit"]');
        submitBtn.disabled = true;

        try {
            let successCount = 0;
            let errorCount = 0;
            const errors = [];

            for (let i = 0; i < previewData.length; i++) {
                const row = previewData[i];
                try {
                    const payload = {};
                    for (const field of [...config.requiredFields, ...config.optionalFields]) {
                        let value = row[field];
                        if (value === undefined || value === '') continue;
                        
                        if (field === 'isPublished') {
                            payload[field] = value.toLowerCase() === 'true';
                        } else if (field === 'price' || field === 'value') {
                            payload[field] = value ? Number(value.replace(/[^0-9.]/g, '')) : undefined;
                        } else if (field === 'features' || field === 'highlights' || field === 'services') {
                            payload[field] = value ? value.split(',').map(v => v.trim()).filter(Boolean) : [];
                        } else {
                            payload[field] = value;
                        }
                    }

                    const api = kind === 'properties' ? propertiesApi : kind === 'projects' ? projectsApi : enquiriesApi;
                    await api.create(payload);
                    successCount++;
                } catch (err) {
                    errorCount++;
                    errors.push(`Row ${i + 1}: ${err.message}`);
                }
            }

            showToast(`Import complete: ${successCount} successful, ${errorCount} failed.`);
            if (errors.length > 0) {
                console.error('Import errors:', errors);
            }
            dialog.close();
            renderView();
        } catch (err) {
            const errorEl = dialog.querySelector('#csvImportError');
            errorEl.textContent = err.message;
            errorEl.hidden = false;
        } finally {
            const submitBtn = dialog.querySelector('[type="submit"]');
            submitBtn.disabled = false;
        }
    });
};
const renderSettings = async () => {
    const mainEl = getMain();
    if (!mainEl) return;
    const response = await settingsApi.list();
    const settings = response.data || [];
    mainEl.innerHTML = `
        <section class="admin-page-toolbar"><div><p class="admin-eyebrow">PUBLIC CONTACT DETAILS</p><h2>Site settings</h2><p>Update the contact values used across the public website.</p></div></section>
        <section class="admin-settings-list">${settings.length ? settings.map((setting) => `
            <form class="admin-setting-row" data-setting-form="${escapeHtml(setting.key)}"><div><h3>${escapeHtml(pretty(setting.key))}</h3><p>${escapeHtml(setting.description || setting.key)}</p></div><label class="admin-field"><span class="visually-hidden">${escapeHtml(pretty(setting.key))} value</span><textarea name="value" rows="2" required>${escapeHtml(setting.value)}</textarea></label><button class="btn btn-secondary" type="submit" ${isAdmin() ? '' : 'disabled'}>Save</button></form>`).join('') : '<div class="admin-empty-state"><h3>No site settings found</h3><p>Seed the database to create the starter settings.</p></div>'}</section>`;
    mainEl.querySelectorAll('[data-setting-form]').forEach((form) => form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const data = new FormData(form);
        const button = form.querySelector('[type="submit"]');
        button.disabled = true;
        try {
            await settingsApi.update(form.dataset.settingForm, { value: data.get('value').toString() });
            showToast('Setting saved.');
        } catch (error) { showToast(error.message, 'error'); }
        finally { button.disabled = !isAdmin(); }
    }));
};



document.querySelector('#adminSidebarNav').addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (!link) return;
    if (link.hidden) event.preventDefault();
});
document.querySelector('#adminSidebarNav').addEventListener('keydown', (event) => {
    if (event.key === 'Escape') document.querySelector('.admin-mobile-menu-btn').click();
});
document.querySelector('#adminOverlay').addEventListener('keydown', (event) => {
    if (event.key === 'Escape') document.querySelector('.admin-mobile-menu-btn').click();
});
window.addEventListener('hashchange', renderView);
window.addEventListener('otitech:session-expired', logout);

const start = async () => {
    // Check for Supabase session first
    const { session } = await getSession();
    if (!session) return logout();

    try {
        // Get current user from Supabase
        const { user, error } = await getCurrentUser();
        if (error || !user) {
            return logout();
        }
        
        // Fetch user profile from our API to get role
        const response = await authApi.me();
        setCurrentUser(response.data);
        bindSidebar();
        loadNavigationCounts();
        await renderView();
    } catch (error) {
        logout();
    }
};

start();
