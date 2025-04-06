import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import db from '../config/db.js'; // Make sure to use the .js extension
import moment from 'moment';
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
        
        // Determine redirection URL based on role
        let redirectURL = "/";
        if (role === "admin") redirectURL = "/adminDashboard";
        else if (role === "resident") redirectURL = "/residentDashboard";
        else if (role === "security") redirectURL = "/logVisitors";

        // Respond with token and redirect URL
        res.status(200).json({ token, redirect: redirectURL });
    });
});


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

        const resetLink = `http://localhost:5000/resetPassword.html?token=${token}`;
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


router.get("/viewProfile", (req, res) => {
    const email = req.query.email;
    const role = req.query.role;

    if (!email || !role) {
        return res.status(400).json({ error: "Email and role are required" });
    }

    let tableName;
    if (role === "admin") tableName = "admins";
    else if (role === "resident") tableName = "residents";
    else return res.status(400).json({ error: "Invalid role" });

    const sql = `
        SELECT block, flat_no, admin_name, contact_no, flat_status, email 
        FROM ${tableName} WHERE email = ?
    `;

    db.query(sql, [email], (err, results) => {
        if (err) {
            console.error("Database error:", err);
            return res.status(500).json({ error: "Internal server error" });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: "User not found" });
        }

        res.json(results[0]); // Send user details
    });
});


//Admin List Module 

// Get all admins
router.get("/admins", (req, res) => {
    db.query("SELECT * FROM admins", (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(results);
        }
    });
});

router.get("/adminRsdList", (req, res) => {
    db.query("SELECT * FROM admins", (err, results) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(results);
        }
    });
});

// Add a new admin
router.post("/admins/add", (req, res) => {
    console.log("Received Data:", req.body);

    const { block, flat_no, admin_name, contact_no, flat_status, email } = req.body;

    // Check for missing fields
    if (!block || !flat_no || !admin_name || !contact_no || !flat_status || !email) {
        console.log("Missing Fields:", req.body);
        return res.status(400).json({ error: "Missing required fields" });
    }

    // Validate contact number (must be 10 digits)
    if (!/^\d{10}$/.test(contact_no)) {
        return res.status(400).json({ error: "Contact number must be exactly 10 digits" });
    }

    // Check if email already exists in the database
    const checkEmailSql = "SELECT * FROM admins WHERE email = ?";
    db.query(checkEmailSql, [email], (err, results) => {
        if (err) {
            console.error("Database Error:", err);
            return res.status(500).json({ error: err.message });
        }

        if (results.length > 0) {
            // Email already exists
            return res.status(400).json({ error: "This email is already registered. Please use a different email." });
        }

        // Insert new admin if email is unique
        const insertSql = "INSERT INTO admins (block, flat_no, admin_name, contact_no, flat_status, email) VALUES (?, ?, ?, ?, ?, ?)";
        db.query(insertSql, [block, flat_no, admin_name, contact_no, flat_status, email], (err, result) => {
            if (err) {
                console.error("Database Error:", err);
                return res.status(500).json({ error: err.message });
            }

            console.log("Insert Successful:", result);
            res.status(201).json({ message: "Admin added successfully", insertedId: result.insertId });
        });
    });
});

// Route to check if block and flat_no already exist
router.get("/admins/check", async (req, res) => {
    try {
        const { block, flat_no } = req.query;

        if (!block || !flat_no) {
            return res.status(400).json({ error: "Block and Flat No are required" });
        }

        // Check if the given block and flat_no exist in the database
        const query = "SELECT * FROM admins WHERE block = ? AND flat_no = ?";
        db.query(query, [block, flat_no], (err, results) => {
            if (err) {
                return res.status(500).json({ error: "Database error" });
            }

            if (results.length > 0) {
                return res.json({ exists: true });
            } else {
                return res.json({ exists: false });
            }
        });
    } catch (error) {
        res.status(500).json({ error: "Internal server error" });
    }
});



// Get admin by block and flat_no
router.get("/admins/:block/:flat_no", (req, res) => {
    const { block, flat_no } = req.params;

    console.log(`Received Block: ${block}`);
    console.log(`Received Flat No: ${flat_no}`);

    const query = "SELECT * FROM admins WHERE block = ? AND flat_no = ?";
    db.query(query, [block, flat_no], (err, result) => {
        if (err) {
            console.error("Database Error:", err);
            return res.status(500).json({ error: err.message });
        }

        console.log("Query Result:", result); // Log database response

        if (result.length === 0) {
            return res.status(404).json({ error: "Admin not found" });
        } 

        res.json(result[0]);
    });
});

