import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import path from 'path';
import authRoutes from './routes/authRoutes.js';

const app = express();
app.use(cors());
app.use(bodyParser.json());

const __dirname = path.dirname(decodeURI(new URL(import.meta.url).pathname)).substring(1);

app.use('/auth', authRoutes);

app.use(express.static(path.join(__dirname, '../frontend')));

// Serve Home.html as the main page
app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../frontend/Home.html'));
});

// Serve index.html (Login Page)
app.get('/login', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../frontend/index.html'));
});

// Serve signup.html
app.get('/signup', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../frontend/signup.html'));
});

// Serve reset-password page
app.get('/reset-password', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../frontend/resetPassword.html'));
});

// Serve admin dashboard
app.get('/adminDashboard', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../frontend/adminDashboard.html'));
});

// Serve resident dashboard
app.get('/residentDashboard', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../frontend/residentDashboard.html'));
});

// Serve security dashboard
app.get('/logVisitors', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../frontend/logVisitors.html'));
});

// Serve View Profile Page
app.get('/viewProfile', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../frontend/viewProfile.html'));
});

app.get('/adminRsdList', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../frontend/adminRsdList.html'));
});


// app.get('/admin', (req, res) => {
//   res.sendFile(path.resolve(__dirname, '../frontend/adminNotif.html'));
// });

// app.get('/resident', (req, res) => {
//   res.sendFile(path.resolve(__dirname, '../frontend/resiNotif.html'));
// });


const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
