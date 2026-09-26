import { Router } from 'express';
import {
  getWorkspaceHierarchy,
  createSpace,
  updateSpace,
  deleteSpace,
  createProject,
  createTaskList,
  getTaskList,
  updateTaskList,
  deleteTaskList,
  createListColumn,
  updateListColumn,
  deleteListColumn,
} from '../controllers/hierarchyController';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// 1. Workspace Hierarchy Tree
router.get('/workspaces/:workspaceId/hierarchy', getWorkspaceHierarchy);

// 2. Spaces
router.post('/workspaces/:workspaceId/spaces', createSpace);
router.patch('/spaces/:spaceId', updateSpace);
router.delete('/spaces/:spaceId', deleteSpace);

// 3. Projects within Space
router.post('/spaces/:spaceId/projects', createProject);

// 4. TaskLists within Project
router.post('/projects/:projectId/lists', createTaskList);
router.get('/lists/:listId', getTaskList);
router.patch('/lists/:listId', updateTaskList);
router.delete('/lists/:listId', deleteTaskList);

// 5. List Custom Status Columns
router.post('/lists/:listId/columns', createListColumn);
router.patch('/columns/:columnId', updateListColumn);
router.delete('/columns/:columnId', deleteListColumn);

export default router;
