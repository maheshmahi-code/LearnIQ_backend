const ChatMessage = require('../models/ChatMessage');

// @desc    Get messages for a room
// @route   GET /api/v1/chat/:roomId
// @access  Private
exports.getMessages = async (req, res) => {
  try {
    const roomId = req.params.roomId || 'global';
    
    // Fetch last 100 messages to prevent overload, sort ascending (oldest to newest for chat UI)
    const messages = await ChatMessage.find({ roomId })
      .sort({ createdAt: -1 })
      .limit(100)
      .populate('sender', 'name profilePicture isOnline');

    // Reverse so the newest is at the bottom, which is standard for chat UI
    res.status(200).json({
      success: true,
      data: messages.reverse()
    });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    res.status(500).json({ success: false, message: 'Failed to retrieve messages.' });
  }
};

// @desc    Send a new message
// @route   POST /api/v1/chat/:roomId
// @access  Private
exports.sendMessage = async (req, res) => {
  try {
    const { content } = req.body;
    const roomId = req.params.roomId || 'global';
    const senderId = req.user.id;

    if (!content) {
      return res.status(400).json({ success: false, message: 'Message content cannot be empty' });
    }

    const newMessage = await ChatMessage.create({
      sender: senderId,
      roomId,
      content,
    });

    const populatedMessage = await ChatMessage.findById(newMessage._id).populate(
      'sender',
      'name profilePicture isOnline'
    );

    res.status(201).json({
      success: true,
      data: populatedMessage,
    });
  } catch (error) {
    console.error('Error sending message:', error);
    res.status(500).json({ success: false, message: 'Failed to send message.' });
  }
};
