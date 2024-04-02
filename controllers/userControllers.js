const User = require('../models/userModel')
const Employee = require('../models/employeeModel')
const roleTypes = require('../utils/roleTypes')
const { allowedFields } = require('../utils/allowedFields')
const { default: mongoose } = require('mongoose')
const { del, list } = require('@vercel/blob')
require('dotenv/config')

exports.createUser = async (req, res) => {
  if (!allowedFields(req, 'name', 'surname', 'email', 'password'))
    return res.status(400).send({ error: 'Invalid data!' })
  try {
    const user = new User({ ...req.body, role: roleTypes.admin })
    const token = await user.generateAuthToken()
    const { role } = user
    res.send({ role, token })
  } catch (e) {
    res.status(400).send({ error: e.message })
  }
}

exports.loginUser = async (req, res) => {
  try {
    const user = await User.findByCredentials(req.body.email, req.body.password)
    const token = await user.generateAuthToken()
    const { role, id, temppassword } = user
    res.send({ role, token, id, temppassword })
  } catch (e) {
    res.status(400).send({ error: e.message })
  }
}

exports.logoutUser = async (req, res) => {
  try {
    req.user.tokens = req.user.tokens.filter((token) => {
      return token.token !== req.token
    })
    await req.user.save()
    res.send({ message: 'Successfully logged out' })
  } catch (e) {
    res.status(500).send({ error: e.message })
  }
}

exports.logoutAllUser = async (req, res) => {
  try {
    req.user.tokens = []
    await req.user.save()
    res.send({ message: 'Successfully logged out from all devices' })
  } catch (e) {
    res.status(500).send({ error: e.message })
  }
}

exports.getEmployees = async (req, res) => {
  try {
    const isAdmin = req.user?.role === roleTypes.admin
    const populating = { path: 'virtualEmployees', select: "image title specialization activities schedule extras -_id -employeeId" }
    const users = await User.find({ online: isAdmin ? { $in: ['', undefined, 'tak', 'nie'] } : 'tak', role: { $in: [roleTypes.admin, roleTypes.staff] } }, isAdmin ? 'email name surname online id' : 'name surname online id').populate(populating)
    let me = []
    if (req.user && !isAdmin && req.user?.online !== 'tak') me = await User.find({ email: req.user.email }, 'name surname online id').populate(populating)
    const joined = [...me, ...users]
    const usersTransformed = joined.map(user => {
      const id = user.id
      const us = { ...user }['_doc']
      delete us._id
      const virt = { ...user.virtualEmployees[0] }['_doc']
      return { ...us, ...virt, id }
    })
    res.send(usersTransformed)
  } catch (e) {
    res.status(500).send({ error: e.message })
  }
}

exports.getPatients = async (req, res) => {
  try {
    const users = await User.find({ appointments:true, role: {$in:[roleTypes.admin,roleTypes.staff]} }, 'name id').populate({ path: 'virtualEmployees', select: "image title spec highlights -_id -employeeId" })
    res.send(users)
  } catch (e) {
    res.status(500).send({ error: e.message })
  }
}

exports.getProfile = (req, res) => {
  console.log(req.user)
  res.send(req.user)
}

exports.getEmployee = async (req, res) => {
  try {
    const user = await User.findOne({ _id: req.params.id, appointments: true }, 'name').populate({ path: 'virtualEmployees', select: "image title spec calendar -_id -employeeId" })
    if (!user) {
      return res.status(404).send({ error: "No such user" })
    }
    const us = { ...user }['_doc']
    delete us._id
    const virt = { ...user.virtualEmployees[0] }['_doc']
    const userTransformed = { ...us, ...virt }
    res.send(userTransformed)
  } catch (e) {
    res.status(500).send({ error: e.message })
  }
}

exports.updateProfile = async (req, res) => {
  if (!allowedFields(req, 'name', 'password'))
    return res.status(400).send({ error: 'Invalid data!' })
  try {
    updates.forEach((update) => req.user[update] = req.body[update])
    await req.user.save()
    res.send(req.user)
  } catch (e) {
    res.status(400).send({ error: e.message })
  }
}

exports.deleteProfile = async (req, res) => {
  const isAdmin = req.user.role === roleTypes.admin
  try {
    const deleteId = isAdmin && req.user.id !== req.params.id
      ? req.params.id : !isAdmin && req.params.id === "me"
        ? req.user.id : null
    if (!deleteId) return res.status(400).send({ error: "Niewłaściwa operacja" })
    const session = await mongoose.startSession();
    session.startTransaction();
    const user = await User.findByIdAndDelete(deleteId).session(session)
    const { image } = await Employee.findOneAndDelete({ employeeId: deleteId }).session(session)
    if (!user) return res.status(404).send({ error: "No such user" })
    if (image) await del(image)
    await session.commitTransaction();
    res.send({ message: 'deleted' })
  } catch (e) {
    res.status(500).send({ error: e.message })
  }
}
