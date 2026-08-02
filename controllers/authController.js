const User = require('../models/User');
const crypto = require('crypto');

const generateToken = (user) => {
  const payload = { 
    userId: user._id, 
    username: user.username, 
    exp: Date.now() + 24 * 60 * 60 * 1000 // 24 hours expiry
  };
  const payloadStr = JSON.stringify(payload);
  const signature = crypto.createHmac('sha256', process.env.JWT_SECRET || 'tanmay_secret_key_123').update(payloadStr).digest('hex');
  return Buffer.from(payloadStr).toString('base64') + '.' + signature;
};

const login = async (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ success: false, message: 'Please provide username and password' });
    }

    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    const isMatch = user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid username or password' });
    }

    const token = generateToken(user);

    res.status(200).json({
      success: true,
      token,
      user: {
        username: user.username
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ success: false, message: 'Internal Server Error' });
  }
};

module.exports = {
  login
};
