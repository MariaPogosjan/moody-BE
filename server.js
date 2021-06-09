/* eslint-disable no-underscore-dangle */
/* eslint-disable no-useless-escape */
import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import listEndpoints from 'express-list-endpoints'
import crypto from 'crypto'
import bcrypt from 'bcrypt'
import dotenv from 'dotenv'
import cloudinaryFramework from 'cloudinary'
import multer from 'multer'
import cloudinaryStorage from 'multer-storage-cloudinary'

dotenv.config()
const cloudinary = cloudinaryFramework.v2;
cloudinary.config({
  cloud_name: 'drfog5fha',
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
})

const storage = cloudinaryStorage({
  cloudinary,
  params: {
    folder: 'avatars',
    allowedFormats: ['jpg', 'png'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }]
  }
})
const parser = multer({ storage })

const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/moody"
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true })
mongoose.Promise = Promise

const userSchema = mongoose.Schema({
  username: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 12,
    unique: true,
    lowercase: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    validate: {
      validator: (value) => {
        return /^([a-zA-Z0-9_\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9]{2,4})+$/.test(value)
      },
      message: 'Please enter a valid email address'
    }
  },
  password: {
    type: String,
    required: true
  },
  accessToken: {
    type: String,
    default: () => crypto.randomBytes(128).toString('hex')
  },
  profileImage: {
    name: String,
    imageURL: String
  }
})

const User = mongoose.model('User', userSchema)

const feelingSchema = mongoose.Schema({
  value: Number,
  description: String,
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
})

const Feeling = mongoose.model('Feeling', feelingSchema)

const authanticateUser = async (req, res, next) => {
  const accessToken = req.header('Authorization')
  try {
    const user = await User.findOne({ accessToken })
    if (user) {
      req.user = user
      next()
    } else {
      res.status(401).json({ sucess: false, message: 'Not authorized' })
    }
  } catch (error) {
    res.status(400).json({ sucess: false, message: 'Invalid request', error })
  }
}

const port = process.env.PORT || 8080
const app = express()

app.use(cors())
app.use(express.json())

app.get('/', (req, res) => {
  res.send(listEndpoints(app))
})

app.post('/users', async (req, res) => {
  const { username, email, password } = req.body
  try {
    const salt = bcrypt.genSaltSync()
    const newUser = await new User({
      username,
      email,
      password: bcrypt.hashSync(password, salt)
    }).save()
    res.json({
      success: true,
      // eslint-disable-next-line no-underscore-dangle
      userId: newUser._id,
      username: newUser.username,
      accessToken: newUser.accessToken
    })
  } catch (error) {
    res.status(400).json({
      success: false,
      message: 'Could not create user',
      error
    })
  }
})

app.get('/users', async (req, res) => {
  try {
    const users = await User.aggregate([
      {
        $unset: [
          "password",
          "accessToken",
          "email"
        ]
      }
    ])
    res.json(users)
  } catch (error) {
    res.status(400).json(error)
  }
})

app.get('/users/:id', async (req, res) => {
  const { id } = req.params
  try {
    const foundUser = await User.findById(id)
    if (foundUser) {
      res.json({
        success: true,
        id: foundUser._id,
        username: foundUser.username,
        email: foundUser.email
      })
    } else {
      res.status(404).json({ success: false, message: 'User not found' })
    }
  } catch (error) {
    res.status(400).json({ message: 'Invalid request', error })
  }
})

app.get('/feelings/:id', authanticateUser)
app.get('/feelings/:id', async (req, res) => {
  const { _id } = req.user

  try {
    const foundFeelings = await Feeling.find({ user: _id })
    if (foundFeelings) {
      res.json({
        success: true,
        feelings: foundFeelings
      })
    } else {
      res.status(404).json({ success: false, message: 'Could not find users feelings' })
    }
  } catch (error) {
    res.status(400).json({ message: 'Invalid request', error })
  }
})

