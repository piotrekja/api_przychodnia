const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const userRoutes = require('./routes/userRoutes');
const visitRoutes = require('./routes/visitRoutes');
const employeeRoutes = require('./routes/employeeRoutes');
const fs = require('fs')
const path = require('path')
const morgan = require('morgan')
require('dotenv/config')
// require('dotenv').config({ path: __dirname + '/./../.env' });

const port = process.env.PORT || 5000
const uri = process.env.MONGO_DB_KEY

const app = express();

app.use(bodyParser.json());
app.use(morgan('tiny'))
app.use('/uploads/images', express.static(path.join('uploads', 'images')))  

app.use('/api/users', userRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/visits', visitRoutes);
// app.use((req, res) => res.status(404).send({ error: "No such route" }))

app.use((error, req, res, next) => {
  res.status(error.code || 500)
  res.send({ error: error.message || 'nieznany blad' })
})

const __dirnam = path.resolve(__dirname, '..')
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirnam, '/build')))
  app.get("*", (req, res) => res.sendFile(path.resolve(__dirnam, 'build', 'index.html')))
}

console.log(process.env.NODE_ENV)

mongoose.connect(uri)
  .then(() => {
    app.listen(5000, () => console.log(`server listening on port ${port}`));
  })
  .catch(err => {
    console.log(err);
  });
