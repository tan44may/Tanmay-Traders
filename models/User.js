const mongoose = require('mongoose');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true
  },
  password: {
    type: String,
    required: true
  }
}, { timestamps: true });

// Pre-save middleware to hash password using SHA-256
userSchema.pre('save', function() {
  if (this.isModified('password')) {
    this.password = crypto.createHash('sha256').update(this.password).digest('hex');
  }
});

// Method to verify password
userSchema.methods.comparePassword = function(candidatePassword) {
  const hashedCandidate = crypto.createHash('sha256').update(candidatePassword).digest('hex');
  return this.password === hashedCandidate;
};

module.exports = mongoose.model('User', userSchema, 'Users');
