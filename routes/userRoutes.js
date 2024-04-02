const express = require('express');
const {createUser,loginUser,getEmployees,getEmployee,deleteProfile,getProfile,logoutUser,logoutAllUser,updateProfile,getPatients} = require('../controllers/userControllers')
const auth = require('../middleware/auth')

const router = express.Router();


router.post('/',createUser)
router.post('/login',loginUser)
router.post('/logout',auth,logoutUser)
router.post('/logoutall',auth,logoutAllUser)
router.get('/me',auth,getProfile)
router.get('/',getEmployees)
router.get('/staff',auth,getEmployees)
router.get('/patients',auth,getPatients)
router.get('/:id',getEmployee)
router.patch('/me',auth,updateProfile)
router.delete('/:id',auth,deleteProfile)


module.exports = router