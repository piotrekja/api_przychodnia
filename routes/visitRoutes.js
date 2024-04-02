const express = require('express');
const { createVisit, getVisits, updateVisit, deleteVisits } = require('../controllers/visitControllers')
const auth = require('../middleware/auth')

const router = express.Router();


router.post('/', auth, createVisit)
router.get('/', auth, getVisits)
router.delete('/', auth, deleteVisits)
router.patch('/:id', auth, updateVisit)

module.exports = router 