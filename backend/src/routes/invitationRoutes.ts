import { Router } from 'express';
import { getInvitationByToken, acceptInvitation } from '../controllers/invitationController';
import { authenticate } from '../middleware/auth';

const router = Router();

// Public route to view/verify invite token
router.get('/:token', getInvitationByToken);

// Authenticated route to accept invite
router.post('/:token/accept', authenticate, acceptInvitation);

export default router;
