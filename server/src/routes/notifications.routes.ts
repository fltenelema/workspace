import { Router } from 'express'
import { getNotifications } from '../controllers/notifications.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()
router.use(authenticate)
router.get('/', getNotifications)
export default router
