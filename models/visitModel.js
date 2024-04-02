const mongoose = require('mongoose')

const visitSchema = new mongoose.Schema({
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  time: {
    type: Object,
    required: true,
  },
  description: {
    type: String,
    required: true,
    maxlength:150
  },
  paid: {
    type: Number,
    required: true,
  },
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  }
}, {
  timestamps: true
})

//f-cja na konkretnym visit, usuwa pola
visitSchema.methods.toJSON = function () {
  const visit = this
  const tempObject = visit.toObject()
  const { paid, createdAt, updatedAt, _id, __v, ...visitObject } = tempObject
  return visitObject
}

const Employee = mongoose.model('Visit', visitSchema)

module.exports = Employee