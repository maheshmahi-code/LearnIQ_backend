/**
 * Community Controller
 * Discussion posts, comments, upvotes.
 */

const DiscussionPost = require('../models/DiscussionPost');
const xpEngineService = require('../services/xpEngineService');

const getPosts = async (req, res) => {
  try {
    const { subject, limit = 20 } = req.query;
    const filter = subject ? { subject } : {};
    const posts = await DiscussionPost.find(filter)
      .populate('authorId', 'name avatar')
      .sort('-createdAt')
      .limit(parseInt(limit, 10));
    res.json({ success: true, posts });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const createPost = async (req, res) => {
  try {
    const post = await DiscussionPost.create({
      ...req.body,
      authorId: req.user.id,
    });
    const populated = await DiscussionPost.findById(post._id).populate(
      'authorId',
      'name avatar'
    );
    res.status(201).json({ success: true, post: populated });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const comment = async (req, res) => {
  try {
    const { content } = req.body;
    const post = await DiscussionPost.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });
    post.comments.push({
      authorId: req.user.id,
      content,
      parentId: req.body.parentId || null,
    });
    await post.save();
    if (req.body.parentId) {
      await xpEngineService.awardXP(req.user.id, 'community_help');
    }
    res.json({ success: true, post });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

const upvote = async (req, res) => {
  try {
    const post = await DiscussionPost.findById(req.params.id);
    if (!post) return res.status(404).json({ success: false, message: 'Post not found.' });
    const uid = req.user.id.toString();
    if (post.upvotedBy.some((id) => id.toString() === uid)) {
      post.upvotedBy = post.upvotedBy.filter((id) => id.toString() !== uid);
      post.upvotes = Math.max(0, post.upvotes - 1);
    } else {
      post.upvotedBy.push(req.user.id);
      post.upvotes += 1;
    }
    await post.save();
    res.json({ success: true, upvotes: post.upvotes });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
};

module.exports = { getPosts, createPost, comment, upvote };