// Update admin details
router.put("/admins/edit/:id", (req, res) => {
    const { id } = req.params;
    const { admin_name, contact_no, flat_status, email } = req.body;

    const sql = "UPDATE admins SET admin_name = ?, contact_no = ?, flat_status = ?, email = ? WHERE id = ?";
    db.query(sql, [admin_name, contact_no, flat_status, email, id], (err, result) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json({ message: "Admin updated successfully" });
        }
    });
});


// Delete an admin
router.delete("/admins/delete/:block/:flat_no", (req, res) => {
    let { block, flat_no } = req.params;

    block = block.trim().toLowerCase();
    flat_no = flat_no.trim();

    const query = "DELETE FROM admins WHERE block = ? AND flat_no = ?";

    db.query(query, [block, flat_no], (err, result) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ error: "Admin not found" });
        }

        res.json({ message: "Admin deleted successfully" });
    });
});


//Resident List Module

// Fetch all residents sorted by Block (case-insensitive) and Flat Number
router.get("/residents/show", (_req, res) => {
    db.query(
        "SELECT * FROM residents ORDER BY BINARY UPPER(block) ASC, flat_no ASC",
        (err, rows) => {
            if (err) {
                console.error("Database Error:", err);
                return res.status(500).json({ error: err.message });
            }
            res.json(rows);
        }
    );
});

// Search resident by block and flat number
router.get("/residents/search", (req, res) => {
    const { block, flat_no } = req.query;

    if (!block || !flat_no) {
        return res.status(400).json({ error: "Block and Flat Number are required" });
    }

    db.query(
        "SELECT * FROM residents WHERE block = ? AND flat_no = ?",
        [block, flat_no],
        (err, rows) => {
            if (err) {
                console.error("Search Error:", err);
                return res.status(500).json({ error: err.message });
            }

            if (rows.length === 0) {
                return res.json({ message: "Flat not found" });
            }

            res.json(rows[0]);
        }
    );
});

router.post("/residents/add", (req, res) => {
    const { block, flat_no, admin_name, contact_no, flat_status, email } = req.body;

    console.log("Received data:", req.body);

    if (!block || !flat_no) {
        return res.status(400).json({ message: "Block and Flat Number are required." });
    }

    // Check if the flat already exists
    const checkQuery = "SELECT * FROM residents WHERE block = ? AND flat_no = ?";

    db.query(checkQuery, [block, flat_no], (err, rows) => {
        if (err) {
            console.error("Database Error:", err);
            return res.status(500).json({ message: "Internal server error" });
        }

        if (rows.length > 0) {
            console.log("Flat already exists, not inserting.");
            return res.status(400).json({ error: "Flat already exists in the database." });
        }

        // Insert Query
        const insertQuery = `
            INSERT INTO residents (block, flat_no, admin_name, contact_no, flat_status, email) 
            VALUES (?, ?, ?, ?, ?, ?)
        `;

        const values = [
            block,
            flat_no,
            admin_name && admin_name.trim() !== "" ? admin_name : null,
            contact_no && contact_no.trim() !== "" ? contact_no : null,
            flat_status || "vacant",
            email && email.trim() !== "" ? email : null,
        ];

        console.log("Executing SQL Query:", insertQuery, values);

        db.query(insertQuery, values, (err, result) => {
            if (err) {
                console.error("Error adding flat/resident:", err);
                return res.status(500).json({ message: "Internal server error" });
            }

            res.status(201).json({ message: "Flat/Resident added successfully!" });
        });
    });
});

router.delete("/residents/delete", (req, res) => {
    const { block, flat_no } = req.body;

    if (!block || !flat_no) {
        return res.status(400).json({ message: "Block and flat number are required." });
    }

    // Check if the flat exists
    const checkQuery = "SELECT * FROM residents WHERE block = ? AND flat_no = ?";
    
    db.query(checkQuery, [block, flat_no], (err, rows) => {
        if (err) {
            console.error("Database Error:", err);
            return res.status(500).json({ message: "Internal server error" });
        }

        if (rows.length === 0) {
            return res.status(404).json({ message: "Flat not found" });
        }

        // Remove resident details, keep flat vacant
        const updateQuery = `
            UPDATE residents 
            SET admin_name = NULL, contact_no = NULL, email = NULL, flat_status = 'vacant' 
            WHERE block = ? AND flat_no = ?
        `;

        db.query(updateQuery, [block, flat_no], (err, result) => {
            if (err) {
                console.error("Error updating resident details:", err);
                return res.status(500).json({ message: "Internal server error" });
            }

            res.status(200).json({ message: "Resident details removed, flat set to vacant" });
        });
    });
});

// Search for a specific resident by Block & Flat Number
router.get("/residents/search", (req, res) => {
    const { block, flat_no } = req.query;

    if (!block || !flat_no) {
        return res.status(400).json({ message: "Block and flat number are required." });
    }

    const searchQuery = "SELECT * FROM residents WHERE block = ? AND flat_no = ?";

    db.query(searchQuery, [block, flat_no], (err, rows) => {
        if (err) {
            console.error("Error searching for resident:", err);
            return res.status(500).json({ message: "Internal server error" });
        }

        if (rows.length === 0) {
            return res.status(404).json({ message: "Flat not found" });
        }

        res.status(200).json(rows[0]);
    });
});

