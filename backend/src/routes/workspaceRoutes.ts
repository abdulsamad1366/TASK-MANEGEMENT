import { Router } from 'express';
import {
  listWorkspaces,
  getWorkspace,
  createWorkspace,
  updateWorkspace,
  inviteMember,
  updateMemberRole,
  removeMember,
} from '../controllers/workspaceController';
import { authenticate } from '../middleware/auth';
import { requireWorkspaceRole } from '../middleware/rbac';

const router = Router();

router.use(authenticate);

router.get('/', listWorkspaces);
router.post('/', createWorkspace);
router.get('/:id', getWorkspace);
router.patch('/:id', requireWorkspaceRole(['ADMIN']), updateWorkspace);
router.post('/:id/invite', requireWorkspaceRole(['ADMIN', 'MANAGER']), inviteMember);
router.patch('/:id/members/:memberId', requireWorkspaceRole(['ADMIN']), updateMemberRole);
router.delete('/:id/members/:memberId', requireWorkspaceRole(['ADMIN']), removeMember);

export default router;
