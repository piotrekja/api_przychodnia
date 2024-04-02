const express = require('express');
const { createEmployee, updateEmployee } = require('../controllers/employeeControllers')
const auth = require('../middleware/auth');
const { fileUpload } = require('../middleware/file-upload');

const router = express.Router();


router.post('/', fileUpload.single('image'), auth, createEmployee)
router.patch('/:id', fileUpload.single('image'), auth, updateEmployee)

module.exports = router 