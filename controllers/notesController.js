const Note = require('../models/Note');
const cloudinary = require('../services/cloudinaryService');
const fs = require('fs');

/**
 * POST /api/notes/upload
 * Upload a new PDF note
 */
const uploadNote = async (req, res) => {
  try {
    const { title, subject, standard } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a PDF file.' });
    }

    // Upload to Cloudinary - use resource_type: 'auto' but ensure we handle errors
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: 'learniq/notes',
      resource_type: 'auto'
    });

    // Delete local file after upload
    fs.unlinkSync(req.file.path);

    const note = await Note.create({
      title: title || req.file.originalname,
      subject,
      standard,
      fileUrl: result.secure_url,
      cloudinaryId: result.public_id,
      uploadedBy: req.user.id,
      studentName: req.user.name
    });

    res.status(201).json({ success: true, note });
  } catch (error) {
    console.error('Note upload error:', error);
    // Cleanup local file if it exists and upload failed
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/notes
 * Get all notes with search and filter
 */
const getNotes = async (req, res) => {
  try {
    const { search, standard } = req.query;
    let query = {};

    if (search) {
      query.subject = { $regex: search, $options: 'i' };
    }

    if (standard && standard !== 'All') {
      query.standard = standard;
    }

    const notes = await Note.find(query).sort('-createdAt');
    res.json({ success: true, notes });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * DELETE /api/notes/:id
 * Delete a note
 */
const deleteNote = async (req, res) => {
  try {
    const note = await Note.findOne({ _id: req.params.id, uploadedBy: req.user.id });
    
    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found or unauthorized.' });
    }

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(note.cloudinaryId);
    
    // Delete from DB
    await Note.findByIdAndDelete(req.params.id);

    res.json({ success: true, message: 'Note deleted successfully.' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

module.exports = {
  uploadNote,
  getNotes,
  deleteNote
};
