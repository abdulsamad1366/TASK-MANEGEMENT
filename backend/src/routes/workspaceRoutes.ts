import { Router } from 'express';
import {
  listWorkspaces,
  getWorkspace,
  createWorkspace,
  joinWorkspace,
  updateWorkspace,
  inviteMember,
  batchInviteMembers,
  revokeInvitation,
  regenerateInviteCode,
  updateMemberRole,
  removeMember,
  getJoinInfo,
  createJoinRequest,
  listJoinRequests,
  approveJoinRequest,
  denyJoinRequest,
} from '../controllers/workspaceController';
import { authenticate } from '../middleware/auth';
import { requireWorkspaceRole } from '../middleware/rbac';

const router = Router();

// Public workspace preview for join links (no auth required)
router.get('/join-info/:slug', getJoinInfo);
router.get('/join/:slug/info', getJoinInfo);

// All routes below require authentication
router.use(authenticate);

// Join request flow for logged in user
router.post('/join/:slug/request', createJoinRequest);
router.post('/join-request/:slug', createJoinRequest);

router.get('/', listWorkspaces);
router.post('/', createWorkspace);
router.post('/join', joinWorkspace);
router.get('/:id', getWorkspace);
router.patch('/:id', requireWorkspaceRole(['ADMIN']), updateWorkspace);
router.post('/:id/invite', requireWorkspaceRole(['ADMIN', 'MANAGER']), inviteMember);
router.post('/:id/invites/batch', requireWorkspaceRole(['ADMIN', 'MANAGER']), batchInviteMembers);
router.delete('/:id/invites/:inviteId', requireWorkspaceRole(['ADMIN', 'MANAGER']), revokeInvitation);
router.post('/:id/join-link/regenerate', requireWorkspaceRole(['ADMIN']), regenerateInviteCode);
router.patch('/:id/members/:memberId', requireWorkspaceRole(['ADMIN']), updateMemberRole);
router.delete('/:id/members/:memberId', requireWorkspaceRole(['ADMIN']), removeMember);

// Admin / Manager Join Request Actions
router.get('/:id/join-requests', requireWorkspaceRole(['ADMIN', 'MANAGER']), listJoinRequests);
router.post('/:id/join-requests/:requestId/approve', requireWorkspaceRole(['ADMIN', 'MANAGER']), approveJoinRequest);
router.post('/:id/join-requests/:requestId/deny', requireWorkspaceRole(['ADMIN', 'MANAGER']), denyJoinRequest);

export default router;
