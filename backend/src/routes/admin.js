import { Router } from 'express';
import { propertyModel, projectModel, enquiryModel, userModel } from '../models/index.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/summary', authenticate, authorize('admin', 'staff', 'viewer'), async (req, res, next) => {
  try {
    const [properties, publishedProperties, projects, publishedProjects, enquiries, newEnquiries, activeEnquiries, users] = await Promise.all([
      propertyModel.getAdminTotalCount(),
      propertyModel.getTotalCount(),
      projectModel.getAdminTotalCount(),
      projectModel.getTotalCount(),
      enquiryModel.getTotalCount(),
      enquiryModel.getTotalCount({ status: 'new' }),
      enquiryModel.getTotalCount({ status: 'in_progress' }),
      userModel.count(),
    ]);

    res.json({
      success: true,
      data: {
        properties: { total: properties, published: publishedProperties },
        projects: { total: projects, published: publishedProjects },
        enquiries: { total: enquiries, new: newEnquiries, inProgress: activeEnquiries },
        users: { total: users },
      },
    });
  } catch (err) {
    next(err);
  }
});

export const adminRoutes = router;
