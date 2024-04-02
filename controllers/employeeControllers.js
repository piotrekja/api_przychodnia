const Employee = require('../models/employeeModel')
const roleTypes = require('../utils/roleTypes')
const User = require('../models/userModel')
const { default: mongoose } = require('mongoose')
const fs = require('fs').promises
const { put, del } = require("@vercel/blob")
const { Blob } = require("buffer");
const { createAccountEmail } = require('../utils/sendEmail')

exports.createEmployee = async (req, res) => {
  const { email, name, surname, online, title, specialization, activities, imagename, extras } = req.body
  let imgUrl
  const isAdmin = req.user.role === roleTypes.admin
  if (!isAdmin) return res.status(403).send({ error: 'Available for admin' })
  try {
    const password = Math.random().toString(36).slice(-5)
    if (online === 'tak' && (!specialization || !activities)) return res.status(400).send({ error: 'Invalid data' })
    if (req.file?.buffer) {
      const blob = new Blob([req.file?.buffer]);
      const { url } = await put(imagename, blob, { access: 'public', token: process.env.BLOB_READ_WRITE_TOKEN });
      imgUrl = url
    }
    const user = new User({ email, role: 'staff', password, name, surname, online: online || undefined, temppassword: password })
    const parsed = extras === 'undefined' ? null : extras
    const employee = new Employee({ employeeId: user.id, title, specialization, activities, image: imgUrl, extras: JSON.parse(parsed) })
    const session = await mongoose.startSession();
    session.startTransaction();
    await user.save({ session });
    await employee.save({ session });
    const emailError = await createAccountEmail(res, email, password)
    if (emailError?.status === 'problem') { return res.status(500).send({ error: 'problem sendGrid' }) }
    await session.commitTransaction();
    res.send({ ...employee['_doc'], ...user['_doc'] })
  } catch (e) {
    try {
      await del(imgUrl)
    } catch (err) {
      return res.status(500).send({ error: err.message })
    }
    res.status(500).send({ error: e.message })
  }
}

exports.updateEmployee = async (req, res) => {
  const userFields = ['name', 'surname', 'role', 'password', 'online']
  const descriptionFields = ['title', 'imagename', 'image', 'specialization', 'activities', 'schedule', 'extras']
  let imgUrl
  const allowedFields = [...userFields, ...descriptionFields]
  const updates = Object.keys(req.body)
  const areAllowedFields = updates.every(el => allowedFields.includes(el))
  if (!areAllowedFields) return res.status(400).send({ error: 'Invalid data.' })
  const isUserUpdate = userFields.some(el => updates.includes(el))
  const isDescriptionUpdate = descriptionFields.some(el => updates.includes(el) || req.file?.buffer)
  const { role: currentRole } = req.user
  const { role: newRole } = req.body
  const isAdmin = currentRole !== roleTypes.superAdmin
  const updatedId = currentRole === roleTypes.admin && req.params.id !== "me" ? req.params.id : req.user._id
  if (!isAdmin && req.params.id !== req.user._id) {
    return res.status(403).send({ error: "Only for admin" })
  }
  if (newRole && !isAdmin) {
    return res.status(403).send({ error: "Only for superAdmin" })
  }
  try {
    let user, employee
    if (isUserUpdate) user = await User.findById(updatedId)
    if (isDescriptionUpdate) employee = await Employee.findOne({ employeeId: updatedId })

    if (req.file?.buffer) {
      const blob = new Blob([req.file.buffer]);
      const { url } = await put(req.body.imagename, blob, { access: 'public', token: process.env.BLOB_READ_WRITE_TOKEN });
      imgUrl = url
      if (employee.image) await del(employee.image)
    }
    if ((isDescriptionUpdate && !employee && !isAdmin) || (isUserUpdate && !user)) {
      return res.status(404).send({ error: "No such employee exists" })
    }
    updates.forEach((update) => {
      if (userFields.includes(update)) user[update] = req.body[update]
      else if (descriptionFields.includes(update)) {
        if (!['extras', 'schedule'].includes(update)) employee[update] = req.body[update]
        else {
          const parsed = req.body[update] === 'undefined' ? null : req.body[update]
          employee[update] = JSON.parse(parsed)
        }
      }
    })
    if (req.file) employee['image'] = imgUrl
    if (!isDescriptionUpdate) await user.save()
    else if (!isUserUpdate) await employee.save()
    else if (isUserUpdate && isDescriptionUpdate) {
      const session = await mongoose.startSession();
      session.startTransaction();
      await user.save({ session });
      await employee.save({ session });
      await session.commitTransaction();
    }
    res.send({ message: 'done' })
  } catch (e) {
    try {
      if (imgUrl) await del(imgUrl)
    } catch (err) {
      return res.status(500).send({ error: err.message })
    }
    res.status(500).send({ error: e.message })
  }
}

