import { Router } from 'express'
import { getArticles, getArticle, createArticle, updateArticle, publishArticle, deleteArticle } from '../controllers/knowledge.controller'
import { authenticate, requireRole } from '../middleware/auth.middleware'

const router = Router()

router.use(authenticate)
router.get('/',              getArticles)
router.get('/:id',           getArticle)
router.post('/',             createArticle)
router.put('/:id',           updateArticle)
router.patch('/:id/publish', requireRole('SUPER_ADMIN', 'ADMIN', 'USER'), publishArticle)
router.delete('/:id',        requireRole('SUPER_ADMIN', 'ADMIN'), deleteArticle)

export default router
