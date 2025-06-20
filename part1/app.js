var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
var mysql = require('mysql2/promise');

var app = express();

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());

let db;

(async () => {
  try {
    // Connect to MySQL without specifying a database
    const connection = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '' // Set your MySQL root password
    });

    // Create the database if it doesn't exist
    await connection.query('CREATE DATABASE IF NOT EXISTS DogWalkService');
    await connection.end();

    // Now connect to the created database
    db = await mysql.createConnection({
      host: 'localhost',
      user: 'root',
      password: '',
      database: 'DogWalkService'
    });

    await db.execute("DELETE FROM WalkRatings");
    await db.execute("DELETE FROM WalkApplications");
    await db.execute("DELETE FROM WalkRequests");
    await db.execute("DELETE FROM Dogs");
    await db.execute("DELETE FROM Users");

    await db.execute(`INSERT INTO Users (username, email, password_hash, role) VALUES
      ('alice123', 'alice@example.com', 'hashed123', 'owner'),
      ('bobwalker', 'bob@example.com', 'hashed456', 'walker'),
      ('carol123', 'carol@example.com', 'hashed789', 'owner'),
      ('samdog', 'sam@example.com', 'hashsam123', 'owner'),
      ('evawalks', 'eva@example.com', 'hasheva456', 'walker')`);

    await db.execute(`INSERT INTO Dogs (owner_id, name, size)
      SELECT user_id, 'Max', 'medium' FROM Users WHERE username = 'alice123'`);
    await db.execute(`INSERT INTO Dogs (owner_id, name, size)
      SELECT user_id, 'Bella', 'small' FROM Users WHERE username = 'carol123'`);
    await db.execute(`INSERT INTO Dogs (owner_id, name, size)
      SELECT user_id, 'Duffy', 'large' FROM Users WHERE username = 'samdog'`);
    await db.execute(`INSERT INTO Dogs (owner_id, name, size)
      SELECT user_id, 'Newman', 'medium' FROM Users WHERE username = 'alice123'`);
    await db.execute(`INSERT INTO Dogs (owner_id, name, size)
      SELECT user_id, 'Luna', 'small' FROM Users WHERE username = 'carol123'`);

    await db.execute(`INSERT INTO WalkRequests (dog_id, requested_time, duration_minutes, location, status)
      SELECT dog_id, '2025-06-10 08:00:00', 30, 'Parklands', 'open' FROM Dogs WHERE name = 'Max'`);
    await db.execute(`INSERT INTO WalkRequests (dog_id, requested_time, duration_minutes, location, status)
      SELECT dog_id, '2025-06-10 09:30:00', 45, 'Beachside Ave', 'accepted' FROM Dogs WHERE name = 'Bella'`);
    await db.execute(`INSERT INTO WalkRequests (dog_id, requested_time, duration_minutes, location, status)
      SELECT dog_id, '2025-06-11 10:00:00', 60, 'City Park', 'open' FROM Dogs WHERE name = 'Duffy'`);
    await db.execute(`INSERT INTO WalkRequests (dog_id, requested_time, duration_minutes, location, status)
      SELECT dog_id, '2025-06-11 11:15:00', 30, 'Riverside Trail', 'completed' FROM Dogs WHERE name = 'Newman'`);
    await db.execute(`INSERT INTO WalkRequests (dog_id, requested_time, duration_minutes, location, status)
      SELECT dog_id, '2025-06-12 07:45:00', 20, 'Sunset Street', 'cancelled' FROM Dogs WHERE name = 'Luna'`);

  } catch (err) {
    console.error('Error setting up database. Ensure Mysql is running: service mysql start', err);
  }
})();

app.get('/api/dogs', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT d.name AS dog_name, d.size, u.username AS owner_username
      FROM Dogs d
      JOIN Users u ON d.owner_id = u.user_id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dogs' });
  }
});

app.get('/api/walkrequests/open', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT wr.request_id, d.name AS dog_name, wr.requested_time, wr.duration_minutes, wr.location, u.username AS owner_username
      FROM WalkRequests wr
      JOIN Dogs d ON wr.dog_id = d.dog_id
      JOIN Users u ON d.owner_id = u.user_id
      WHERE wr.status = 'open'
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch open walk requests' });
  }
});

app.get('/api/walkers/summary', async (req, res) => {
  try {
    const [rows] = await db.execute(`
      SELECT u.username AS walker_username,
             COUNT(r.rating_id) AS total_ratings,
             ROUND(AVG(r.rating), 1) AS average_rating,
             (
               SELECT COUNT(*) FROM WalkRequests wr
               JOIN WalkApplications wa ON wa.request_id = wr.request_id
               WHERE wa.walker_id = u.user_id AND wr.status = 'completed' AND wa.status = 'accepted'
             ) AS completed_walks
      FROM Users u
      LEFT JOIN WalkRatings r ON u.user_id = r.walker_id
      WHERE u.role = 'walker'
      GROUP BY u.user_id
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch walker summary' });
  }
});

app.use(express.static(path.join(__dirname, 'public')));

module.exports = app;