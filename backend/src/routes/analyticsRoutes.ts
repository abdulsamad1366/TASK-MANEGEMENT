import { Router } from 'express';
import { getDashboardSummary, getProjectBurndown } from '../controllers/analyticsController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

router.get('/dashboard', getDashboardSummary);
router.get('/projects/:projectId/burndown', getProjectBurndown);

export default router;
