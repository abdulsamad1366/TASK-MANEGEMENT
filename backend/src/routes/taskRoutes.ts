import { Router } from 'express';
import {
  listTasks,
  getTask,
  getMyTasks,
  createTask,
  updateTask,
  moveTask,
  deleteTask,
  bulkUpdateTasks,
  addSubtask,
  toggleSubtask,
  deleteSubtask,
  addDependency,
  removeDependency,
} from '../controllers/taskController';
import { createComment, deleteComment } from '../controllers/commentController';
import { uploadAttachment, deleteAttachment, uploadMedia } from '../controllers/attachmentController';
import { upload } from '../services/storage';
import { authenticate } from '../middleware/auth';

const router = Router();

router.use(authenticate);

// Standalone media upload (for chat images, task attachments, cover photos)
router.post('/media', upload.single('file'), uploadMedia);

// Tasks CRUD & Move
router.get('/', listTasks);
router.get('/my-tasks', getMyTasks);
router.post('/', createTask);
router.post('/bulk', bulkUpdateTasks);
router.get('/:id', getTask);
router.patch('/:id', updateTask);
router.patch('/:id/move', moveTask);
router.delete('/:id', deleteTask);

// Subtasks
router.post('/:taskId/subtasks', addSubtask);
router.patch('/subtasks/:subtaskId/toggle', toggleSubtask);
router.delete('/subtasks/:subtaskId', deleteSubtask);

// Dependencies
router.post('/:taskId/dependencies', addDependency);
router.delete('/:taskId/dependencies/:dependsOnTaskId', removeDependency);

// Comments
router.post('/:taskId/comments', createComment);
router.delete('/comments/:commentId', deleteComment);

// Attachments
router.post('/:taskId/attachments', upload.single('file'), uploadAttachment);
router.delete('/attachments/:attachmentId', deleteAttachment);

export default router;
