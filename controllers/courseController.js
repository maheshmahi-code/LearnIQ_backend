/**
 * Course Controller
 */

const Course = require('../models/Course');
const User = require('../models/User');
const claudeService = require('../services/claudeService');

const getAll = async (req, res) => {
  try {
    const { category, difficulty, enrolled } = req.query;
    let courses = [];
    if (req.user && enrolled === 'true') {
      const user = await User.findById(req.user.id);
      const ids = user?.enrolledCourses || [];
      courses = await Course.find({ _id: { $in: ids } })
        .populate('instructor', 'name avatar')
        .sort('-createdAt');
    } else {
      const filter = { isPublished: true };
      if (category) filter.category = category;
      if (difficulty) filter.difficulty = difficulty;
      courses = await Course.find(filter)
        .populate('instructor', 'name avatar')
        .sort('-createdAt');
    }
    
    res.json({ success: true, courses });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const getOne = async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate('instructor', 'name avatar');
    if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });
    res.json({ success: true, course });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const create = async (req, res) => {
  try {
    const course = await Course.create({ ...req.body, createdBy: req.user?.id });
    res.status(201).json({ success: true, course });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const update = async (req, res) => {
  try {
    const course = await Course.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });
    res.json({ success: true, course });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const remove = async (req, res) => {
  try {
    const course = await Course.findByIdAndDelete(req.params.id);
    if (!course) return res.status(404).json({ success: false, message: 'Course not found.' });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const enroll = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
    const courseId = req.params.id;
    if (user.enrolledCourses.some((id) => id.toString() === courseId)) {
      return res.json({ success: true, message: 'Already enrolled.' });
    }
    user.enrolledCourses.push(courseId);
    user.learningProgress.push({ courseId, percentComplete: 0, lastAccessed: new Date() });
    await user.save();

    // Ensure the course has at least one assignment
    const Assignment = require('../models/Assignment');
    const existingAssignment = await Assignment.findOne({ courseId });
    if (!existingAssignment) {
      try {
        const course = await Course.findById(courseId);
        const prompt = `Generate a challenging assignment for course: "${course.title}". Difficulty: ${course.difficulty}. JSON format: {"title": "...", "description": "..."}`;
        const gen = await claudeService.generateJSON(prompt);
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + 7);
        await Assignment.create({
          courseId,
          title: gen.title,
          description: gen.description,
          dueDate,
          maxScore: 100,
          createdBy: null
        });
      } catch (err) {
        console.error('Enrollment auto-assignment failed:', err);
      }
    }

    res.json({ success: true, message: 'Enrolled successfully. New projects await!' });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const generateCourse = async (req, res) => {
  try {
    const { topic, category, difficulty } = req.body;
    
    if (!topic) {
        return res.status(400).json({ success: false, message: 'Topic is required.' });
    }

    const prompt = `
      Create a comprehensive, highly-structured course curriculum for the topic: "${topic}".
      Category context: ${category || 'General'}
      Difficulty level: ${difficulty || 'Beginner'}
      
      Return ONLY a valid JSON object matching exactly this structure:
      {
        "title": "A catchy, professional title for the course",
        "description": "A 2-paragraph detailed description of what the student will learn",
        "modules": [
          {
            "title": "Module 1 Title",
            "description": "Module overview",
            "order": 1,
            "lessons": [
              {
                "title": "Lesson 1 Title",
                "type": "text",
                "content": "Detailed markdown content for this lesson explaining the concepts thoroughly (at least 3 paragraphs).",
                "duration": 15,
                "order": 1
              }
            ]
          }
        ]
      }
      Generate at least 3 modules, each with at least 2 detailed lessons. The lessons MUST have actual educational markdown content in the 'content' field.
    `;

    const generated = await claudeService.generateJSON(prompt);
    
    // Save to database
    const newCourse = await Course.create({
      title: generated.title,
      description: generated.description,
      category: category || 'Other',
      difficulty: difficulty || 'beginner',
      modules: generated.modules,
      isPublished: true,
      instructor: req.user?.id || null
    });

    // Automatically enroll the creator in their new course
    const user = await User.findById(req.user.id);
    if (user) {
      user.enrolledCourses.push(newCourse._id);
      user.learningProgress.push({ courseId: newCourse._id, percentComplete: 0, lastAccessed: new Date() });
      await user.save();
    }

    // Automatically generate an assignment for this new course
    let assignment = null;
    try {
      const assignmentPrompt = `
        You are an expert tutor. We just created a course: "${newCourse.title}".
        Category: ${newCourse.category}
        Difficulty: ${newCourse.difficulty}
        Description: ${newCourse.description}

        Generate a challenging but fair assignment for this course.
        Return ONLY a valid JSON object matching exactly this structure:
        {
          "title": "A catchy, professional title for the assignment",
          "description": "A detailed description including specific questions or tasks based on the course topic."
        }
      `;
      const genAss = await claudeService.generateJSON(assignmentPrompt);
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 7);

      const Assignment = require('../models/Assignment');
      assignment = await Assignment.create({
        courseId: newCourse._id,
        title: genAss.title,
        description: genAss.description,
        dueDate: dueDate,
        maxScore: 100,
        createdBy: req.user?.id || null,
      });
    } catch (assError) {
      console.error('Auto Assignment Generation failed:', assError);
    }

    res.status(201).json({ success: true, course: newCourse, assignment });
  } catch (e) {
    console.error('Course Generation Error:', e);
    res.status(500).json({ success: false, message: 'Failed to generate course. ' + e.message });
  }
};

module.exports = { getAll, getOne, create, update, remove, enroll, generateCourse };