router.put("/residents/edit", (req, res) => {
    const { block, flat_no, admin_name, contact_no, flat_status, email } = req.body;

    if (!block || !flat_no) {
        return res.status(400).json({ message: "Block and flat number are required." });
    }

    // Check if the resident exists
    const checkQuery = "SELECT * FROM residents WHERE block = ? AND flat_no = ?";
    db.query(checkQuery, [block, flat_no], (err, rows) => {
        if (err) {
            console.error("Error checking resident:", err);
            return res.status(500).json({ message: "Internal server error" });
        }

        if (rows.length === 0) {
            return res.status(404).json({ message: "No resident found for the given block and flat number." });
        }

        // Update resident details
        const updateQuery = `
            UPDATE residents 
            SET admin_name = ?, contact_no = ?, email = ?, flat_status = ? 
            WHERE block = ? AND flat_no = ?
        `;

        const values = [
            admin_name || null,
            contact_no || null,
            email || null,
            flat_status || "vacant",
            block,
            flat_no
        ];

        db.query(updateQuery, values, (updateErr) => {
            if (updateErr) {
                console.error("Error updating resident:", updateErr);
                return res.status(500).json({ message: "Internal server error" });
            }

            res.status(200).json({ message: "Resident details updated successfully!" });
        });
    });
});

//Maintenacnce Ledger

// ✅ Format Date as YYYY-MM-DD (Standardized)
const formatDate = (dateString) => {
    return moment(dateString).format("YYYY-MM-DD");
};

// ✅ Get Net Funds
router.get("/net-funds", (req, res) => {
    const query = "SELECT net_funds FROM net_funds ORDER BY id DESC LIMIT 1";

    db.query(query, (error, results) => {
        if (error) {
            console.error("Error fetching net funds:", error);
            return res.status(500).json({ error: "Failed to fetch net funds" });
        }
        res.json({ net_funds: results[0]?.net_funds || 0 });
    });
});

// ✅ Set Initial Funds
router.post("/set-initial-funds", (req, res) => {
    const { amount } = req.body;

    if (!amount || isNaN(amount) || parseFloat(amount) <= 0) {
        return res.status(400).json({ error: "Please provide a valid amount." });
    }

    const fetchQuery = "SELECT net_funds FROM net_funds ORDER BY id DESC LIMIT 1";

    db.query(fetchQuery, (error, results) => {
        if (error) {
            console.error("Error fetching net funds:", error);
            return res.status(500).json({ error: "Failed to fetch net funds" });
        }

        let previousFunds = parseFloat(results[0]?.net_funds || 0);
        let newNetFunds = previousFunds + parseFloat(amount);

        const insertQuery = "INSERT INTO net_funds (net_funds) VALUES (?)";
        
        db.query(insertQuery, [newNetFunds], (err) => {
            if (err) {
                console.error("Error updating net funds:", err);
                return res.status(500).json({ error: "Failed to update net funds" });
            }
            res.json({ message: "Net funds updated successfully!", new_net_funds: newNetFunds });
        });
    });
});

// ✅ Add Expense (With Net Fund Check)
router.post("/add-expense", (req, res) => {
    const { date, description, amount } = req.body;

    // Ensure the date is in YYYY-MM-DD format
    const formattedDate = moment(date, "YYYY-MM-DD").format("YYYY-MM-DD");
    const day = moment(date, "YYYY-MM-DD").format("dddd");

    const fetchFundsQuery = "SELECT net_funds FROM net_funds ORDER BY id DESC LIMIT 1";

    db.query(fetchFundsQuery, (error, results) => {
        if (error) {
            console.error("Error fetching net funds:", error);
            return res.status(500).json({ error: "Failed to fetch net funds" });
        }

        let currentFunds = parseFloat(results[0]?.net_funds || 0);

        if (currentFunds - amount < 0) {
            return res.status(400).json({ error: "Insufficient funds! Net funds cannot go below zero." });
        }

        const insertExpenseQuery = "INSERT INTO expenses (date, day, description, amount) VALUES (?, ?, ?, ?)";
        
        db.query(insertExpenseQuery, [formattedDate, day, description, amount], (err) => {
            if (err) {
                console.error("Error adding expense:", err);
                return res.status(500).json({ error: "Failed to add expense" });
            }

            const updateFundsQuery = "UPDATE net_funds SET net_funds = net_funds - ? ORDER BY id DESC LIMIT 1";
            
            db.query(updateFundsQuery, [amount], (updateErr) => {
                if (updateErr) {
                    console.error("Error updating net funds:", updateErr);
                    return res.status(500).json({ error: "Failed to update net funds" });
                }

                res.json({ message: "Expense added successfully!" });
            });
        });
    });
});

