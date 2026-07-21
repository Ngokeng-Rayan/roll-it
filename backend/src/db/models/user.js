const pool = require('../db');

const User = {
  async create({ phone_number, pseudo, password_hash }) {
    const { rows } = await pool.query(
      `INSERT INTO users (phone_number, pseudo, password_hash)
       VALUES ($1, $2, $3)
       RETURNING id, phone_number, pseudo, token_balance, created_at`,
      [phone_number, pseudo, password_hash]
    );
    return rows[0];
  },

  async findByLogin(login) {
    const { rows } = await pool.query(
      `SELECT * FROM users WHERE phone_number = $1`,
      [login]
    );
    return rows[0] || null;
  },

  async findById(id) {
    const { rows } = await pool.query(
      `SELECT id, phone_number, pseudo, token_balance, created_at FROM users WHERE id = $1`,
      [id]
    );
    return rows[0] || null;
  },

  async updateBalance(id, amount) {
    const { rows } = await pool.query(
      `UPDATE users SET token_balance = token_balance + $2 WHERE id = $1
       RETURNING token_balance`,
      [id, amount]
    );
    return rows[0];
  },
};

module.exports = User;
