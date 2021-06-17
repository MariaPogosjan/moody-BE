import express from 'express'
import cors from 'cors'
import mongoose from 'mongoose'
import listEndpoints from 'express-list-endpoints'
import crypto from 'crypto'
import bcrypt from 'bcrypt'
import dotenv from 'dotenv'
import cloudinaryFramework from 'cloudinary'
import multer from 'multer'
import http from 'http'
import socketIo from 'socket.io'
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
  },
  friends: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  friendRequests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  myFriendRequests: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }]
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
const server = http.createServer(app)
const io = socketIo(server, {
  cors: {
    origin: "*"
  } 
})

io.sockets.on('connection', (socket) => {
  console.log("User connected: ", socket.id)
 
  socket.on('join room', (data) => {
    socket.join(data.room)
    // eslint-disable-next-line no-console
    console.log('joined room ', data.room)
  })

  socket.on('orderCompleted', (data) => {
    socket.to(data.room).emit('notifyStore', data)
  }) 

  socket.emit('join room', {
    room: 500
  })

  socket.on('end', () => {
    socket.disconnect(0);
  })
})

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
      accessToken: newUser.accessToken,
      profileImage: newUser.profileImage,
      friends: newUser.friends,
      friendRequests: newUser.friendRequests,
      myFriendRequests: newUser.myFriendRequests
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
          "feelings",
          "friends",
          "friendRequests",
          "myFriendRequests",
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
      .populate({ path: 'friendRequests', select: ['username', 'profileImage'] })
      .populate({ path: 'myFriendRequests', select: ['username', 'profileImage'] })
      .populate({ path: 'friends', select: ['username', 'profileImage'] })
      .exec()

    if (foundUser) {
      res.json({
        success: true,
        id: foundUser._id,
        username: foundUser.username,
        profileImage: foundUser.profileImage,
        email: foundUser.email,
        friends: foundUser.friends,
        friendRequests: foundUser.friendRequests,
        myFriendRequests: foundUser.myFriendRequests
       
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
      .populate({ path: 'friendRequests', select: ['username', 'profileImage'] })
      .populate({ path: 'myFriendRequests', select: ['username', 'profileImage'] })
      .populate({ path: 'friends', select: ['username', 'profileImage'] })
      .exec()
    if (user && bcrypt.compareSync(password, user.password)) {
      res.json({
        success: true,
        // eslint-disable-next-line no-underscore-dangle
        userId: user._id,
        username: user.username,
        accessToken: user.accessToken,
        profileImage: user.profileImage,
        friends: user.friends,
        friendRequests: user.friendRequests,
        myFriendRequests: user.myFriendRequests
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
      res.json({ sucess: true, profileImage: avatar.profileImage })
    } else {
      res.status(404).json({ sucess: false, message: 'Could not update picture' })
    }
  } catch (error) {
    res.status(400).json({ success: false, message: 'Invalid request', error })
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

// request a friend 
app.put('/follow', authanticateUser, async (req, res) => {
  const { id } = req.body
  const { _id } = req.user

  // eslint-disable-next-line no-console
  try {
    const friendRequest = await User.findByIdAndUpdate(id,
      {
        $push: {
          // eslint-disable-next-line no-undef
          friendRequests: _id
        }
      }, {
        new: true
      })

    const myFriendRequest = await User.findByIdAndUpdate(_id,
      {
        $push: {
          myFriendRequests: id
        }
      }, {
        new: true
      })

    if (friendRequest && myFriendRequest) {
      res.json({ 
        success: true, 
        friend: {
          _id: friendRequest._id,
          username: friendRequest.username,
          profileImage: friendRequest.profileImage
        },
        message: `You have requested to be friends with ${friendRequest.username}` 
      })
    } else {
      res.status(404).json({ sucess: false, message: 'Could not request friendship!' })
    }
  } catch (error) {
    res.status(400).json({ success: false, message: 'Invalid request', error })
  }
})

app.put('/acceptfriends', authanticateUser, async (req, res) => {
  const { id } = req.body
  const { _id } = req.user

  try {
    const myFriendAdded = await User.findByIdAndUpdate(id,
      {
        $push: {
          // eslint-disable-next-line no-undef
          friends: _id
        }
      },
      {
        new: true
      })
    const myFriendRemoved = await User.findByIdAndUpdate(id,
      {
        $pull: {
          friendRequests: _id
        }
      },
      {
        new: true
      })
    const meAdded = await User.findByIdAndUpdate(_id,
      {
        $push: {
          friends: id
        }
      },
      {
        new: true
      })
    const meRemoved = await User.findByIdAndUpdate(_id,
      {
        $pull: {
          friendRequests: id
        }
      },
      {
        new: true
      })

    if (myFriendAdded && myFriendRemoved && meAdded && meRemoved) {
      res.json({ 
        success: true, 
        friend: {
          _id: myFriendAdded._id,
          username: myFriendAdded.username,
          profileImage: myFriendAdded.profileImage
        },
        message: `You are now friend with ${myFriendAdded.username}` })
    } else {
      res.status(404).json({ sucess: false, message: 'Could not accept friendship!' })
    }
  } catch (error) {
    res.status(400).json({ success: false, message: 'Invalid request', error })
  }
})

app.patch('/unfollow', authanticateUser, async (req, res) => {
  const { id } = req.body
  const { _id } = req.user

  try {
    const unfollowedFriend = await User.findByIdAndUpdate(id, {
      $pull: {
        friends: _id
      }
    }, {
      new: true
    })

    const meRemoved = await User.findByIdAndUpdate(_id, {
      $pull: {
        friends: id
      }
    }, {
      new: true
    })

    if (unfollowedFriend && meRemoved) {
      res.json({ 
        success: true, 
        friend: {
          _id: unfollowedFriend._id,
          username: unfollowedFriend.username,
          profileImage: unfollowedFriend.profileImage
        },
        message: `You are now NOT friend with ${unfollowedFriend.username}` })
    }
  } catch (error) {
    res.status(400).json({ success: false, message: 'Invalid request', error })
  }
})

// Start the server here
server.listen(port, () => {
  // eslint-disable-next-line
  console.log(`Server running on http://localhost:${port}`)
})