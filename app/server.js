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
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const fs = require('fs');

const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];

const uploadMemory = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ALLOWED_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Extension non autorisée'));
    }
  }
});

function checkMagicBytes(buffer) {
  // JPEG : FF D8 FF
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return 'image/jpeg';
  // PNG : 89 50 4E 47
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) return 'image/png';
  // GIF : 47 49 46 38
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return 'image/gif';
  // WEBP : 52 49 46 46 ... 57 45 42 50
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return 'image/webp';
  return null;
}

async function validateAndSaveAvatar(req, res, next) {
  if (!req.file) return next();

  const mime = checkMagicBytes(req.file.buffer);

  if (!mime) {
    return res.status(400).json({ error: 'Contenu du fichier non autorisé — images uniquement' });
  }

  const extMap = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp'
  };

  const ext = extMap[mime];
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}${ext}`;
  const filepath = path.join(__dirname, 'public', 'uploads', filename);

  fs.writeFileSync(filepath, req.file.buffer);
  req.file.filename = filename;
  req.file.path = filepath;

  next();
}

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/tp_jwt_mongodb';

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('ERREUR : JWT_SECRET manquant dans .env');
  process.exit(1);
}
if (JWT_SECRET.length < 32) {
  console.error('ERREUR : JWT_SECRET trop court (minimum 32 caractères)');
  process.exit(1);
}

const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
const SERVER_INSTANCE_ID = Date.now().toString();

let db;

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(',');

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", "https://fonts.googleapis.com", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"]
    }
  },
  crossOriginEmbedderPolicy: false
}));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Origine non autorisée par la politique CORS'));
    }
  },
  credentials: true
}));

const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Trop de requêtes, réessayez dans 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 30,
  message: { error: 'Trop de requêtes API.' }
});

app.use(globalLimiter);
app.use('/api', apiLimiter);

app.use(morgan('dev'));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

const loginAttempts = new Map();
const registerAttempts = new Map();

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

  if (data.blockedUntil && now >= data.blockedUntil) {
    loginAttempts.delete(ip);
  }

  next();
}

function checkRegisterBruteForce(req, res, next) {
  const ip = req.ip;
  const now = Date.now();
  const data = registerAttempts.get(ip) || { count: 0, blockedUntil: null };

  if (data.blockedUntil && now < data.blockedUntil) {
    const remaining = Math.ceil((data.blockedUntil - now) / 1000 / 60);
    return res.status(429).json({
      error: `Trop de créations de compte. Réessayez dans ${remaining} minute(s).`,
      blocked: true
    });
  }

  if (data.blockedUntil && now >= data.blockedUntil) {
    registerAttempts.delete(ip);
  }

  next();
}

function recordFailedAttempt(ip) {
  const data = loginAttempts.get(ip) || { count: 0, blockedUntil: null };
  data.count += 1;

  if (data.count >= 3) {
    data.blockedUntil = Date.now() + 15 * 60 * 1000;
    data.count = 0;
    console.warn(`[SECURITY] IP bloquée login : ${ip}`);
  }

  loginAttempts.set(ip, data);
  return data.count;
}

function recordRegisterAttempt(ip) {
  const data = registerAttempts.get(ip) || { count: 0, blockedUntil: null };
  data.count += 1;

  if (data.count >= 5) {
    data.blockedUntil = Date.now() + 30 * 60 * 1000;
    data.count = 0;
    console.warn(`[SECURITY] IP bloquée register : ${ip}`);
  }

  registerAttempts.set(ip, data);
  return data.count;
}

function resetAttempts(ip) {
  loginAttempts.delete(ip);
}

const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/;

app.get('/', (req, res) => {
  res.redirect('/pages/login.html');
});

app.get('/api/server-instance', (req, res) => {
  res.json({ instanceId: SERVER_INSTANCE_ID });
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

app.post('/api/auth/login', checkBruteForce, async (req, res) => {
  const { username, password } = req.body;

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

app.post('/api/auth/register', checkRegisterBruteForce, async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ error: 'Nom utilisateur, email et mot de passe sont requis' });
  }

  if (typeof username !== 'string' || typeof email !== 'string' || typeof password !== 'string') {
    return res.status(400).json({ error: 'Données invalides' });
  }

  if (username.length > 50) return res.status(400).json({ error: 'Username trop long (50 max)' });
  if (email.length > 100) return res.status(400).json({ error: 'Email trop long (100 max)' });

  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!EMAIL_REGEX.test(email)) {
    return res.status(400).json({ error: 'Email invalide' });
  }

  if (!PASSWORD_REGEX.test(password)) {
    return res.status(400).json({
      error: 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre'
    });
  }

  recordRegisterAttempt(req.ip);

  const existing = await db.collection('users').findOne({ username: String(username) });
  if (existing) {
    return res.status(409).json({ error: 'Inscription impossible' });
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
  const user = await db.collection('users').findOne(
    { _id: new ObjectId(req.user.id) },
    { projection: { password: 0 } }
  );
  res.json(user);
});

app.get('/api/users', authRequired, async (req, res) => {
  const users = await db.collection('users').find({}, { projection: { password: 0, email: 0 } }).toArray();
  res.json(users);
});

app.get('/api/users/:id', authRequired, async (req, res) => {
  try {
    if (req.user.id !== req.params.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé' });
    }
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(req.params.id) },
      { projection: { password: 0 } }
    );
    if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
    res.json(user);
  } catch (e) {
    res.status(400).json({ error: 'Accès refusé' });
  }
});

app.put('/api/users/:id', authRequired, uploadMemory.single('avatar'), validateAndSaveAvatar, async (req, res) => {
  try {
    const targetId = req.params.id;
    if (req.user.id !== targetId && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const updates = {};
    if (req.body.username) {
      if (req.body.username.length > 50) return res.status(400).json({ error: 'Username trop long' });
      updates.username = xss(req.body.username);
    }
    if (req.body.email) {
      if (req.body.email.length > 100) return res.status(400).json({ error: 'Email trop long' });
      updates.email = xss(req.body.email);
    }
    if (req.body.bio !== undefined) updates.bio = xss(req.body.bio.slice(0, 500));
    if (req.body.avatar !== undefined) updates.avatar = xss(req.body.avatar);
    if (req.file) {
      updates.avatar = `/uploads/${req.file.filename}`;
    }
    if (req.body.password) {
      if (!PASSWORD_REGEX.test(req.body.password)) {
        return res.status(400).json({
          error: 'Le mot de passe doit contenir au moins 8 caractères, une majuscule, une minuscule et un chiffre'
        });
      }
      updates.password = await argon2.hash(req.body.password);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
    }

    const updatedUser = await db.collection('users').findOneAndUpdate(
      { _id: new ObjectId(targetId) },
      { $set: updates },
      { returnDocument: 'after', projection: { password: 0 } }
    );

    if (!updatedUser) return res.status(404).json({ error: 'Utilisateur introuvable' });
    res.json(updatedUser);
  } catch (e) {
    if (e instanceof multer.MulterError || e.message === 'Extension non autorisée') {
      return res.status(400).json({ error: e.message });
    }
    res.status(400).json({ error: 'Requête invalide' });
  }
});

app.get('/api/posts', authRequired, async (req, res) => {
  const includeAdmin = req.query.includeAdmin === 'true' && req.user.role === 'admin';
  const filter = includeAdmin ? {} : { visibility: 'public' };
  const posts = await db.collection('posts').aggregate([
    { $match: filter },
    { $sort: { createdAt: -1 } },
    { $limit: 100 },
    {
      $lookup: {
        from: 'users',
        localField: 'authorId',
        foreignField: '_id',
        as: 'author'
      }
    },
    { $addFields: { author: { $arrayElemAt: ['$author', 0] } } },
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
  if (title.length > 200) return res.status(400).json({ error: 'Titre trop long (200 max)' });
  if (content.length > 5000) return res.status(400).json({ error: 'Contenu trop long (5000 max)' });

  const post = {
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
    if (req.body.title) {
      if (req.body.title.length > 200) return res.status(400).json({ error: 'Titre trop long' });
      updates.title = xss(req.body.title);
    }
    if (req.body.content) {
      if (req.body.content.length > 5000) return res.status(400).json({ error: 'Contenu trop long' });
      updates.content = xss(req.body.content);
    }

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'Aucune donnée à mettre à jour' });
    }

    await db.collection('posts').updateOne({ _id: new ObjectId(postId) }, { $set: updates });
    const updated = await db.collection('posts').findOne({ _id: new ObjectId(postId) });
    res.json(updated);
  } catch (e) {
    res.status(400).json({ error: 'Requête invalide' });
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