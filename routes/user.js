const express = require("express");
const Router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cloudinary = require('cloudinary').v2;
require('dotenv').config();
const User = require('../models/User.model');
const { default: mongoose } = require("mongoose");
const checkAuth = require("../middleware/checkAuth");

// Cloudinary config
cloudinary.config({ 
    cloud_name: process.env.CLOUD_NAME, 
    api_key: process.env.CLOUD_API_KEY, 
    api_secret: process.env.CLOUD_API_SECRET, 
});

// Logging utility
const log = {
    info: (loc, msg) => console.log(`[INFO] [${loc}] ${msg}`),
    warn: (loc, msg) => console.warn(`[WARN] [${loc}] ${msg}`),
    error: (loc, err) => {
        console.error(`[ERROR] [${loc}] ${err.message}`);
        console.error(err.stack);
    }
};

// ✅ Signup Route
Router.post('/signup', async (req, res) => {
    const location = 'POST /signup';
    try {
        const { channelName, email, phone, password } = req.body;

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            log.warn(location, `Email already registered: ${email}`);
            return res.status(200).json({ error: "Email already registered" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        const uploadedImage = await cloudinary.uploader.upload(req.files.logoUrl.tempFilePath);
        
        const newUser = new User({
            _id: new mongoose.Types.ObjectId(),
            channelName,
            email,
            phone,
            password: hashedPassword,
            logoUrl: uploadedImage.secure_url,
            logoId: uploadedImage.public_id
        });

        const savedUser = await newUser.save();
        log.info(location, `User registered with email: ${email}`);

        res.status(200).json({ msg: "Signup successful", newUser: savedUser });

    } catch (error) {
        log.error(location, error);
        res.status(500).json({ error: "Signup failed" });
    }
});

// ✅ Login Route
Router.post("/login", async (req, res) => {
    const location = 'POST /login';
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            log.warn(location, `Email not registered: ${email}`);
            return res.status(400).json({ error: "Email not registered" });
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
            log.warn(location, `Invalid password attempt for email: ${email}`);
            return res.status(400).json({ error: "Invalid password" });
        }

        const token = jwt.sign({
            _id: user._id,
            email: user.email,
            channelName: user.channelName,
            phone: user.phone,
            logoId: user.logoId
        }, "sagar", { expiresIn: "365d" });

        log.info(location, `User logged in: ${email}`);

        res.status(200).json({
            _id: user._id,
            email: user.email,
            channelName: user.channelName,
            phone: user.phone,
            logoId: user.logoId,
            logoUrl: user.logoUrl,
            token,
            subscribers: user.subscribers,
            subscribedChannels: user.subscribedChannels
        });

    } catch (error) {
        log.error(location, error);
        res.status(500).json({ msg: "Login failed" });
    }
});

// ✅ Subscribe Route
Router.put('/subscribe/:userBId', checkAuth, async (req, res) => {
    const location = 'PUT /subscribe/:userBId';
    try {
        const token = req.headers.authorization.split(" ")[1];
        const userA = jwt.verify(token, "sagar");

        const userB = await User.findById(req.params.userBId);
        if (!userB) return res.status(404).json({ error: "User to subscribe not found" });

        if (userB.subscribedBy.includes(userA._id)) {
            log.warn(location, `User ${userA._id} already subscribed to ${userB._id}`);
            return res.status(400).json({ error: 'Already subscribed' });
        }

        userB.subscribers += 1;
        userB.subscribedBy.push(userA._id);
        await userB.save();

        const userAFull = await User.findById(userA._id);
        userAFull.subscribedChannels.push(userB._id);
        await userAFull.save();

        log.info(location, `User ${userA._id} subscribed to ${userB._id}`);

        res.status(200).json({ msg: "Subscribed successfully" });

    } catch (error) {
        log.error(location, error);
        res.status(500).json({ msg: "Subscription failed" });
    }
});

// ✅ Unsubscribe Route
Router.put("/unsubscribe/:userBId", checkAuth, async (req, res) => {
    const location = 'PUT /unsubscribe/:userBId';
    try {
        const token = req.headers.authorization.split(" ")[1];
        const userA = jwt.verify(token, "sagar");

        const userB = await User.findById(req.params.userBId);
        if (!userB) return res.status(404).json({ error: "User to unsubscribe not found" });

        if (!userB.subscribedBy.includes(userA._id)) {
            log.warn(location, `User ${userA._id} is not subscribed to ${userB._id}`);
            return res.status(400).json({ msg: "Not subscribed" });
        }

        userB.subscribers -= 1;
        userB.subscribedBy = userB.subscribedBy.filter(id => id.toString() !== userA._id);
        await userB.save();

        const userAFull = await User.findById(userA._id);
        userAFull.subscribedChannels = userAFull.subscribedChannels.filter(id => id.toString() !== userB._id.toString());
        await userAFull.save();

        log.info(location, `User ${userA._id} unsubscribed from ${userB._id}`);

        res.status(200).json({ msg: "Unsubscribed successfully" });

    } catch (error) {
        log.error(location, error);
        res.status(500).json({ msg: "Unsubscription failed" });
    }
});

module.exports = Router;
