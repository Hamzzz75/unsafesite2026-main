require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const multer = require('multer');
const { MongoClient, ObjectId } = require('mongodb');
const jwt = require('jsonwebtoken');
const argon2 = require('argon2');
const path = require('path');
const xss = require('xss');

const upload = multer({
  storage: multer.diskStorage({
    destination: path.join(__dirname, 'public', 'uploads'),
    filename: (req, file, cb) => {
      const ext = path.extname(file.originalname) || '';
      const name = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
      cb(null, name);
    }
  })
});

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tp_jwt_mongodb';

// ✅ JWT_SECRET obligatoire via .env
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('ERREUR : JWT_SECRET manquant dans .env');
  process.exit(1);
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

let db;

app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ✅ Brute Force : store en mémoire par IP
const loginAttempts = new Map(); // ip -> { count, blockedUntil }

function checkBruteForce(req, res, next) {
  const ip = req.ip;
  const now = Date.now();
  const data = loginAttempts.get(ip) || { count: 0, blockedUntil: null };

  if (data.blockedUntil && now < data.blockedUntil) {
    const remaining = Math.ceil((data.blockedUntil - now) / 1000 / 60);
    return res.status(429).json({
      error: `Votre IP est bloquée suite à 3 tentatives échouées. Réessayez dans ${remaining} minute(s).`,
      blocked: true
    });
  }

  // Reset si le blocage est expiré
  if (data.blockedUntil && now >= data.blockedUntil) {
    loginAttempts.delete(ip);
  }

  next();
}

function recordFailedAttempt(ip) {
  const data = loginAttempts.get(ip) || { count: 0, blockedUntil: null };
  data.count += 1;

  if (data.count >= 3) {
    data.blockedUntil = Date.now() + 15 * 60 * 1000; // bloqué 15 min
    data.count = 0;
    console.warn(`[SECURITY] IP bloquée : ${ip}`);
  }

  loginAttempts.set(ip, data);
  return data.count;
}

function resetAttempts(ip) {
  loginAttempts.delete(ip);
}

app.get('/', (req, res) => {
  res.redirect('/pages/login.html');
});

const PROTECTED_PAGES = [
  '/index.html',
  '/pages/profil.html',
  '/pages/users.html'
];

app.use((req, res, next) => {
  if (PROTECTED_PAGES.includes(req.path)) {
    const token = req.query.token;
    if (!token) {
      return res.redirect('/pages/login.html');
    }
    try {
      jwt.verify(token, JWT_SECRET);
      return next();
    } catch(e) {
      return res.redirect('/pages/login.html');
    }
  }
  next();
});

app.use(express.static(path.join(__dirname, 'public')));

function signToken(user) {
  return jwt.sign({
    id: user._id.toString(),
    username: user.username,
    email: user.email,
    role: user.role,
    isActive: user.isActive
  }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

function authRequired(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Token manquant' });

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Token invalide' });
  }
}

function adminRequired(req, res, next) {
  if (req.user && req.user.role === 'admin') return next();
  return res.status(403).json({ error: 'Admin uniquement' });
}

// ✅ Login sécurisé : brute force + validation stricte + argon2 uniquement
app.post('/api/auth/login', checkBruteForce, async (req, res) => {
  const { username, password } = req.body;

  // ✅ Validation stricte des types et longueurs (anti injection NoSQL)
  if (
    typeof username !== 'string' || typeof password !== 'string' ||
    username.length > 50 || password.length > 128
  ) {
    return res.status(400).json({ error: 'Identifiants invalides' });
  }

  const user = await db.collection('users').findOne({ username: String(username) });

  if (!user) {
    const count = recordFailedAttempt(req.ip);
    const remaining = 3 - count;
    if (remaining > 0) {
      return res.status(401).json({ error: `Identifiants invalides. ${remaining} tentative(s) restante(s) avant blocage.` });
    } else {
      return res.status(429).json({ error: 'Votre IP est bloquée suite à 3 tentatives échouées. Réessayez dans 15 minutes.', blocked: true });
    }
  }

  let passwordValid = false;
  try {
    // ✅ Argon2 uniquement, plus de comparaison en clair
    passwordValid = await argon2.verify(user.password, password);
  } catch(e) {
    return res.status(401).json({ error: 'Identifiants invalides' });
  }

  if (!passwordValid) {
    const count = recordFailedAttempt(req.ip);
    const remaining = 3 - count;
    if (remaining > 0) {
      return res.status(401).json({ error: `Identifiants invalides. ${remaining} tentative(s) restante(s) avant blocage.` });
    } else {
      return res.status(429).json({ error: 'Votre IP est bloquée suite à 3 tentatives échouées. Réessayez dans 15 minutes.', blocked: true });
    }
  }

  // ✅ Succès : reset du compteur
  resetAttempts(req.ip);

  const token = signToken(user);
  res.json({
    message: 'Connexion réussie',
    token,
    user: {
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      bio: user.bio
    }
  });
});

app.post('/api/auth/register', async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Nom utilisateur, email et mot de passe sont requis' });
  }

  // ✅ Validation des types
  if (typeof username !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Données invalides' });
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Le mot de passe doit faire au moins 8 caractères' });
  }

  const existing = await db.collection('users').findOne({ username: String(username) });
  if (existing) {
    return res.status(409).json({ error: 'Nom utilisateur déjà utilisé' });
  }

  const hashedPassword = await argon2.hash(password);

  const user = {
    username: xss(username),
    email: xss(email),
    password: hashedPassword,
    role: 'user',
    isActive: true,
    avatar: '/uploads/default.svg',
    bio: ''
  };

  const result = await db.collection('users').insertOne(user);
  res.status(201).json({
    message: 'Compte créé avec succès, veuillez vous connecter.',
    user: {
      id: result.insertedId,
      username,
      email,
      role: user.role
    }
  });
});

