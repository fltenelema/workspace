import { Router } from 'express'
import { getWorkers, createWorker, updateWorker, deleteWorker, getWorkerStats } from '../controllers/workers.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()
router.use(authenticate)
router.get('/', getWorkers)
router.post('/', createWorker)
router.get('/:id/stats', getWorkerStats)
router.put('/:id', updateWorker)
router.delete('/:id', deleteWorker)
export default router
