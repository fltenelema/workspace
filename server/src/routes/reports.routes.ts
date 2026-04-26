import { Router } from 'express'
import { getCycleReport, getPeriodReport, getCropPerformance, getWorkerPerformance } from '../controllers/reports.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()
router.use(authenticate)
router.get('/cycle/:id', getCycleReport)
router.get('/period', getPeriodReport)
router.get('/crops', getCropPerformance)
router.get('/workers', getWorkerPerformance)
export default router