// ✅ Edit Expense
router.put("/edit-expense/:id", (req, res) => {
    const { id } = req.params;
    let { date, description, amount } = req.body;

    amount = parseFloat(amount);

    // Format Date Properly
    const formattedDate = moment(date, "YYYY-MM-DD").format("YYYY-MM-DD");
    const day = moment(date, "YYYY-MM-DD").format("dddd");

    const fetchOldExpenseQuery = "SELECT amount FROM expenses WHERE id = ?";
    
    db.query(fetchOldExpenseQuery, [id], (error, results) => {
        if (error) {
            console.error("Error fetching old expense:", error);
            return res.status(500).json({ error: "Failed to fetch expense details" });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: "Expense not found" });
        }

        const oldAmount = parseFloat(results[0].amount);
        const amountDifference = amount - oldAmount;

        const updateExpenseQuery = 
            "UPDATE expenses SET date = ?, day = ?, description = ?, amount = ? WHERE id = ?";

        db.query(updateExpenseQuery, [formattedDate, day, description, amount, id], (updateErr) => {
            if (updateErr) {
                console.error("Error updating expense:", updateErr);
                return res.status(500).json({ error: "Failed to update expense" });
            }

            const updateNetFundsQuery = "UPDATE net_funds SET net_funds = net_funds - ? ORDER BY id DESC LIMIT 1";
            
            db.query(updateNetFundsQuery, [amountDifference], (fundsErr) => {
                if (fundsErr) {
                    console.error("Error updating net funds:", fundsErr);
                    return res.status(500).json({ error: "Failed to update net funds" });
                }

                res.json({ success: true, message: "Expense updated successfully" });
            });
        });
    });
});

// ✅ Delete Expense
router.delete("/delete-expense/:id", (req, res) => {
    const { id } = req.params;

    db.query("SELECT amount FROM expenses WHERE id = ?", [id], (err, results) => {
        if (err || results.length === 0) {
            return res.status(404).json({ error: "Expense not found" });
        }

        const amount = results[0].amount;

        db.query("DELETE FROM expenses WHERE id = ?", [id], (deleteErr) => {
            if (deleteErr) {
                return res.status(500).json({ error: "Failed to delete expense" });
            }

            db.query("UPDATE net_funds SET net_funds = net_funds + ? ORDER BY id DESC LIMIT 1", [amount], (fundsErr) => {
                if (fundsErr) {
                    console.error("Error updating net funds:", fundsErr);
                    return res.status(500).json({ error: "Failed to update net funds" });
                }

                res.json({ message: "Expense deleted successfully!" });
            });
        });
    });
});

// ✅ Fetch Expenses (Formatted Date)
router.get("/expenses", (req, res) => {
    db.query("SELECT * FROM expenses ORDER BY date DESC", (err, results) => {
        if (err) {
            return res.status(500).json({ error: "Failed to fetch expenses" });
        }

        results.forEach((expense) => {
            expense.date = moment(expense.date).format("YYYY-MM-DD");
        });

        res.json(results);
    });
});

// ✅ Filter Expenses
router.get("/filter-expenses", (req, res) => {
    let { monthYear, minAmount } = req.query;
    let query = "SELECT * FROM expenses WHERE 1=1";
    let params = [];

    if (monthYear) {
        const [year, month] = monthYear.split("-");
        query += " AND MONTH(date) = ? AND YEAR(date) = ?";
        params.push(month, year);
    }

    if (minAmount) {
        query += " AND amount >= ?";
        params.push(minAmount);
    }

    query += " ORDER BY date DESC";

    db.query(query, params, (err, results) => {
        if (err) {
            return res.status(500).json({ error: "Failed to filter expenses" });
        }

        results.forEach((expense) => {
            expense.date = moment(expense.date).format("YYYY-MM-DD");
        });

        res.json(results);
    });
});

// Fetch all residents sorted by Block (case-insensitive) and Flat Number
router.get("/show", (req, res) => {
    db.query(
        "SELECT * FROM residents ORDER BY BINARY UPPER(block) ASC, flat_no ASC",
        (err, results) => {
            if (err) {
                console.error("Database Error:", err);
                return res.status(500).json({ error: err.message });
            }
            res.json(results);
        }
    );
});

// Search resident by block and flat number
router.get("/search", (req, res) => {
    const { block, flat_no } = req.query;

    if (!block || !flat_no) {
        return res.status(400).json({ error: "Block and Flat Number are required" });
    }

    db.query(
        "SELECT * FROM residents WHERE block = ? AND flat_no = ?",
        [block, flat_no],
        (err, results) => {
            if (err) {
                console.error("Search Error:", err);
                return res.status(500).json({ error: err.message });
            }

            if (results.length === 0) {
                return res.json({ message: "Flat not found" });
            }

            res.json(results[0]);
        }
    );
});

