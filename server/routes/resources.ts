import { Router } from 'express';
import * as ResourcesController from '../controllers/resources.js';
import { requireApiAuth } from '../middleware/auth.js';
import { upload } from '../utils/upload.js';

const router = Router();

router.get('/bootstrap', requireApiAuth, ResourcesController.bootstrap);

router.get('/folders', requireApiAuth, ResourcesController.getFolders);
router.post('/folders', requireApiAuth, ResourcesController.createFolder);
router.delete('/folders/:id', requireApiAuth, ResourcesController.deleteFolder);

router.get('/resources', requireApiAuth, ResourcesController.getResources);
router.post('/resources', requireApiAuth, upload.single('file'), ResourcesController.createResource);
router.patch('/resources/:id', requireApiAuth, ResourcesController.updateResource);
router.delete('/resources/:id', requireApiAuth, ResourcesController.deleteResource);

export default router;
