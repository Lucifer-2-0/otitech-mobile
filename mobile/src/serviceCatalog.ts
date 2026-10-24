import type { EnquiryInput } from './api';

export type MobileService = {
  number: string;
  title: string;
  description: string;
  features: string[];
  service: EnquiryInput['service'];
  action: string;
};

// Keep this public-facing copy aligned with the overview cards in pages/services.html.
export const serviceOptions: MobileService[] = [
  {
    number: '01',
    title: 'Building Design',
    description: 'Thoughtful residential and commercial concepts developed around your needs, site context and budget.',
    features: ['Residential and commercial designs', 'Floor plans and architectural drawings', '3D concepts and visual presentations', 'Planning and regulatory guidance'],
    service: 'building_design',
    action: 'Discuss building design',
  },
  {
    number: '02',
    title: 'Building Construction',
    description: 'Practical project execution with attention to quality, detail and delivery, from groundwork to handover.',
    features: ['Project execution and site management', 'Quality control and workmanship', 'Cost control and scheduling', 'Renovation and refurbishment'],
    service: 'construction',
    action: 'Discuss construction',
  },
  {
    number: '03',
    title: 'Real Estate',
    description: 'Explore land, homes, apartments and commercial opportunities with practical guidance at every step.',
    features: ['Property search and acquisition support', 'Sales and leasing representation', 'Market analysis and due diligence'],
    service: 'real_estate',
    action: 'Ask about real estate',
  },
  {
    number: '04',
    title: 'Project Support',
    description: 'Stay connected with our team from your first enquiry through design, construction and final decisions.',
    features: ['Brief clarification and feasibility', 'Design coordination and value engineering', 'Construction monitoring and reporting', 'Handover and post-completion support'],
    service: 'project_support',
    action: 'Discuss project support',
  },
];
