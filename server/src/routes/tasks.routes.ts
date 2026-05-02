import { Router } from 'express'
import { getTasks, getTask, createTask, updateTask, deleteTask } from '../controllers/tasks.controller'
import { authenticate, requireRole } from '../middleware/auth.middleware'

const router = Router()

router.use(authenticate)
router.get('/',    getTasks)
router.get('/:id', getTask)
router.post('/', requireRole('SUPER_ADMIN', 'ADMIN', 'USER'), createTask)
router.put('/:id', updateTask)
router.delete('/:id', requireRole('SUPER_ADMIN', 'ADMIN'), deleteTask)

export default router
