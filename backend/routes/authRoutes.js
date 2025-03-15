import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import db from '../config/db.js'; // Make sure to use the .js extension
const router = express.Router();
const secretKey = 'yourSecretKey';

// Email validation function
const isValidEmail = (email) => {
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email);
};

// Register route
router.post('/register', async (req, res) => {
    const { email, password, role } = req.body;

    // Validate role
    const validRoles = ['admin', 'resident', 'security'];
    if (!validRoles.includes(role)) {
        return res.status(400).json({ message: 'Invalid role. Please choose between "admin", "resident", or "security"' });
    }

     // Validate email format
     const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
     if (!emailRegex.test(email)) {
         return res.status(400).json({ message: 'Invalid email format.' });
     }

     // Validate password length
    if (password.length < 8) {
        return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
    }

    // Check if the email is already taken
    const checkEmailQuery = 'SELECT * FROM users WHERE email = ?';
    db.query(checkEmailQuery, [email], async (err, results) => {
        if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ message: 'Database error. Please try again later.' });
        }
        if (results.length > 0) {
            return res.status(400).json({ message: 'Email is already in use.' });
        }

        // Hash the password before saving
        const hashedPassword = await bcrypt.hash(password, 10);

        const query = 'INSERT INTO users (email, password, role) VALUES (?, ?, ?)';
        db.query(query, [email, hashedPassword, role], (err, result) => {
            if (err) {
                console.error('Database error during registration:', err);
                return res.status(500).json({ message: 'Error registering user. Please try again.' });
            }
            res.status(201).json({ message: 'User registered successfully' });
        });
    });
});


// Login route
router.post('/login', (req, res) => {
    const { email, password, role } = req.body;

    // Validate email format
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ message: 'Invalid email format.' });
    }
    
    // Query the database for the user with the given email
    const query = 'SELECT * FROM users WHERE email = ?';
    db.query(query, [email], async (err, results) => {
        if (err) {
            console.error('Database error during login:', err);
            return res.status(500).json({ message: 'Database error. Please try again later.' });
        }

        // If no user is found with the given email
        if (results.length === 0) {
            return res.status(404).json({ message: 'User not found' });
        }

        const user = results[0];

        // Check if the provided role matches the role in the database
        if (user.role !== role) {
            return res.status(403).json({ message: 'Role mismatch. Please provide the correct role.' });
        }

        // Compare the password with the stored hash
        const isMatch = await bcrypt.compare(password, user.password);

        // If the password is incorrect
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid credentials. Please check your password.' });
        }

        // Generate JWT token
        const token = jwt.sign({ id: user.id, role: user.role }, secretKey, { expiresIn: '1h' });

        // Respond with the JWT token
        res.status(200).json({ token });
    });
});


// Use export default to export the router in ES modules
export default router;


// Create transporter for sending emails (configure your email service)
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'tarandeepkhurana2005@gmail.com',
        pass: 'hjcz oyah szbf amuf'
    }
});

// Forgot Password Route
router.post('/forgot-password', (req, res) => {
    const { email } = req.body;
    console.log('Forgot Password Request Received for:', email);
    const token = crypto.randomBytes(20).toString('hex');
    const expiry = Date.now() + 3600000; // Token valid for 1 hour

    const updateTokenQuery = 'UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE email = ?';
    db.query(updateTokenQuery, [token, expiry, email], (err, result) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        if (result.affectedRows === 0) return res.status(404).json({ message: 'Email not found' });

        const resetLink = `http://localhost:5000/reset-password.html?token=${token}`;
        const mailOptions = {
            to: email,
            subject: 'Password Reset Request',
            text: `Click the link to reset your password: ${resetLink}`
        };

        transporter.sendMail(mailOptions, (error) => {
            if (error) return res.status(500).json({ message: 'Error sending email' });
            res.status(200).json({ message: 'Reset link sent to your email' });
        });
    });
});

// Reset Password Route
router.post('/reset-password', async (req, res) => {
    const { token, newPassword } = req.body;

    const findUserQuery = 'SELECT * FROM users WHERE reset_token = ? AND reset_token_expiry > ?';
    db.query(findUserQuery, [token, Date.now()], async (err, results) => {
        if (err) return res.status(500).json({ message: 'Database error' });
        if (results.length === 0) return res.status(400).json({ message: 'Invalid or expired token' });

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        const updatePasswordQuery = 'UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE reset_token = ?';
        
        db.query(updatePasswordQuery, [hashedPassword, token], (updateErr) => {
            if (updateErr) return res.status(500).json({ message: 'Error resetting password' });
            res.status(200).json({ message: 'Password reset successful' });
        });
    });
});