app.delete('/users/:id', async (req, res) => {
  const { id } = req.params
  try {
    const deletedUser = await User.findByIdAndDelete(id)
    if (deletedUser) {
      res.json(deletedUser)
    } else {
      res.status(404).json('Could not delete the user')
    }
  } catch (error) {
    res.status(400).json({ message: 'Invalid request', error })
  }
})

app.patch('/users/:id/email', authanticateUser, async (req, res) => {
  const { id } = req.params
  const { email } = req.body
  try {
    const updatedUser = await User.findByIdAndUpdate(id,
      {
        $set: {
          email
        }
      },
      {
        new: true
      })
    res.json({
      success: true,
      email: updatedUser.email
    })
  } catch (error) {
    res.status(400).json({ success: false, message: 'Invalid request', error })
  }
})

app.patch('/users/:id/username', authanticateUser, async (req, res) => {
  const { id } = req.params
  const { username } = req.body
  try {
    const updatedUser = await User.findByIdAndUpdate(id,
      {
        $set: {
          username
        }
      },
      {
        new: true
      })
    res.json({
      success: true,
      username: updatedUser.username
    })
  } catch (error) {
    res.status(400).json({ success: false, message: 'Invalid request', error })
  }
})

app.patch('/users/:id/password', authanticateUser, async (req, res) => {
  const { id } = req.params
  const { password, newPassword } = req.body
  try {
    const salt = bcrypt.genSaltSync()
    const user = await User.findById(id)

    if (user && bcrypt.compareSync(password, user.password)) {
      const updatedUser = await User.findByIdAndUpdate(id,
        {
          $set: {
            password: bcrypt.hashSync(newPassword, salt)
          }
        },
        {
          new: true
        })
      res.json({
        success: true,
        message: `${updatedUser.username}: password updated successfully!`
      })
    } else {
      res.status(404).json({ success: false, message: 'Could not update password!' })
    }
  } catch (error) {
    res.status(400).json({ success: false, message: 'Invalid request', error })
  }
})

app.post('/sessions', async (req, res) => {
  const { emailOrUsername, password } = req.body
  try {
    const user = await User.findOne({
      $or: [
        { email: emailOrUsername },
        { username: emailOrUsername }
      ]
    })
    if (user && bcrypt.compareSync(password, user.password)) {
      res.json({
        success: true,
        // eslint-disable-next-line no-underscore-dangle
        userId: user._id,
        username: user.username,
        accessToken: user.accessToken
      })
    } else {
      res.status(404).json({ success: false, message: 'User not found' })
    }
  } catch (error) {
    res.status(400).json({ success: false, message: 'Invalid request', error })
  }
})

app.post('/users/:id/avatar', parser.single('image'), async (req, res) => {
  const { id } = req.params
  try {
    const avatar = await User.findByIdAndUpdate(id,
      { profileImage: { name: req.file.filename, imageURL: req.file.path } }, { new: true })
    if (avatar) {
      res.json(avatar.profileImage)
    } else {
      res.status(404).json({ message: 'Could not update picture' })
    }
  } catch (error) {
    res.status(400).json({ message: 'Invalid request', error })
  }
})

app.post('/feelings', authanticateUser)
app.post('/feelings', async (req, res) => {
  const { value, description } = req.body
  const { _id } = req.user

  try {
    const user = await User.findById(_id)
    const newFeeling = await new Feeling({
      user,
      value,
      description
    }).save()
    if (newFeeling) {
      res.status(201).json(
        {
          success: true,
          feeling: {
            value: newFeeling.value,
            description: newFeeling.description,
            user: newFeeling.user._id
          }
        }
      )
    } else {
      res.status(404).json({ message: 'Could not register feeling' })
    }
  } catch (error) {
    res.status(404).json({ message: 'Bad request', error })
  }
})

// Start the server here
app.listen(port, () => {
  // eslint-disable-next-line
  console.log(`Server running on http://localhost:${port}`)
})