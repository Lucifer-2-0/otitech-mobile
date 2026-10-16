export const organizationJsonLd = (config = {}) => {
  const defaults = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'OTI-TECH',
    url: 'https://otitech.com',
    logo: 'https://otitech.com/img/logo.png',
    sameAs: [
      'https://www.linkedin.com/company/otitech',
      'https://www.instagram.com/otitech',
      'https://twitter.com/otitech',
    ],
    contactPoint: {
      '@type': 'ContactPoint',
      telephone: '+234-901-701-7156',
      contactType: 'customer service',
      availableLanguage: ['English'],
      hoursAvailable: 'Mo-Fr 08:00-18:00',
    },
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'NG',
      addressLocality: 'Lagos',
      addressRegion: 'Lagos State',
    },
  };
  return { ...defaults, ...config };
};

export const websiteJsonLd = (config = {}) => {
  const defaults = {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: 'OTI-TECH',
    url: 'https://otitech.com',
    potentialAction: {
      '@type': 'SearchAction',
      target: {
        '@type': 'EntryPoint',
        urlTemplate: 'https://otitech.com/pages/properties.html?search={search_term_string}',
      },
      'query-input': 'required name=search_term_string',
    },
  };
  return { ...defaults, ...config };
};

export const breadcrumbJsonLd = (items) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
};

export const realEstateListingJsonLd = (property) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'RealEstateListing',
    name: property.title,
    description: property.summary || property.description,
    url: `https://otitech.com/pages/property-details.html?slug=${property.slug}`,
    image: property.image ? `https://otitech.com${property.image.replace('../', '/')}` : undefined,
    offers: {
      '@type': 'Offer',
      price: property.price,
      priceCurrency: 'NGN',
      priceSpecification: {
        '@type': 'UnitPriceSpecification',
        price: property.price,
        priceCurrency: 'NGN',
      },
      availability: property.status === 'available'
        ? 'https://schema.org/InStock'
        : property.status === 'under_offer'
          ? 'https://schema.org/PreOrder'
          : 'https://schema.org/SoldOut',
    },
    about: {
      '@type': 'Residence',
      name: property.title,
      floorSize: {
        '@type': 'QuantitativeValue',
        value: property.size,
        unitCode: 'MTK',
      },
      numberOfRooms: property.type === 'house' ? 4 : property.type === 'apartment' ? 3 : undefined,
    },
    address: {
      '@type': 'PostalAddress',
      addressLocality: property.location.split(',')[0]?.trim(),
      addressRegion: property.location.split(',')[1]?.trim(),
      addressCountry: 'NG',
    },
  };
};

export const projectJsonLd = (project) => {
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: project.title,
    description: project.description,
    url: `https://otitech.com/pages/project-details.html?slug=${project.slug}`,
    image: project.image ? `https://otitech.com${project.image.replace('../', '/')}` : undefined,
    dateCreated: project.year,
    category: project.category,
    keywords: project.highlights?.join(', '),
    location: {
      '@type': 'Place',
      name: project.location,
    },
  };
};

export const localBusinessJsonLd = (config = {}) => {
  const defaults = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: 'OTI-TECH',
    description: 'Building design, construction and real-estate support for people and businesses.',
    url: 'https://otitech.com',
    telephone: '+234-901-701-7156',
    email: 'info@otitech.com',
    address: {
      '@type': 'PostalAddress',
      addressCountry: 'NG',
      addressLocality: 'Lagos',
      addressRegion: 'Lagos State',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: 6.5244,
      longitude: 3.3792,
    },
    openingHoursSpecification: [
      {
        '@type': 'OpeningHoursSpecification',
        dayOfWeek: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
        opens: '08:00',
        closes: '18:00',
      },
    ],
    priceRange: '$$$',
    currenciesAccepted: 'NGN',
    paymentAccepted: 'Cash, Credit Card, Bank Transfer',
  };
  return { ...defaults, ...config };
};

export const renderJsonLd = (data) => {
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`;
};

export default {
  organizationJsonLd,
  websiteJsonLd,
  breadcrumbJsonLd,
  realEstateListingJsonLd,
  projectJsonLd,
  localBusinessJsonLd,
  renderJsonLd,
};