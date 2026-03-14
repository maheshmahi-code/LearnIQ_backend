/**
 * Assignment Controller
 */

const Assignment = require('../models/Assignment');
const Submission = require('../models/Submission');
const Course = require('../models/Course');
const User = require('../models/User');
const claudeService = require('../services/claudeService');
const xpEngineService = require('../services/xpEngineService');

const getAll = async (req, res) => {
  try {
    const { courseId } = req.query;
    let filter = courseId ? { courseId } : {};
    
    // If student is logged in, filter by their enrolled courses only
    if (req.user && req.user.role !== 'admin') {
      const user = await User.findById(req.user.id);
      if (user) {
        if (!courseId) {
          filter.courseId = { $in: user.enrolledCourses };
        } else if (!user.enrolledCourses.some(id => id.toString() === courseId)) {
           // Requesting a course they aren't enrolled in
           return res.json({ success: true, assignments: [] });
        }
      }
    }

    const assignments = await Assignment.find(filter).populate('courseId', 'title difficulty').sort('-dueDate');
    
    // Also fetch their submissions so we can attach status!
    let submissionsMap = {};
    if (req.user) {
        const subs = await Submission.find({ studentId: req.user.id });
        subs.forEach(s => submissionsMap[s.assignmentId.toString()] = s.status);
    }
    
    const enrichedAssignments = assignments.map(a => ({
        ...a.toObject(),
        submissionStatus: submissionsMap[a._id.toString()] || 'pending'
    }));

    res.json({ success: true, assignments: enrichedAssignments });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const create = async (req, res) => {
  try {
    const assignment = await Assignment.create({
      ...req.body,
      createdBy: req.user?.id,
    });
    res.status(201).json({ success: true, assignment });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const update = async (req, res) => {
  try {
    const assignment = await Assignment.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found.' });
    res.json({ success: true, assignment });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const remove = async (req, res) => {
  try {
    const assignment = await Assignment.findByIdAndDelete(req.params.id);
    if (!assignment) return res.status(404).json({ success: false, message: 'Assignment not found.' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const submit = async (req, res) => {
  try {
    const { attachments } = req.body;
    let sub = await Submission.findOne({
      assignmentId: req.params.id,
      studentId: req.user.id,
    });
    if (sub) {
      sub.attachments = attachments || sub.attachments;
      sub.status = 'submitted';
      await sub.save();
    } else {
      sub = await Submission.create({
        assignmentId: req.params.id,
        studentId: req.user.id,
        attachments: attachments || [],
        status: 'submitted',
      });
    }
    await xpEngineService.awardXP(req.user.id, 'submit_assignment');
    res.json({ success: true, submission: sub });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const grade = async (req, res) => {
  try {
    const { score, feedback } = req.body;
    const sub = await Submission.findOneAndUpdate(
      { _id: req.params.subId },
      { score, feedback, status: 'graded', gradedAt: new Date() },
      { new: true }
    );
    if (!sub) return res.status(404).json({ success: false, message: 'Submission not found.' });
    res.json({ success: true, submission: sub });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const getSubmissions = async (req, res) => {
  try {
    const subs = await Submission.find({ assignmentId: req.params.id })
      .populate('studentId', 'name email avatar')
      .sort('-submittedAt');
    res.json({ success: true, submissions: subs });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const generateAssignment = async (req, res) => {
  try {
    const { courseId } = req.body;
    if (!courseId) {
      return res.status(400).json({ success: false, message: 'courseId is required.' });
    }

    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ success: false, message: 'Course not found.' });
    }

    const prompt = `
      You are an expert tutor. We are creating an assignment for the following course:
      Title: "${course.title}"
      Category: ${course.category}
      Difficulty: ${course.difficulty}
      Description: ${course.description}

      Generate a challenging but fair assignment for this course.
      Return ONLY a valid JSON object matching exactly this structure:
      {
        "title": "A catchy, professional title for the assignment",
        "description": "A detailed 2-paragraph description of the assignment. Include specific questions, coding tasks, or analytical problems for the student to solve based on the course topic."
      }
    `;

    const generated = await claudeService.generateJSON(prompt);
    
    // Set due date to 7 days from now
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + 7);

    // Save to database
    const newAssignment = await Assignment.create({
      courseId: course._id,
      title: generated.title,
      description: generated.description,
      dueDate: dueDate,
      maxScore: 100,
      createdBy: req.user?.id || null,
    });

    // Populate course details to return standard format
    const populated = await Assignment.findById(newAssignment._id).populate('courseId', 'title difficulty');

    res.status(201).json({ success: true, assignment: populated });
  } catch (e) {
    console.error('Assignment Generation Error:', e);
    res.status(500).json({ success: false, message: 'Failed to generate assignment. ' + e.message });
  }
};

module.exports = {
  getAll,
  create,
  update,
  remove,
  submit,
  grade,
  getSubmissions,
  generateAssignment,
};
