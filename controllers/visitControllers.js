const Employee = require('../models/employeeModel')
const User = require('../models/userModel')
const roleTypes = require('../utils/roleTypes')
const Visit = require('../models/visitModel')
const { default: mongoose } = require('mongoose')

exports.createVisit = async (req, res) => {
  const isPatient = req.user.role === roleTypes.patient
  if (!isPatient) return res.status(403).send({ error: 'Available for patient' })
  const { staffId, time, description, paid } = req.body
  try {
    const visit = new Visit({ patientId: req.user.id, staffId, time, description, paid })
    let employee = await Employee.findOne({ employeeId: visit.staffId })
    if (!employee) return res.status(404).send({ error: "Lekarz prowadzący niedostępny" })
    const modyfiedSet = employee.schedule[time[0]]
    const copyModyfiedSet = [...modyfiedSet]
    modyfiedSet.forEach((set, i) => {
      if (time[1] === set[0])
        if (set.length > 2) return res.status(403).send({ error: 'Termin zajęty' })
        else copyModyfiedSet[i] = set.concat([visit.id])
    })
    employee.schedule = { ...employee.schedule, [time[0]]: copyModyfiedSet }
    const session = await mongoose.startSession();
    session.startTransaction();
    await visit.save({ session })
    await employee.save({ session })
    await session.commitTransaction();
    res.send({ visitId: visit.id })
  } catch (e) {
    res.status(500).send({ error: e.message })
  }
}

exports.getVisits = async (req, res) => {
  const isAdmin = req.user.role === roleTypes.admin
  if (!isAdmin) return res.status(403).send({ error: 'Available for admin' })
  try {
    const visits = await Visit.find({ '_id': { $in: req.header('payload').split(',') } })
    const patientIds = visits.map((el) => el.patientId)
    const patients = await User.find({ '_id': { $in: Array.from(new Set(patientIds)) } })
    const visitsRaw = patientIds.map((id, i) => {
      const visit = {}
      visit.id = visits[i].id
      visit.staffId = visits[i].staffId
      visit.description = visits[i].description
      visit.time = visits[i].time
      const patient = patients.find(el => el.id == id)
      visit.name = patient.name
      visit.surname = patient.surname
      visit.phone = patient.phone
      visit.email = patient.email
      return visit
    })
    const visitsReady = [...visitsRaw].reverse()
    res.send({ visitsReady })
  } catch (e) {
    res.status(500).send({ error: e.message })
  }
}

exports.deleteVisits = async (req, res) => {
  const isAdmin = req.user.role === roleTypes.admin
  if (!isAdmin) return res.status(403).send({ error: 'Available for admin' })
  const { employeeId, day, visitsIds, visitsHours } = req.body
  try {
    let employee = await Employee.findOne({ employeeId })
    if (!employee) return res.status(404).send({ error: "Lekarz prowadzący niedostępny" })
    const modyfiedSet = employee.schedule[day]
    const copyModyfiedSet = [...modyfiedSet]
    modyfiedSet.forEach((set, i) => {
      if (visitsHours.includes(set[0]))
        if (set.length !== 3) return res.status(403).send({ error: 'Rozbieżność wizyt' })
        else { copyModyfiedSet[i] = set.filter((_, i) => i !== 2) }
    })
    employee.schedule = { ...employee.schedule, [day]: copyModyfiedSet }
    const session = await mongoose.startSession();
    session.startTransaction();
    await employee.save({ session })
    await Visit.deleteMany({ '_id': { $in: visitsIds } }).session(session)
    await session.commitTransaction();
    res.send({ deleted: req.body })
  } catch (e) {
    res.status(500).send({ error: e.message })
  }
}

exports.updateVisit = async (req, res) => {
  const isAdmin = req.user.role === roleTypes.admin
  if (!isAdmin) return res.status(403).send({ error: 'Available for admin' })
  const updates = Object.keys(req.body)
  const allowedFields = ['description', 'newTime', 'oldTime', 'newStaffId', 'staffId']
  const areAllowedFields = updates.every(el => allowedFields.includes(el))
  if (!areAllowedFields) return res.status(400).send({ error: 'Invalid data.' })
  const { description, newTime, oldTime, newStaffId, staffId } = req.body
  const isStaffUpdate = ['newTime', 'newStaffId'].some(el => updates.includes(el))
  try {
    let employees
    const visit = await Visit.findById(req.params.id)
    const { _id } = visit
    if (!visit) return res.status(404).send({ error: "Nie ma takiej wizyty" })
    if (isStaffUpdate) {
      employees = await Employee.find({ employeeId: { $in: [staffId, newStaffId] } })
      if (!newStaffId && !employees.length) return res.status(404).send({ error: "Lekarz prowadzący niedostępny" })
      if (newStaffId && employees.length !== 2) return res.status(404).send({ error: "Nowy lekarz prowadzący niedostępny" })
    }
    const oldEmployee = employees.find(employee => employee.employeeId.toString() === staffId)
    const newEmployee = employees.find(employee => employee.employeeId.toString() === newStaffId)
    updates.forEach((update) => {
      if (update === 'description') visit[update] = req.body[update]
      else if (update === 'newStaffId' && newStaffId) visit.staffId = req.body[update]
      else if (update === 'newTime') {
        visit['time'] = req.body[update]
        const oldScheduleCopy = {...oldEmployee.schedule}
        let newScheduleCopy
        if (!newStaffId) newScheduleCopy = {...oldEmployee.schedule}
        else newScheduleCopy = {...newEmployee.schedule}
        oldScheduleCopy[oldTime[0]].forEach((el) => {
          if (el[0] === oldTime[1] && el.length === 3) { el.pop() }
          else if (el[0] === oldTime[1]) return res.status(404).send({ error: "Błędna wizyta" })
        })
        newScheduleCopy[newTime[0]].forEach((el) => {
          if (el[0] === newTime[1] && el.length === 2) { el.push(visit._id.toString()) }
          else if (el[0] === newTime[1]) return res.status(404).send({ error: "Błędna wizyta nowego prowadzącego" })
        })
        if (!newStaffId) oldEmployee.schedule = { ...oldEmployee.schedule, [oldTime[0]]: oldScheduleCopy[oldTime[0]], [newTime[0]]: newScheduleCopy[newTime[0]] }
        if (newStaffId) {
          oldEmployee.schedule = { ...oldEmployee.schedule, [oldTime[0]]: oldScheduleCopy[oldTime[0]] }
          newEmployee.schedule = { ...newEmployee.schedule, [newTime[0]]: newScheduleCopy[newTime[0]] }
        }
      }
    })
    const session = await mongoose.startSession();
    session.startTransaction();
    await visit.save({ session });
    await oldEmployee.save({ session });
    if (newStaffId) await newEmployee.save({ session });
    await session.commitTransaction();

    res.send({ description: visit.description })
  } catch (e) {
    res.status(500).send({ error: e.message })
  }
}
