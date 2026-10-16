import { projectCardMarkup, projectDetailMarkup, projectCategories, projectStatuses, sampleProjects, normalizeProject } from '../components/project-card.js';
import { projectsApi } from './api.js';
import { initImageGallery } from '../components/image-gallery.js';

const searchParams = new URLSearchParams(window.location.search);

const localProjects = sampleProjects.map(normalizeProject);

const filterLocalProjects = (projects, params) => {
    const { category, status, location, year } = params;
    return projects.filter((project) => {
        if (category && project.category !== category) return false;
        if (status && project.status !== status) return false;
        if (location && !project.location.toLowerCase().includes(location.toLowerCase())) return false;
        if (year && !project.year.includes(year)) return false;
        return true;
    });
};

const initialiseProjectsPage = () => {
    const filterForm = document.querySelector('#projects-filter');
    const grid = document.querySelector('#projects-grid');
    const status = document.querySelector('#projects-status');
    const resultsCount = document.querySelector('#projects-count');

    if (!filterForm || !grid || !status) {
        return;
    }

    const categoryField = filterForm.elements.category;
    const statusField = filterForm.elements.status;
    const locationField = filterForm.elements.location;
    const yearField = filterForm.elements.year;

    categoryField.value = searchParams.get('category') || '';
    statusField.value = searchParams.get('status') || '';
    locationField.value = searchParams.get('location') || '';
    yearField.value = searchParams.get('year') || '';

    const render = async () => {
        const selectedCategory = categoryField.value;
        const selectedStatus = statusField.value;
        const selectedLocation = locationField.value.trim();
        const selectedYear = yearField.value;

        const params = {};
        if (selectedCategory) params.category = selectedCategory;
        if (selectedStatus) params.status = selectedStatus;
        if (selectedLocation) params.location = selectedLocation;
        if (selectedYear) params.year = selectedYear;

        grid.innerHTML = '<p class="loading-state">Loading projects...</p>';

        try {
            const response = await projectsApi.list(params);
            const { data: projects, pagination } = response;

            grid.innerHTML = projects.length
                ? projects.map(projectCardMarkup).join('')
                : '<p class="empty-state">No projects match those filters. Clear a filter or contact OTI-TECH to discuss your project.</p>';

            if (resultsCount) {
                resultsCount.textContent = `${pagination.total} ${pagination.total === 1 ? 'project' : 'projects'} found`;
            }
            status.textContent = `Showing ${projects.length} of ${pagination.total} ${pagination.total === 1 ? 'project' : 'projects'}.`;

            const updatedParams = new URLSearchParams();
            if (selectedCategory) updatedParams.set('category', selectedCategory);
            if (selectedStatus) updatedParams.set('status', selectedStatus);
            if (selectedLocation) updatedParams.set('location', selectedLocation);
            if (selectedYear) updatedParams.set('year', selectedYear);
            const query = updatedParams.toString();
            window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}`);
        } catch (err) {
            console.warn('API unavailable, falling back to local data:', err.message);

            const filtered = filterLocalProjects(localProjects, params);
            const total = localProjects.length;

            grid.innerHTML = filtered.length
                ? filtered.map(projectCardMarkup).join('')
                : '<p class="empty-state">No projects match those filters. Clear a filter or contact OTI-TECH to discuss your project.</p>';

            if (resultsCount) {
                resultsCount.textContent = `${total} ${total === 1 ? 'project' : 'projects'} found`;
            }
            status.textContent = `Showing ${filtered.length} ${filtered.length === 1 ? 'project' : 'projects'} (offline mode).`;
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

const initialiseProjectDetailsPage = async () => {
    const detail = document.querySelector('#project-detail');

    if (!detail) {
        return;
    }

    const slug = searchParams.get('slug');

    detail.innerHTML = '<p class="loading-state">Loading project details...</p>';

    try {
        const response = await projectsApi.get(slug);
        const project = response.data;

        document.title = `${project.title} | OTI-TECH`;
        detail.innerHTML = projectDetailMarkup(project);
        initImageGallery(detail);
    } catch (err) {
        console.warn('API unavailable, falling back to local data:', err.message);

        const project = localProjects.find(p => p.slug === slug) || localProjects[0];

        document.title = `${project.title} | OTI-TECH`;
        detail.innerHTML = projectDetailMarkup(project);
        initImageGallery(detail);
    }
};

initialiseProjectsPage();
initialiseProjectDetailsPage();
