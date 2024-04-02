const mongoose = require('mongoose')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
require('dotenv').config();

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    validate(value) {
      if (!/^\S*$/.test(value)) {
        throw new Error('Name must be a single word')
      }
    }
  },
  surname: {
    type: String,
    required: true,
    trim: true,
    validate(value) {
      if (!/^\S*$/.test(value)) {
        throw new Error('Name must be a single word')
      }
    }
  },
  email: {
    type: String,
    unique: true,
    required: true,
    trim: true,
    lowercase: true, //zmienia na małe litery
    validate(value) {
      if (!/^\S+@\S+\.\S+$/.test(value)) {
        throw new Error('Wrong email format')
      }
    }
  },
  password: {
    type: String,
    required: true,
    minlength: 2,
    trim: true,
    // validate(value) {
    //   if (value.length < 3) {
    //     throw new Error('Password too short')
    //   }
    // }
  },
  temppassword: String,
  role: {
    type: String,
    required: true,
    validate(value) {
      if (!['patient', 'staff', 'admin'].includes(value)) {
        throw new Error('wrong role')
      }
    }
  },
  online: String,
  phone: {
    type: Number,
    validate(value) {
      if (!/[0-9]{9}/.test(value)) {
        throw new Error('Wrong phone format')
      }
    }
  },
  tokens: [{
    token: {
      type: String,
      required: true
    }
  }],
}, {
  timestamps: true
})

userSchema.set('toObject', { virtuals: true })
userSchema.set('toJSON', { virtuals: true })  //to by wystarczyło

userSchema.virtual('id').get(function () { //dodaje id do odp
  return this._id.toHexString()
})



//relation z employee
userSchema.virtual('virtualEmployees', {
  ref: 'Employee',
  localField: '_id',
  foreignField: 'employeeId'
})

userSchema.virtual('virtualVisits', {
  ref: 'Visit',
  localField: '_id',
  foreignField: 'patientId'
})

//f-cja wywoływana na każdym userze, usuwa pola
userSchema.methods.toJSON = function () {  //to działa wszędzie, dając powyżej zamiast toJSON nazwę fcji to można ją wywoywać jak poniższe generateAuthToken w controllerze jako user.fcja()
  const user = this
  const tempObject = user.toObject()
  const { password, tokens, _id, __v, ...userObject } = tempObject
  return userObject
}

//f-cja wywoływana na konkretnym userze, uruchamiana w controllerze przez await user.generateAuthToken()
userSchema.methods.generateAuthToken = async function () {
  const user = this
  const token = jwt.sign({ _id: user._id.toString() }, process.env.TOKEN_SECRET, { expiresIn: '7 days' })
  user.tokens = user.tokens.concat({ token })
  await user.save()
  return token
}

//login user, f-cja na schema
userSchema.statics.findByCredentials = async (email, password) => {
  const user = await User.findOne({ email })
  const isMatch = await bcrypt.compare(password, user.password)
  if (!user || !isMatch) {
    throw new Error('Wrong credentials')
  }
  return user
}

//hashing middleware
userSchema.pre('save', async function (next) {
  const user = this
  if (user.isModified('password')) { //uwzględnia create i update, brak ponownego hashowania pozostałych reqestów
    user.password = await bcrypt.hash(user.password, 8)
  }
  next()
})

userSchema.post('save', function (error, doc, next) {
  if (error.name === 'MongoServerError' && error.code === 11000) {
    throw new Error("Adres email jest już zajęty");
  } else {
    next();
  }
});

const User = mongoose.model('User', userSchema)

module.exports = User