app.get('/api/me', authRequired, async (req, res) => {
  const user = await db.collection('users').findOne({ _id: new ObjectId(req.user.id) }, { projection: { password: 0 } });
  res.json(user);
});

app.get('/api/users', authRequired, async (req, res) => {
  const users = await db.collection('users').find({}, { projection: { password: 0 } }).toArray();
  res.json(users);
});

app.get('/api/users/:id', authRequired, async (req, res) => {
  try {
    const user = await db.collection('users').findOne({ _id: new ObjectId(req.params.id) }, { projection: { password: 0 } });
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    res.json(user);
  } catch (e) {
    res.status(400).json({ error: 'ObjectId invalide' });
  }
});

app.put('/api/users/:id', authRequired, upload.single('avatar'), async (req, res) => {
  try {
    const targetId = req.params.id;
    if (req.user.id !== targetId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const updates = {};
    // ✅ Sanitisation XSS sur tous les champs
    if (req.body.username) updates.username = xss(req.body.username);
    if (req.body.email)    updates.email    = xss(req.body.email);
    if (req.body.bio !== undefined) updates.bio = xss(req.body.bio);
    if (req.body.avatar !== undefined) updates.avatar = xss(req.body.avatar);
    if (req.file) {
      updates.avatar = `/uploads/${req.file.filename}`;
    }
    if (req.body.password) {
      if (req.body.password.length < 8) {
        return res.status(400).json({ error: 'Le mot de passe doit faire au moins 8 caractères' });
      }
      updates.password = await argon2.hash(req.body.password);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
    }

    const result = await db.collection('users').findOneAndUpdate(
      { _id: new ObjectId(targetId) },
      { $set: updates },
      { returnDocument: 'after', projection: { password: 0 } }
    );

    if (!result.value) return res.status(404).json({ error: 'Utilisateur introuvable' });
    res.json(result.value);
  } catch (e) {
    res.status(400).json({ error: 'ObjectId invalide' });
  }
});

app.get('/api/posts', authRequired, async (req, res) => {
  const includeAdmin = req.query.includeAdmin === 'true' && req.user.role === 'admin';
  const filter = includeAdmin ? {} : { visibility: 'public' };
  const posts = await db.collection('posts').aggregate([
    { $match: filter },
    { $sort: { createdAt: -1 } },
    {
      $lookup: {
        from: 'users',
        localField: 'authorId',
        foreignField: '_id',
        as: 'author'
      }
    },
    {
      $addFields: {
        author: { $arrayElemAt: ['$author', 0] }
      }
    },
    {
      $project: {
        title: 1,
        content: 1,
        visibility: 1,
        authorUsername: 1,
        authorId: 1,
        createdAt: 1,
        authorAvatar: '$author.avatar'
      }
    }
  ]).toArray();
  res.json(posts);
});

app.post('/api/posts', authRequired, async (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Titre et contenu obligatoires' });

  const post = {
    // ✅ Sanitisation XSS
    title: xss(title),
    content: xss(content),
    authorId: new ObjectId(req.user.id),
    authorUsername: req.user.username,
    visibility: 'public',
    createdAt: new Date()
  };
  const result = await db.collection('posts').insertOne(post);
  res.status(201).json({ ...post, _id: result.insertedId });
});

app.put('/api/posts/:id', authRequired, async (req, res) => {
  try {
    const postId = req.params.id;
    const post = await db.collection('posts').findOne({ _id: new ObjectId(postId) });
    if (!post) return res.status(404).json({ error: 'Post introuvable' });

    if (post.authorId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const updates = {};
    // ✅ Sanitisation XSS
    if (req.body.title)   updates.title   = xss(req.body.title);
    if (req.body.content) updates.content = xss(req.body.content);

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
    }

    await db.collection('posts').updateOne({ _id: new ObjectId(postId) }, { $set: updates });
    const updated = await db.collection('posts').findOne({ _id: new ObjectId(postId) });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: 'ObjectId invalide' });
  }
});

app.get('/api/admin', authRequired, adminRequired, async (req, res) => {
  const users = await db.collection('users').find({}, { projection: { password: 0 } }).toArray();
  const flags = await db.collection('flags').find({}).toArray();
  res.json({
    message: 'Bienvenue dans le panneau admin',
    users,
    flags
  });
});

app.get('/health', (req, res) => res.json({ status: 'ok' }));

MongoClient.connect(MONGO_URI)
  .then(client => {
    db = client.db();
    app.listen(PORT, () => {
      console.log(`TP disponible sur http://localhost:${PORT}`);
    });
  })
  .catch(err => {
    console.error('Erreur MongoDB', err);
    process.exit(1);
  });