// Filter residents dynamically by block, status, or both (case-insensitive)
router.get("/filter", (req, res) => {
    const { block, flat_status } = req.query;

    let query = "SELECT * FROM residents WHERE 1=1";
    const params = [];

    if (block) {
        query += " AND UPPER(block) = UPPER(?)"; // Makes block filter case-insensitive
        params.push(block);
    }

    if (flat_status) {
        query += " AND flat_status = ?";
        params.push(flat_status);
    }

    query += " ORDER BY BINARY UPPER(block) ASC, flat_no ASC"; // Sort results

    db.query(query, params, (err, results) => {
        if (err) {
            console.error("Filter Error:", err);
            return res.status(500).json({ error: err.message });
        }

        res.json(results);
    });
});

// Fetch all residents (Reset Functionality)
router.get("/reset", (req, res) => {
    db.query("SELECT * FROM residents", (err, results) => {
        if (err) {
            console.error("Reset Error:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results); // Return all flats
    });
});

// Fetch unique blocks for dropdown filter
router.get("/blocks", (req, res) => {
    db.query("SELECT DISTINCT block FROM residents ORDER BY block", (err, results) => {
        if (err) {
            console.error("Blocks Fetch Error:", err);
            return res.status(500).json({ error: err.message });
        }
        res.json(results);
    });
});

//Security Guard List Module

// Add a new guard
router.post("/guards/add", (req, res) => {
    const { badge_number, name, contact_no, email } = req.body;

    if (!badge_number || !name || !contact_no) {
        return res.status(400).json({ message: "Badge Number, Name, and Contact Number are required." });
    }

    const insertQuery = `
        INSERT INTO guards (badge_number, name, contact_no, email) 
        VALUES (?, ?, ?, ?)
    `;

    db.query(insertQuery, [badge_number, name, contact_no, email || null], (error, results) => {
        if (error) {
            console.error("Error adding guard:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
        res.status(201).json({ message: "Guard added successfully!" });
    });
});

// Delete a guard
router.delete("/delete/:badge_number", (req, res) => {
    const { badge_number } = req.params;

    const deleteQuery = "DELETE FROM guards WHERE badge_number = ?";

    db.query(deleteQuery, [badge_number], (error, result) => {
        if (error) {
            console.error("Error deleting guard:", error);
            return res.status(500).json({ message: "Internal server error" });
        }

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: "Guard not found." });
        }

        res.json({ message: "Guard deleted successfully!" });
    });
});

// Fetch all guards (sorted by block and badge number)
router.get("/admin/guards/show", (req, res) => {
    const query = `
        SELECT * FROM guards 
        ORDER BY 
            LEFT(badge_number, 1) COLLATE utf8mb4_general_ci, 
            CAST(SUBSTRING(badge_number, 2) AS UNSIGNED)
    `;

    db.query(query, (error, rows) => {
        if (error) {
            console.error("Error fetching guards:", error);
            return res.status(500).json({ message: "Internal server error" });
        }

        res.json(rows);
    });
});

router.get("/resi/guards/show", (req, res) => {
    const query = `
        SELECT * FROM guards 
        ORDER BY 
            LEFT(badge_number, 1) COLLATE utf8mb4_general_ci, 
            CAST(SUBSTRING(badge_number, 2) AS UNSIGNED)
    `;

    db.query(query, (error, rows) => {
        if (error) {
            console.error("Error fetching guards:", error);
            return res.status(500).json({ message: "Internal server error" });
        }

        res.json(rows);
    });
});

// Fetch a single guard
router.get("/:badge_number", (req, res) => {
    const { badge_number } = req.params;

    db.query("SELECT * FROM guards WHERE badge_number = ?", [badge_number], (error, result) => {
        if (error) {
            console.error("Error fetching guard details:", error);
            return res.status(500).json({ error: "Internal server error" });
        }

        if (result.length === 0) {
            return res.status(404).json({ error: "Guard not found" });
        }

        res.json(result[0]);
    });
});


// Update guard details, including badge number change
router.put("/:old_badge_number", (req, res) => {
    const { old_badge_number } = req.params; // Previous badge number
    const { badge_number, name, contact_no, email } = req.body;

    if (!badge_number || !name || !contact_no) {
        return res.status(400).json({ error: "Badge Number, Name, and Contact No are required." });
    }

    // Check if guard exists
    db.query("SELECT * FROM guards WHERE badge_number = ?", [old_badge_number], (error, results) => {
        if (error) {
            console.error("Error fetching guard:", error);
            return res.status(500).json({ error: "Internal server error" });
        }

        if (results.length === 0) {
            return res.status(404).json({ error: "Guard not found." });
        }

        // If badge number is changed, check for duplicates
        if (badge_number !== old_badge_number) {
            db.query("SELECT * FROM guards WHERE badge_number = ?", [badge_number], (dupError, dupResults) => {
                if (dupError) {
                    console.error("Error checking duplicate badge number:", dupError);
                    return res.status(500).json({ error: "Internal server error" });
                }

                if (dupResults.length > 0) {
                    return res.status(400).json({ error: "New Badge Number already exists." });
                }

                // Update guard details with new badge number
                db.query(
                    "UPDATE guards SET badge_number=?, name=?, contact_no=?, email=? WHERE badge_number=?",
                    [badge_number, name, contact_no, email || null, old_badge_number],
                    (updateError) => {
                        if (updateError) {
                            console.error("Error updating guard details:", updateError);
                            return res.status(500).json({ error: "Internal server error" });
                        }
                        res.status(200).json({ message: "Guard details updated successfully!" });
                    }
                );
            });
        } else {
            // If badge number is not changing, update other details directly
            db.query(
                "UPDATE guards SET name=?, contact_no=?, email=? WHERE badge_number=?",
                [name, contact_no, email || null, old_badge_number],
                (updateError) => {
                    if (updateError) {
                        console.error("Error updating guard details:", updateError);
                        return res.status(500).json({ error: "Internal server error" });
                    }
                    res.status(200).json({ message: "Guard details updated successfully!" });
                }
            );
        }
    });
});

//Notifications and Alerts 

// Function to send email
function sendEmail(to, subject, message) {
    const mailOptions = {
        from: 'tarandeepkhurana2005@gmail.com',
        to: to,
        subject: subject,
        text: message
    };

    transporter.sendMail(mailOptions, (err, info) => {
        if (err) console.log(err);
        else console.log('Email sent:', info.response);
    });
}

// Add Notification
router.post('/add-notification', (req, res) => {
    const { title, description } = req.body;
    
    const sql = "INSERT INTO notifications (title, description) VALUES (?, ?)";
    db.query(sql, [title, description], (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: "Notification added!" });
    });
});

