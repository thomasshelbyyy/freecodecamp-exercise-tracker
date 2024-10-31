const express = require('express')
const app = express()
const cors = require('cors')
const mongoose = require("mongoose")
const bodyParser = require("body-parser")
require('dotenv').config()

app.use(cors())
app.use(bodyParser.urlencoded({extended: true}))
app.use(bodyParser.json())

const uri = process.env.MONGO_URI

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })

const userSchema = new mongoose.Schema({
  username: {type: String, required: true, unique: true}
})

const User = mongoose.model("User", userSchema)

const exerciseSchema = new mongoose.Schema({
  userId: {type: mongoose.Schema.Types.ObjectId, ref: "User", required: true},
  description: String,
  duration: Number,
  date: String
})

const Exercise = mongoose.model("Exercise", exerciseSchema)

app.use(express.static('public'))
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html')
});

app.post("/api/users", async function(req, res) {
  try {
    const username = req.body.username
    const user = new User({username})
    await user.save()
    res.json({username: user.username, _id: user._id})
  } catch(err) {
    console.log(err)
    res.status(500).json({error: "Could not create user"})
  }
})

app.get("/api/users", async function(req, res) {
  const user = await User.find({}, "username _id")
  res.json(user)
})

app.post("/api/users/:_id/exercises", async (req, res) => {
  try {
    const _id = req.params._id;
    const { description, duration, date } = req.body;
    
    // Format the date; use current date if none provided
    const dateStr = date ? new Date(date).toDateString() : new Date().toDateString();

    // Check if the user exists
    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    // Create and save the exercise entry
    const exercise = new Exercise({ userId: _id, description, duration, date: dateStr });
    await exercise.save();

    // Return the user object with exercise fields added
    res.json({
      username: user.username,
      description: exercise.description,
      duration: exercise.duration,
      date: exercise.date,
      _id: user._id
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server error" });
  }
});


app.get("/api/users/:_id/logs", async (req, res) => {
  const {from , to, limit} = req.query
  const {_id} = req.params

  const user = await User.findById(_id)
  let logs = await Exercise.find({userId: _id})

  if(from) logs = logs.filter(log => new Date(log.date) >= new Date(from ))
  if(to) logs = logs.filter(log => new Date(log.date) <= new Date(to))
  if(limit) logs = logs.slice(0, limit)

  res.json({
    username: user.username,
    count: logs.length,
    _id: user._id,
    log: logs.map(log => ({
      description: log.description,
      duration: log.duration,
      date: log.date
    }))
  })
})

const listener = app.listen(process.env.PORT || 3001, () => {
  console.log('Your app is listening on port ' + listener.address().port)
})
