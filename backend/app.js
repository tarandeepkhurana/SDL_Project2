import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import path from 'path';
import authRoutes from './routes/authRoutes.js';  // Ensure the path includes .js extension

const app = express();
app.use(cors());
app.use(bodyParser.json());
const __dirname = path.dirname(decodeURI(new URL(import.meta.url).pathname)).substring(1);
app.use(express.static(path.join(__dirname, '../frontend')));
app.use('/auth', authRoutes);
app.get('/', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../frontend/index.html')); // Navigate one level up to access the correct folder
});
// Serve signup.html when accessing the signup route
app.get('/signup', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../frontend/signup.html'));
});
app.get('/reset-password.html', (req, res) => {
  res.sendFile(path.resolve(__dirname, '../frontend/resetPassword.html'));
});
const PORT = 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