// Add Alert & Send Email
router.post('/add-alert', (req, res) => {
    const { title, description } = req.body;
    
    const sql = "INSERT INTO alerts (title, description) VALUES (?, ?)";
    db.query(sql, [title, description], (err, result) => {
        if (err) return res.status(500).json({ error: err });

        // Fetch resident emails
        db.query("SELECT email FROM residents", (err, users) => {
            if (err) return console.log(err);

            users.forEach(user => {
                const emailContent = `Description: ${description}\n`;
                sendEmail(user.email, `New Alert: ${title}`, emailContent);
            });
        });

        res.json({ message: "Alert added & emails sent!" });
    });
});

// Get Notifications
router.get('/admin/notifications', (req, res) => {
    console.log("📩 /notifications route hit!");
    db.query("SELECT * FROM notifications ORDER BY created_at DESC", (err, results) => {
        if (err) return res.status(500).json({ error: err });
        console.log("Notifications data:", results);
        res.json(results);
    });
});

// Get Alerts
router.get('/admin/alerts', (req, res) => {
    console.log("🚨 /alerts route hit!");
    db.query("SELECT * FROM alerts ORDER BY created_at DESC", (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
});

router.get('/resi/notifications', (req, res) => {
    console.log("📩 /notifications route hit!");
    db.query("SELECT * FROM notifications ORDER BY created_at DESC", (err, results) => {
        if (err) return res.status(500).json({ error: err });
        console.log("Notifications data:", results);
        res.json(results);
    });
});

// Get Alerts
router.get('/resi/alerts', (req, res) => {
    console.log("🚨 /alerts route hit!");
    db.query("SELECT * FROM alerts ORDER BY created_at DESC", (err, results) => {
        if (err) return res.status(500).json({ error: err });
        res.json(results);
    });
});

// Delete Notification
router.delete('/delete-notification/:id', (req, res) => {
    const { id } = req.params;
    db.query("DELETE FROM notifications WHERE id = ?", [id], (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: "Notification deleted!" });
    });
});

// Delete Alert
router.delete('/delete-alert/:id', (req, res) => {
    const { id } = req.params;
    db.query("DELETE FROM alerts WHERE id = ?", [id], (err, result) => {
        if (err) return res.status(500).json({ error: err });
        res.json({ message: "Alert deleted!" });
    });
});

//Complaint and Service Request

// API to submit a new request (Residents Only)
router.post('/submit-request', (req, res) => {
    const { type, title, description } = req.body;
    const sql = "INSERT INTO requests (type, title, description, status) VALUES (?, ?, ?, 'Pending')";
    db.query(sql, [type, title, description], (err) => {
      if (err) return res.status(500).send({ error: err.message });
      res.json({ message: "Request submitted successfully!" });
    });
  });
  
  // API to fetch pending requests
