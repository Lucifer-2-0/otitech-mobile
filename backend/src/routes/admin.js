import { Router } from 'express';
import { propertyModel, projectModel, enquiryModel, userModel } from '../models/index.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = Router();

router.get('/summary', authenticate, authorize('admin', 'staff', 'viewer', 'moderator'), async (req, res, next) => {
  try {
    const canSeeEnquiries = ['admin', 'moderator'].includes(req.user.role);
    const enquiryScope = req.user.role === 'moderator' ? { assignedTo: req.user.id } : {};
    const [properties, publishedProperties, pendingReview, projects, publishedProjects, enquiries, newEnquiries, activeEnquiries, users] = await Promise.all([
      propertyModel.getAdminTotalCount(),
      propertyModel.getTotalCount(),
      propertyModel.getAdminTotalCount({ reviewStatus: 'pending' }),
      projectModel.getAdminTotalCount(),
      projectModel.getTotalCount(),
      canSeeEnquiries ? enquiryModel.getTotalCount(enquiryScope) : 0,
      canSeeEnquiries ? enquiryModel.getTotalCount({ ...enquiryScope, status: 'new' }) : 0,
      canSeeEnquiries ? enquiryModel.getTotalCount({ ...enquiryScope, status: 'in_progress' }) : 0,
      userModel.count(),
    ]);

    res.json({
      success: true,
      data: {
        properties: { total: properties, published: publishedProperties, pendingReview },
        projects: { total: projects, published: publishedProjects },
        ...(canSeeEnquiries ? { enquiries: { total: enquiries, new: newEnquiries, inProgress: activeEnquiries } } : {}),
        users: { total: users },
      },
    });
  } catch (err) {
    next(err);
  }
});

export const adminRoutes = router;
