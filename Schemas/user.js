/* eslint-disable no-useless-escape */
import mongoose from 'mongoose'
import crypto from 'crypto'

export const userSchema = mongoose.Schema({
  username: {
    type: String,
    required: true,
    minlength: 5,
    maxlength: 35,
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