router.get('/admin/pending-requests', (req, res) => {
    db.query("SELECT * FROM requests WHERE status = 'Pending'", (err, results) => {
      if (err) return res.status(500).send({ error: err.message });
      res.json(results);
    });
  });
  
  // API to fetch completed requests
router.get('/admin/completed-requests', (req, res) => {
    db.query("SELECT * FROM requests WHERE status = 'Completed'", (err, results) => {
      if (err) return res.status(500).send({ error: err.message });
      res.json(results);
    });
  });
  
router.get('/resi/pending-requests', (req, res) => {
    db.query("SELECT * FROM requests WHERE status = 'Pending'", (err, results) => {
      if (err) return res.status(500).send({ error: err.message });
      res.json(results);
    });
  });
  
  // API to fetch completed requests
router.get('/resi/completed-requests', (req, res) => {
    db.query("SELECT * FROM requests WHERE status = 'Completed'", (err, results) => {
      if (err) return res.status(500).send({ error: err.message });
      res.json(results);
    });
  });

  // API to update status (Admin Only)
router.put('/update-status/:id', (req, res) => {
    const { id } = req.params;
    db.query("UPDATE requests SET status = 'Completed' WHERE id = ?", [id], (err) => {
      if (err) return res.status(500).send({ error: err.message });
      res.json({ message: "Status updated successfully!" });
    });
  });
  
//Generate Polls

