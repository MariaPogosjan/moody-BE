import mongoose from 'mongoose'

export const thoughtSchema = mongoose.Schema({
  message: {
    type: String,
    required: true,
    trim: true,
    minlength: 5,
    maxlength: 140
  },
  hugs: {
    type: Number,
    default: 0
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  comments: [{
    comment: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 140
    },
    createdAt: {
      type: Date,
      default: Date.now
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }]
})
