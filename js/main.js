import { preparePropertyEnquiry, handleContactFormSubmit, handlePropertySearchSubmit, initContact } from './contact.js';
import { initHeroCarousel } from '../components/hero-carousel.js';

(() => {
    initContact();
    initHeroCarousel();

    const contactSection = document.querySelector('#contact');
    const contactName = document.querySelector('#contact-name');
    const contactService = document.querySelector('#contact-service');
    const contactMessage = document.querySelector('#contact-message');
    const propertySearchForm = document.querySelector('#property-search-form');
    const propertySearchStatus = document.querySelector('#property-search-status');
    const contactForm = document.querySelector('#contactForm');
    const contactFormStatus = document.querySelector('#contact-form-status');

    const contactFormElements = {
        contactService,
        contactMessage,
        contactName,
        contactSection
    };

    propertySearchForm?.addEventListener('submit', (event) => {
        event.preventDefault();
        handlePropertySearchSubmit(propertySearchForm, contactFormElements, propertySearchStatus);
    });

    document.querySelectorAll('[data-property-interest]').forEach((link) => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            preparePropertyEnquiry(link.dataset.propertyInterest, contactFormElements);
        });
    });

    contactForm?.addEventListener('submit', (event) => {
        event.preventDefault();
        handleContactFormSubmit(contactForm, contactFormStatus);
    });
})();
