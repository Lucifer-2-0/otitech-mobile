import { settingsApi, enquiriesApi } from './api.js';

let whatsappNumber = '2349017017156';

export const initContact = async () => {
    try {
        const response = await settingsApi.getPublic(['whatsapp_number']);
        const setting = response.data.find(s => s.key === 'whatsapp_number');
        if (setting) whatsappNumber = setting.value;
    } catch (err) {
        console.warn('Could not fetch WhatsApp number from settings, using default');
    }
};

export const buildWhatsAppUrl = (message) => `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;

export const openWhatsApp = (message) => {
    window.open(buildWhatsAppUrl(message), '_blank', 'noopener,noreferrer');
};

export const preparePropertyEnquiry = (interest, contactFormElements) => {
    const { contactService, contactMessage, contactName, contactSection } = contactFormElements;
    if (contactService) contactService.value = 'real_estate';
    if (contactMessage && !contactMessage.value.trim()) {
        contactMessage.value = `I would like help finding ${interest}.`;
    }
    if (contactSection) {
        contactSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => contactName?.focus({ preventScroll: true }), 250);
    }
};

export const handleContactFormSubmit = async (form, statusElement) => {
    if (!form.checkValidity()) {
        form.reportValidity();
        return false;
    }

    const formData = new FormData(form);
    const serviceSelect = form.querySelector('#contact-service');
    const serviceLabel = serviceSelect?.selectedOptions[0]?.textContent?.trim() || 'General enquiry';

    const enquiryData = {
        name: formData.get('name'),
        phone: formData.get('phone'),
        // The API accepts an empty string for an omitted email and normalizes it to null.
        email: formData.get('email') || '',
        service: serviceSelect?.value || 'project_support',
        message: formData.get('message'),
    };

    try {
        const response = await enquiriesApi.create(enquiryData);

        if (statusElement) {
            statusElement.textContent = 'Enquiry saved. WhatsApp will open with your message ready; press Send there to start the chat.';
            statusElement.style.color = '#25D366';
        }

        const lines = [
            'Hello OTI-TECH,',
            '',
            `My name is ${enquiryData.name}.`,
            `Phone: ${enquiryData.phone}.`,
            enquiryData.email ? `Email: ${enquiryData.email}.` : '',
            `I need help with: ${serviceLabel}.`,
            '',
            enquiryData.message
        ].filter(Boolean);

        setTimeout(() => openWhatsApp(lines.join('\n')), 1500);
        return true;
    } catch (err) {
        console.warn('API submission failed, falling back to WhatsApp:', err.message);

        const lines = [
            'Hello OTI-TECH,',
            '',
            `My name is ${enquiryData.name}.`,
            `Phone: ${enquiryData.phone}.`,
            enquiryData.email ? `Email: ${enquiryData.email}.` : '',
            `I need help with: ${serviceLabel}.`,
            '',
            enquiryData.message
        ].filter(Boolean);

        openWhatsApp(lines.join('\n'));

        if (statusElement) {
            statusElement.textContent = 'We could not save your enquiry. WhatsApp is opening with your details; press Send there to contact us.';
            statusElement.style.color = '#f1c40f';
        }
        return true;
    }
};

export const handlePropertySearchSubmit = (form, contactFormElements, statusElement) => {
    const propertyType = form.querySelector('#property-type');
    const propertyPurpose = form.querySelector('#property-purpose');
    const propertyLocation = form.querySelector('#property-location');
    const resultsUrl = form.dataset.resultsUrl;

    if (resultsUrl) {
        const target = new URL(resultsUrl, window.location.href);
        if (propertyType?.value) target.searchParams.set('type', propertyType.value);
        if (propertyPurpose?.value) target.searchParams.set('purpose', propertyPurpose.value);
        if (propertyLocation?.value.trim()) target.searchParams.set('location', propertyLocation.value.trim());
        window.location.assign(target);
        return;
    }

    const selections = [
        propertyPurpose?.selectedOptions[0]?.textContent,
        propertyType?.selectedOptions[0]?.textContent,
        propertyLocation?.value.trim()
    ].filter(value => value && !['Buy or Rent', 'All Properties'].includes(value));

    const interest = selections.length ? selections.join(' in ') : 'a property';
    preparePropertyEnquiry(interest, contactFormElements);

    if (statusElement) {
        statusElement.textContent = 'Your property enquiry has been prepared below.';
    }
};
