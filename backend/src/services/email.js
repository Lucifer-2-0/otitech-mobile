import nodemailer from 'nodemailer';
import config from '../config/index.js';
import logger from '../config/logger.js';

let transporter = null;

const getTransporter = () => {
  if (!transporter && config.email.host && config.email.user && config.email.pass) {
    transporter = nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.port === 465,
      auth: {
        user: config.email.user,
        pass: config.email.pass,
      },
    });
  }
  return transporter;
};

export const sendEnquiryNotification = async (enquiry) => {
  const t = getTransporter();
  if (!t) {
    logger.warn('Email transporter not configured, skipping notification');
    return;
  }

  const serviceLabels = {
    building_design: 'Building Design',
    construction: 'Building Construction',
    real_estate: 'Real Estate',
    project_support: 'Project Support',
  };

  const html = `
    <h2>New Enquiry Received</h2>
    <p><strong>Name:</strong> ${enquiry.name}</p>
    <p><strong>Phone:</strong> ${enquiry.phone}</p>
    <p><strong>Email:</strong> ${enquiry.email || 'Not provided'}</p>
    <p><strong>Service:</strong> ${serviceLabels[enquiry.service] || enquiry.service}</p>
    <p><strong>Message:</strong></p>
    <p>${enquiry.message.replace(/\n/g, '<br>')}</p>
    <hr>
    <p><small>Enquiry ID: ${enquiry.id} | Received: ${new Date(enquiry.createdAt).toLocaleString()}</small></p>
  `;

  await t.sendMail({
    from: config.email.from,
    to: config.email.from,
    subject: `New Enquiry: ${serviceLabels[enquiry.service] || enquiry.service} - ${enquiry.name}`,
    html,
  });
};

export const sendContactEmail = async (to, subject, html) => {
  const t = getTransporter();
  if (!t) {
    logger.warn('Email transporter not configured');
    return;
  }

  await t.sendMail({
    from: config.email.from,
    to,
    subject,
    html,
  });
};

export default { sendEnquiryNotification, sendContactEmail };
