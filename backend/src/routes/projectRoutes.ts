import { Router } from 'express';
import {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  createColumn,
  updateColumn,
  reorderColumns,
  deleteColumn,
} from '../controllers/projectController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Projects
router.get('/', listProjects);
router.post('/', createProject);
router.get('/:id', getProject);
router.patch('/:id', updateProject);
router.delete('/:id', deleteProject);

// Project Columns
router.post('/:projectId/columns', createColumn);
router.patch('/columns/:columnId', updateColumn);
router.post('/:projectId/columns/reorder', reorderColumns);
router.delete('/columns/:columnId', deleteColumn);

export default router;
