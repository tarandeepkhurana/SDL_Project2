import { createTransport } from 'nodemailer';

const transporter = createTransport({
    service: 'gmail',
    auth: {
        user: 'tarandeepkhurana2005@gmail.com',   // Your Gmail
        pass: 'hjcz oyah szbf amuf'      // Your App Password
    }
});

const mailOptions = {
    from: 'tarandeepkhurana2005@gmail.com',
    to: 'tarandeepkhurana2005@gmail.com',  // Replace with the email you want to send to
    subject: 'Testing Nodemailer',
    text: 'Hello! This is a test email from my Node.js application.'
};

transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
        console.log('Error:', error);
    } else {
        console.log('Email sent:', info.response);
    }
});
