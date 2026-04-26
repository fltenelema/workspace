import { Router } from 'express'
import { getExpenses, createExpense, updateExpense, deleteExpense } from '../controllers/expenses.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()
router.use(authenticate)
router.get('/', getExpenses)
router.post('/', createExpense)
router.put('/:id', updateExpense)
router.delete('/:id', deleteExpense)
export default router
