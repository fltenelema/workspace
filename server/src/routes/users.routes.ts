import { Router } from 'express'
import {
  getUsers, getUser, createUser,
  updateUser, deleteUser, toggleUserStatus, getStats,
} from '../controllers/users.controller'
import { authenticate, requireRole } from '../middleware/auth.middleware'

const router = Router()

router.use(authenticate)

router.get('/stats', requireRole('SUPER_ADMIN', 'ADMIN'), getStats)
router.get('/', requireRole('SUPER_ADMIN', 'ADMIN'), getUsers)
router.post('/', requireRole('SUPER_ADMIN', 'ADMIN'), createUser)
router.get('/:id', getUser)
router.put('/:id', updateUser)
router.delete('/:id', requireRole('SUPER_ADMIN'), deleteUser)
router.patch('/:id/toggle', requireRole('SUPER_ADMIN', 'ADMIN'), toggleUserStatus)

export default router
