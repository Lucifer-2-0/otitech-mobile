import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;
const API_PREFIX = '/api/v1';

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// Mock data
const mockProperties = [
  {
    id: 1,
    slug: 'ikeja-residential-plot',
    title: 'Residential Plot in Ikeja GRA',
    type: 'land',
    purpose: 'sale',
    status: 'available',
    location: 'Ikeja GRA, Lagos',
    size: '600 sqm',
    price: 45000000,
    priceLabel: '₦45,000,000',
    description: 'Prime residential plot in the heart of Ikeja GRA. Excellent for building your dream home. Close to major landmarks, schools, and shopping centers.',
    features: ['Corner piece', 'Good road access', 'Close to power line', 'Titled land'],
    image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800',
    images: [
      { id: 1, url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800', altText: 'Plot overview', isCover: true },
      { id: 2, url: 'https://images.unsplash.com/photo-1494526585095-c41746248156?w=800', altText: 'Street view', isCover: false },
    ],
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-01-15T10:00:00Z',
  },
  {
    id: 2,
    slug: 'lekki-apartment-3bed',
    title: '3-Bedroom Luxury Apartment, Lekki Phase 1',
    type: 'apartment',
    purpose: 'rent',
    status: 'available',
    location: 'Lekki Phase 1, Lagos',
    size: '180 sqm',
    price: 3500000,
    priceLabel: '₦3,500,000/yr',
    description: 'Spacious 3-bedroom apartment with modern finishes. Includes BQ, balcony, and 24/7 security. Swimming pool and gym in complex.',
    features: ['En-suite bedrooms', 'Balcony', 'BQ', 'Backup power', 'Water treatment'],
    image: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
    images: [
      { id: 3, url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800', altText: 'Living room', isCover: true },
      { id: 4, url: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800', altText: 'Bedroom', isCover: false },
    ],
    createdAt: '2024-02-20T10:00:00Z',
    updatedAt: '2024-02-20T10:00:00Z',
  },
  {
    id: 3,
    slug: 'victoria-island-commercial',
    title: 'Commercial Office Space, Victoria Island',
    type: 'commercial',
    purpose: 'rent',
    status: 'available',
    location: 'Victoria Island, Lagos',
    size: '250 sqm',
    price: 12000000,
    priceLabel: '₦12,000,000/yr',
    description: 'Grade A office space in a prime Victoria Island location. Open plan with meeting rooms, kitchenette, and dedicated parking.',
    features: ['24/7 security', 'Backup generator', 'High-speed internet', 'Parking spaces', 'Reception area'],
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800',
    images: [
      { id: 5, url: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800', altText: 'Office interior', isCover: true },
    ],
    createdAt: '2024-03-10T10:00:00Z',
    updatedAt: '2024-03-10T10:00:00Z',
  },
  {
    id: 4,
    slug: 'abuja-house-sale',
    title: '4-Bedroom Detached House, Gwarinpa',
    type: 'house',
    purpose: 'sale',
    status: 'under_offer',
    location: 'Gwarinpa, Abuja',
    size: '350 sqm',
    price: 85000000,
    priceLabel: '₦85,000,000',
    description: 'Beautiful 4-bedroom detached house in a quiet estate. All rooms en-suite, large compound, borehole, and solar power.',
    features: ['All en-suite', 'Borehole', 'Solar power', 'Large compound', 'CCTV'],
    image: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
    images: [
      { id: 6, url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800', altText: 'House exterior', isCover: true },
    ],
    createdAt: '2024-01-05T10:00:00Z',
    updatedAt: '2024-01-05T10:00:00Z',
  },
  {
    id: 5,
    slug: 'surulere-land-sale',
    title: 'Commercial Land, Surulere',
    type: 'land',
    purpose: 'sale',
    status: 'available',
    location: 'Surulere, Lagos',
    size: '1000 sqm',
    price: 120000000,
    priceLabel: '₦120,000,000',
    description: 'Large commercial land on a major road in Surulere. Suitable for plaza, warehouse, or mixed-use development. Good title.',
    features: ['Major road frontage', 'C of O available', 'High traffic area', 'Fenced'],
    image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800',
    images: [
      { id: 7, url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800', altText: 'Land overview', isCover: true },
    ],
    createdAt: '2024-03-01T10:00:00Z',
    updatedAt: '2024-03-01T10:00:00Z',
  },
];

const mockProjects = [
  {
    id: 1,
    slug: 'ikeja-residential-complex',
    title: 'Ikeja Residential Complex',
    category: 'residential',
    status: 'completed',
    location: 'Ikeja, Lagos',
    year: '2023',
    size: '5000 sqm',
    value: 1200000000,
    description: 'A modern residential complex comprising 4 blocks of 12 apartments each. Features include underground parking, backup power, water treatment, and landscaped gardens.',
    highlights: ['48 luxury apartments', 'Underground parking', 'Solar backup', 'Children play area', '24/7 security'],
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800',
    images: [
      { id: 1, url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800', altText: 'Complex exterior', isCover: true },
      { id: 2, url: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800', altText: 'Lobby', isCover: false },
    ],
    createdAt: '2023-06-01T10:00:00Z',
    updatedAt: '2023-12-15T10:00:00Z',
  },
  {
    id: 2,
    slug: 'lekki-commercial-plaza',
    title: 'Lekki Commercial Plaza',
    category: 'commercial',
    status: 'ongoing',
    location: 'Lekki, Lagos',
    year: '2024',
    size: '3000 sqm',
    value: 850000000,
    description: 'A 5-story commercial plaza with retail shops, offices, and a food court. Currently at 65% completion. Expected delivery Q4 2024.',
    highlights: ['Retail + office mix', 'Food court', 'Rooftop terrace', 'Smart building systems', 'Ample parking'],
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800',
    images: [
      { id: 3, url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800', altText: 'Construction progress', isCover: true },
    ],
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-06-01T10:00:00Z',
  },
  {
    id: 3,
    slug: 'abuja-renovation-project',
    title: 'Abuja Heritage Building Renovation',
    category: 'renovation',
    status: 'completed',
    location: 'Maitama, Abuja',
    year: '2022',
    size: '1200 sqm',
    value: 450000000,
    description: 'Complete renovation of a historic government building into modern offices while preserving architectural heritage.',
    highlights: ['Heritage preservation', 'Modern HVAC', 'Accessibility upgrades', 'Smart lighting', 'LEED certified'],
    image: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800',
    images: [
      { id: 4, url: 'https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?w=800', altText: 'Renovated facade', isCover: true },
    ],
    createdAt: '2022-03-01T10:00:00Z',
    updatedAt: '2022-11-30T10:00:00Z',
  },
  {
    id: 4,
    slug: 'port-harcourt-mixed-use',
    title: 'Port Harcourt Mixed-Use Development',
    category: 'mixed_use',
    status: 'planning',
    location: 'Port Harcourt, Rivers',
    year: '2025',
    size: '8000 sqm',
    value: 2500000000,
    description: 'A planned mixed-use development with residential towers, retail podium, and office block. Currently in design and approval stage.',
    highlights: ['Residential + commercial', 'Green building design', 'Transit-oriented', 'Public plaza', 'Energy efficient'],
    image: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800',
    images: [
      { id: 5, url: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800', altText: 'Architectural render', isCover: true },
    ],
    createdAt: '2024-06-01T10:00:00Z',
    updatedAt: '2024-06-01T10:00:00Z',
  },
];

const mockSettings = [
  { key: 'whatsapp_number', value: '2349017017156' },
  { key: 'phone_number', value: '+234 901 701 7156' },
  { key: 'email', value: 'info@otitech.com' },
  { key: 'address', value: '123 OTI-TECH Avenue, Victoria Island, Lagos' },
];

// Health check
app.get(`${API_PREFIX}/health/ready`, (req, res) => {
  res.json({ success: true, status: 'ready', timestamp: new Date().toISOString() });
});

// Properties
app.get(`${API_PREFIX}/properties`, (req, res) => {
  let results = [...mockProperties];
  const { type, purpose, status, location, minPrice, maxPrice, page = 1, limit = 10 } = req.query;

  if (type) results = results.filter(p => p.type === type);
  if (purpose) results = results.filter(p => p.purpose === purpose);
  if (status) results = results.filter(p => p.status === status);
  if (location) results = results.filter(p => p.location.toLowerCase().includes(location.toLowerCase()));
  if (minPrice) results = results.filter(p => Number(p.price) >= Number(minPrice));
  if (maxPrice) results = results.filter(p => Number(p.price) <= Number(maxPrice));

  const start = (Number(page) - 1) * Number(limit);
  const end = start + Number(limit);
  const paginated = results.slice(start, end);

  res.json({
    success: true,
    data: paginated,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: results.length,
      totalPages: Math.ceil(results.length / Number(limit)),
    },
  });
});

app.get(`${API_PREFIX}/properties/:slug`, (req, res) => {
  const property = mockProperties.find(p => p.slug === req.params.slug);
  if (!property) {
    return res.status(404).json({ success: false, error: { message: 'Property not found' } });
  }
  res.json({ success: true, data: property });
});

// Projects
app.get(`${API_PREFIX}/projects`, (req, res) => {
  let results = [...mockProjects];
  const { category, status, location, year, page = 1, limit = 10 } = req.query;

  if (category) results = results.filter(p => p.category === category);
  if (status) results = results.filter(p => p.status === status);
  if (location) results = results.filter(p => p.location.toLowerCase().includes(location.toLowerCase()));
  if (year) results = results.filter(p => p.year === year);

  const start = (Number(page) - 1) * Number(limit);
  const end = start + Number(limit);
  const paginated = results.slice(start, end);

  res.json({
    success: true,
    data: paginated,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total: results.length,
      totalPages: Math.ceil(results.length / Number(limit)),
    },
  });
});

app.get(`${API_PREFIX}/projects/:slug`, (req, res) => {
  const project = mockProjects.find(p => p.slug === req.params.slug);
  if (!project) {
    return res.status(404).json({ success: false, error: { message: 'Project not found' } });
  }
  res.json({ success: true, data: project });
});

// Enquiries
app.post(`${API_PREFIX}/enquiries`, (req, res) => {
  const { name, phone, email, service, message, propertyId, projectId } = req.body;
  if (!name || !phone || !service || !message) {
    return res.status(400).json({ success: false, error: { message: 'Missing required fields' } });
  }
  const enquiry = {
    id: Date.now(),
    name,
    phone,
    email,
    service,
    message,
    propertyId: propertyId ? Number(propertyId) : null,
    projectId: projectId ? Number(projectId) : null,
    status: 'new',
    createdAt: new Date().toISOString(),
  };
  console.log('New enquiry:', enquiry);
  res.json({ success: true, data: enquiry });
});

// Settings
app.get(`${API_PREFIX}/settings/public`, (req, res) => {
  res.json({ success: true, data: mockSettings });
});

// Root
app.get('/', (req, res) => {
  res.json({ name: 'OTI-TECH Staging API', version: '1.0.0', status: 'running' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Staging API running on http://0.0.0.0:${PORT}${API_PREFIX}`);
  console.log(`Health check: http://0.0.0.0:${PORT}${API_PREFIX}/health/ready`);
});