import { Router } from 'express'
import { getWorkers, createWorker, updateWorker, deleteWorker } from '../controllers/workers.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()
router.use(authenticate)
router.get('/', getWorkers)
router.post('/', createWorker)
router.put('/:id', updateWorker)
router.delete('/:id', deleteWorker)
export default router
