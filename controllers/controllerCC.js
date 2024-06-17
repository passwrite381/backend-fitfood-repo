const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/firestoreDb.js');
let nanoid;
import('nanoid').then((module) => {
  nanoid = module.nanoid;
});

exports.getArticles = async (req, res) => {
    try {
        const articleRef = db.collection("articles");
        const response = await articleRef.get();
        let responseArr = [];
        response.forEach(doc => {
            responseArr.push(doc.data());
        });
        res.send(responseArr);
    } catch (error) {
        res.status(500).send(error);
    }
};

exports.getArticleById = async (req, res) => {
    try {
        const articleId = req.params.id;
        const articleRef = db.collection('articles').doc(articleId);
        const doc = await articleRef.get();
        if (!doc.exists) {
            res.status(404).send('No such article!');
        } else {
            res.send(doc.data());
        }
    } catch (error) {
        res.status(500).send(error);
    }
};

exports.getArticlesByCategory = async (req, res) => {
    try {
        const category = req.query.category;
        const articleRef = db.collection('articles');
        const response = await articleRef.where('category', '==', category).get();
        let responseArr = [];
        response.forEach(doc => {
            responseArr.push(doc.data());
        });
        res.send(responseArr);
    } catch (error) {
        res.status(500).send(error);
    }
};

exports.getArticleByIdAndCategory = async (req, res) => {
    try {
        const articleId = req.params.id;
        const category = req.query.category;
        const articleRef = db.collection('articles').doc(articleId);
        const doc = await articleRef.get();
        if (!doc.exists) {
            res.status(404).send('No such article!');
        } else {
            const data = doc.data();
            if (data.category === category) {
                res.send(data);
            } else {
                res.status(404).send('No article found for the given category!');
            }
        }
    } catch (error) {
        res.status(500).send(error);
    }
};

// Register
// Register
exports.registerUser = async (req, res) => {
    try {
        const { username, email, password, dateOfBirth } = req.body;

        // Validation
        if (!username || !email || !password || !dateOfBirth) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        if (username.length < 8 || password.length < 8) {
            return res.status(400).json({ message: 'Full name and password must be at least 8 characters long' });
        }

        const userRef = db.collection('user-data');
        const userSnapshot = await userRef.where('email', '==', email).get();
        if (!userSnapshot.empty) {
            return res.status(400).json({ message: 'Email already exists' });
        }

        const user_id = nanoid(10); // Generate a unique ID with length 10
        const hashedPassword = await bcrypt.hash(password, 10);
        const createdAt = new Date(); // Get current date and time
        await userRef.doc(user_id).set({ user_id, username, email, password: hashedPassword, date_of_birth: dateOfBirth, created_at: createdAt });

        const response = {
            status: 'Success',
            message: 'New member added successfully.',
            data: { userId: user_id }
        };

        res.status(201).json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};


// Login
exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validation
        if (!email || !password) {
            return res.status(400).json({ message: 'All fields are required' });
        }

        const userRef = db.collection('user-data');
        const userSnapshot = await userRef.where('email', '==', email).get();
        if (userSnapshot.empty) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        const userDoc = userSnapshot.docs[0];
        const user = userDoc.data();

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid password' });
        }

        const token = jwt.sign({ id: user.user_id, email: user.email }, process.env.JWT_SECRET, { expiresIn: '15m' });
        res.json({ message: 'Login successful', token, user });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

exports.updateUser = async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
            if (err) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const { id } = req.params;
            const { username, email, password } = req.body;
            const userRef = db.collection('user-data').doc(id);
            const userDoc = await userRef.get();
            if (!userDoc.exists) {
                return res.status(404).json({ message: 'User not found' });
            }

            // Validation
            if (!username || !email || !password) {
                return res.status(400).json({ message: 'All fields are required' });
            }

            const hashedPassword = await bcrypt.hash(password, 10);
            await userRef.update({ username, email, password: hashedPassword });

            res.json({ message: 'User updated successfully', user: {id, username, email } });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Delete User
exports.deleteUser = async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
            if (err) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const { id } = req.params;
            const userRef = db.collection('user-data').doc(id);
            const userDoc = await userRef.get();
            if (!userDoc.exists) {
                return res.status(404).json({ message: 'User not found' });
            }

            await userRef.delete();
            res.json({ message: 'User deleted successfully' });
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};



// Get all users
exports.getUsers = async (req, res) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        jwt.verify(token, process.env.JWT_SECRET, async (err, decoded) => {
            if (err) {
                return res.status(401).json({ message: 'Unauthorized' });
            }

            const userRef = db.collection('user-data');
            const response = await userRef.get();
            let responseArr = [];
            response.forEach(doc => {
                responseArr.push(doc.data());
            });
            res.json(responseArr);
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};



// Logout User
exports.logoutUser = async (req, res) => {
    try {
       
        res.cookie('jwt', '', { maxAge: 0, httpOnly: true });

     
        res.json({ message: 'Logout successful' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

// Get User by ID
exports.getUserById = async (req, res) => {
    try {
        const { id } = req.params;
        const userRef = db.collection('user-data').doc(id);
        const userDoc = await userRef.get();
        if (!userDoc.exists) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({ message: 'User found', user: userDoc.data() });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};
