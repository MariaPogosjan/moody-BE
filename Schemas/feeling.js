import mongoose from 'mongoose'

export const feelingSchema = mongoose.Schema({
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
