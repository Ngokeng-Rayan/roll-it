const { Router } = require('express');
const bcrypt = require('bcryptjs');
const User = require('../db/models/user');
const { generateToken, expressAuth } = require('../middleware/auth');

const router = Router();

router.post('/signup', async (req, res) => {
  try {
    const { phone_number, pseudo, password } = req.body;

    if (!phone_number || !pseudo || !password) {
      return res.status(400).json({ error: 'Tous les champs sont requis.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Mot de passe : 6 caractères minimum.' });
    }
    if (pseudo.length < 2) {
      return res.status(400).json({ error: 'Pseudo : 2 caractères minimum.' });
    }

    const existing = await User.findByLogin(phone_number);
    if (existing) {
      return res.status(409).json({ error: 'Ce numéro/email est déjà utilisé.' });
    }

    const password_hash = await bcrypt.hash(password, 12);
    const user = await User.create({ phone_number, pseudo, password_hash });
    const token = generateToken(user.id);

    res.status(201).json({ token, user });
  } catch (err) {
    console.error('[AUTH] signup error:', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { phone_number, password } = req.body;

    if (!phone_number || !password) {
      return res.status(400).json({ error: 'Numéro/email et mot de passe requis.' });
    }

    const user = await User.findByLogin(phone_number);
    if (!user) {
      return res.status(401).json({ error: 'Identifiants incorrects.' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: 'Identifiants incorrects.' });
    }

    const token = generateToken(user.id);
    const { password_hash, ...safeUser } = user;

    res.json({ token, user: safeUser });
  } catch (err) {
    console.error('[AUTH] login error:', err.message);
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

router.get('/me', expressAuth, async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ error: 'Utilisateur introuvable.' });
    }
    res.json({ user });
  } catch (err) {
    res.status(500).json({ error: 'Erreur serveur.' });
  }
});

module.exports = router;
