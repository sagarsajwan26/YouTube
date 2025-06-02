const express = require('express');
const Router = express.Router();
const checkAuth = require('../middleware/checkAuth');
const Comment = require('../models/Comment.model');
const jwt = require('jsonwebtoken');
const { default: mongoose } = require('mongoose');

// 🛠 Utility logger (optional, but cleaner)
const log = {
    info: (location, message) => console.log(`[INFO] [${location}] ${message}`),
    warn: (location, message) => console.warn(`[WARN] [${location}] ${message}`),
    error: (location, error) => {
        console.error(`[ERROR] [${location}] ${error.message}`);
        console.error(error.stack); // stack trace for precise location
    }
};

// ✅ Add new comment
Router.post('/new-comment/:videoId', checkAuth, async (req, res) => {
    const location = 'POST /new-comment/:videoId';
    try {
        const token = req.headers.authorization.split(' ')[1];
        const verifiedUser = jwt.verify(token, "sagar");

        const newComment = new Comment({
            _id: new mongoose.Types.ObjectId(),
            videoId: req.params.videoId,
            userId: verifiedUser._id,
            commentText: req.body.commentText
        });

        const savedComment = await newComment.save();
        log.info(location, `Comment added by user ${verifiedUser._id} to video ${req.params.videoId}`);

        res.status(200).json({ newComment: savedComment });

    } catch (error) {
        log.error(location, error);
        res.status(500).json({ error: "Failed to post comment" });
    }
});

// ✅ Get all comments for a video
Router.get("/:videoId", async (req, res) => {
    const location = 'GET /:videoId';
    try {
        const comments = await Comment.find({ videoId: req.params.videoId })
            .populate("userId", "channelName logoUrl");

        log.info(location, `Fetched ${comments.length} comments for video ${req.params.videoId}`);
        res.status(200).json({ comments });

    } catch (error) {
        log.error(location, error);
        res.status(500).json({ error: "Failed to fetch comments" });
    }
});

// ✅ Update a comment
Router.put("/:commentId", checkAuth, async (req, res) => {
    const location = 'PUT /:commentId';
    try {
        const token = req.headers.authorization.split(' ')[1];
        const verifiedUser = jwt.verify(token, "sagar");

        const comment = await Comment.findById(req.params.commentId);
        if (!comment) {
            log.warn(location, `Comment not found: ${req.params.commentId}`);
            return res.status(404).json({ error: "Comment not found" });
        }

        if (comment.userId.toString() !== verifiedUser._id) {
            log.warn(location, `Unauthorized update attempt by user ${verifiedUser._id}`);
            return res.status(403).json({ error: "Unauthorized" });
        }

        comment.commentText = req.body.commentText;
        const updatedComment = await comment.save();

        log.info(location, `Comment ${req.params.commentId} updated by user ${verifiedUser._id}`);
        res.status(200).json({ msg: "Comment updated successfully", updatedComment });

    } catch (error) {
        log.error(location, error);
        res.status(500).json({ error: "Failed to update comment" });
    }
});

// ✅ Delete a comment
Router.delete("/:commentId", checkAuth, async (req, res) => {
    const location = 'DELETE /:commentId';
    try {
        const token = req.headers.authorization.split(' ')[1];
        const verifiedUser = jwt.verify(token, "sagar");

        const comment = await Comment.findById(req.params.commentId);
        if (!comment) {
            log.warn(location, `Comment not found: ${req.params.commentId}`);
            return res.status(404).json({ error: "Comment not found" });
        }

        if (comment.userId.toString() !== verifiedUser._id) {
            log.warn(location, `Unauthorized delete attempt by user ${verifiedUser._id}`);
            return res.status(403).json({ error: "Unauthorized" });
        }

        await Comment.findByIdAndDelete(req.params.commentId);

        log.info(location, `Comment ${req.params.commentId} deleted by user ${verifiedUser._id}`);
        res.status(200).json({ msg: "Comment deleted successfully" });

    } catch (error) {
        log.error(location, error);
        res.status(500).json({ error: "Failed to delete comment" });
    }
});

module.exports = Router;
