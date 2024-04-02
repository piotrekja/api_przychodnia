const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')

const employeeSchema = new mongoose.Schema({
  image: {
    type: String,
  },
  title: {
    type: String,
  },
  specialization: {
    type: String,
  },
  activities: {
    type: String,
  },
  schedule: {
    type: Object,
  },
  extras: [[{
    fieldtype: {
      type: String,
      enum: ['title', 'point', 'paragraph'],
      required: true
    },
    fieldindex: {
      type: String,
      required: true
    },
    value: {
      type: String,
    }
  }]
  ],
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    ref: 'User'
  }
}, {
  timestamps: true
})

//f-cja na konkretnym employee, usuwa pola
employeeSchema.methods.toJSON = function () {
  const employee = this
  const tempObject = employee.toObject()
  const { employeeId, createdAt, updatedAt, _id, __v, ...employeeObject } = tempObject
  return employeeObject
}

const Employee = mongoose.model('Employee', employeeSchema)

module.exports = Employee