// ✅ Fetch active polls
router.get('/polls/active', (req, res) => {
    db.query("SELECT * FROM polls WHERE status = 'active'", (error, results) => {
        if (error) {
            console.error("Error fetching active polls:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
        res.json(results);
    });
});

// ✅ Resident votes on a poll
router.post('/polls/vote', (req, res) => {
    const { email, poll_id, choice } = req.body;

    // Check if email exists in residents table
    db.query("SELECT * FROM residents WHERE email = ?", [email], (err, residentResult) => {
        if (err) {
            console.error("Error checking email:", err);
            return res.status(500).json({ message: "Internal server error" });
        }
        if (residentResult.length === 0) {
            return res.status(400).json({ message: "Email not found" });
        }

        // Check if resident already voted
        db.query("SELECT * FROM votes WHERE poll_id = ? AND email = ?", [poll_id, email], (err, voteResult) => {
            if (err) {
                console.error("Error checking previous vote:", err);
                return res.status(500).json({ message: "Internal server error" });
            }
            if (voteResult.length > 0) {
                return res.status(400).json({ message: "You have already voted" });
            }

            // Save vote
            db.query("INSERT INTO votes (poll_id, email, choice) VALUES (?, ?, ?)", [poll_id, email, choice], (err) => {
                if (err) {
                    console.error("Error saving vote:", err);
                    return res.status(500).json({ message: "Internal server error" });
                }
                res.status(200).json({ message: "Vote cast successfully" });
            });
        });
    });
});

// ✅ Admin closes a poll
router.post('/polls/close', (req, res) => {
    const { poll_id } = req.body;
    db.query("UPDATE polls SET status = 'closed' WHERE id = ?", [poll_id], (error) => {
        if (error) {
            console.error("Error closing poll:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
        res.status(200).json({ message: "Poll closed successfully" });
    });
});

// ✅ Fetch past polls & results
router.get('/polls/past', (req, res) => {
    db.query("SELECT * FROM polls WHERE status = 'closed'", (error, results) => {
        if (error) {
            console.error("Error fetching past polls:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
        res.json(results);
    });
});


// ✅ Function to send email notifications
function sendPollEmail(email, pollQuestion, pollId) {
    const mailOptions = {
        from: 'tarandeepkhurana2005@gmail.com',
        to: email,
        subject: 'New Voting Poll Alert',
        html: `<p>A new poll has been created: <b>${pollQuestion}</b></p>` // Adjust frontend URL
    };

    transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
            console.error("Email sending error:", err);
        } else {
            console.log(`Email sent to ${email}: ${info.response}`);
        }
    });
}

// ✅ Admin creates a new poll & sends email alerts
router.post('/polls/create', (req, res) => {
    const { question, options } = req.body;
    
    // Insert the poll into the database
    db.query(
        "INSERT INTO polls (question, options) VALUES (?, ?)",
        [question, JSON.stringify(options)],
        (error, result) => {
            if (error) {
                console.error("Error creating poll:", error);
                return res.status(500).json({ message: "Internal server error" });
            }

            const pollId = result.insertId;

            // Fetch all residents' emails
            db.query("SELECT email FROM residents", (err, residents) => {
                if (err) {
                    console.error("Error fetching emails:", err);
                    return res.status(500).json({ message: "Error fetching resident emails" });
                }

                residents.forEach(resident => {
                    if (resident.email) {
                        sendPollEmail(resident.email, question, pollId);
                    }
                });

                res.status(201).json({ message: "Poll created & emails sent!", poll_id: pollId });
            });
        }
    );
});

// ✅ Fetch poll results
router.get('/polls/results/:poll_id', (req, res) => {
    const { poll_id } = req.params;

    const query = `
        SELECT choice, COUNT(*) as votes
        FROM votes
        WHERE poll_id = ?
        GROUP BY choice
        ORDER BY votes DESC;
    `;

    db.query(query, [poll_id], (error, results) => {
        if (error) {
            console.error("Error fetching poll results:", error);
            return res.status(500).json({ message: "Internal server error" });
        }
        res.json(results);
    });
});

//Visitor Management

// ✅ API to log a visitor
router.post('/log-visitor', (req, res) => {
    const { gate_no, contact, purpose, name, arrival_time, date } = req.body;
  
    const sql = `INSERT INTO visitors (gate_no, contact, purpose, name, arrival_time, date, departure_time) 
                 VALUES (?, ?, ?, ?, ?, ?, NULL)`;
  
    db.query(sql, [gate_no, contact, purpose, name, arrival_time, date], (err, result) => {
      if (err) {
        console.error("Error logging visitor:", err);
        return res.status(500).json({ error: "Failed to log visitor." });
      }
      res.json({ message: "Visitor logged successfully!", id: result.insertId });
    });
  });
  
  
// ✅ API to fetch today's visitors (both pending and completed check-outs)
router.get('/guard/visitors-today', (req, res) => {
    console.log("Fetching today's visitors...");
    const sql = `SELECT * FROM visitors WHERE date = CURDATE() ORDER BY arrival_time ASC`;
  
    db.query(sql, (err, results) => {
        if (err) {
            console.error("Error fetching today's visitors:", err);
            return res.status(500).json({ error: "Failed to fetch visitors." });
        }
        console.log("Fetched visitors from DB:", results);
        res.json(results);  // Send all visitors (both with and without departure time)
    });
});

// ✅ API to update departure time (disable update after submission)
router.put('/update-departure/:id', (req, res) => {
    const { departure_time } = req.body;
    const visitorId = req.params.id;

    const sql = `UPDATE visitors 
                 SET departure_time = ? 
                 WHERE id = ? AND departure_time IS NULL`; // Prevent further updates

    db.query(sql, [departure_time, visitorId], (err, result) => {
        if (err) {
            console.error("Error updating departure time:", err);
            return res.status(500).json({ error: "Failed to update departure time." });
        }
        if (result.affectedRows === 0) {
            return res.status(400).json({ error: "Cannot update. Departure time already set!" });
        }

        // Fetch updated visitor entry
        const fetchUpdatedVisitor = `SELECT * FROM visitors WHERE id = ?`;
        db.query(fetchUpdatedVisitor, [visitorId], (fetchErr, updatedResult) => {
            if (fetchErr) {
                console.error("Error fetching updated visitor:", fetchErr);
                return res.status(500).json({ error: "Failed to retrieve updated visitor." });
            }
            res.json(updatedResult[0]); // Return updated visitor details
        });
    });
});

  // ✅ API to fetch visitors by gate number or date
router.get('/guard/search-visitors', (req, res) => {
    const { gate_no, date } = req.query;
    let sql = "SELECT * FROM visitors WHERE 1=1";
    const params = [];
  
    if (gate_no) {
      sql += " AND gate_no = ?";
      params.push(gate_no);
    }
    if (date) {
      sql += " AND date = ?";
      params.push(date);
    }
  
    if (params.length === 0) {
      return res.status(400).json({ error: "Please provide at least one search filter (Gate No. or Date)." });
    }
  
    db.query(sql, params, (err, results) => {
      if (err) {
        console.error("Error searching visitors:", err);
        return res.status(500).json({ error: "Failed to fetch search results." });
      }
      res.json(results);
    });
  });
  
   // ✅ API to fetch visitors by gate number or date
router.get('/admin/search-visitors', (req, res) => {
    const { gate_no, date } = req.query;
    let sql = "SELECT * FROM visitors WHERE 1=1";
    const params = [];
  
    if (gate_no) {
      sql += " AND gate_no = ?";
      params.push(gate_no);
    }
    if (date) {
      sql += " AND date = ?";
      params.push(date);
    }
  
    if (params.length === 0) {
      return res.status(400).json({ error: "Please provide at least one search filter (Gate No. or Date)." });
    }
  
    db.query(sql, params, (err, results) => {
      if (err) {
        console.error("Error searching visitors:", err);
        return res.status(500).json({ error: "Failed to fetch search results." });
      }
      res.json(results);
    });
  });

export default router;