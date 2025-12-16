import express from "express";
import fetch from "node-fetch";
import jwt from "jsonwebtoken";
import cors from "cors";
import fs from "fs";

const app = express();
app.use(cors());
app.use(express.json());

const USERS_FILE = "./users.json";
const JWT_SECRET = process.env.JWT_SECRET;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, JSON.stringify([]));
}

function loadUsers() {
  return JSON.parse(fs.readFileSync(USERS_FILE));
}

function saveUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
}

app.post("/auth/google", async (req, res) => {
  const { credential } = req.body;

  const r = await fetch("https://oauth2.googleapis.com/tokeninfo?id_token=" + credential);
  const data = await r.json();

  if (data.aud !== GOOGLE_CLIENT_ID) {
    return res.status(401).json({ error: "Invalid token" });
  }

  let users = loadUsers();
  let user = users.find(u => u.sub === data.sub);

  if (!user) {
    user = {
      sub: data.sub,
      email: data.email,
      name: data.name,
      picture: data.picture,
      created: Date.now()
    };
    users.push(user);
    saveUsers(users);
  }

  const token = jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });

  res.json({ token, user });
});

app.get("/me", (req, res) => {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).end();

  try {
    const user = jwt.verify(auth.split(" ")[1], JWT_SECRET);
    res.json(user);
  } catch {
    res.status(401).end();
  }
});

app.listen(8787, () => console.log("Auth server running"));
const PORT = process.env.PORT || 8787;
app.listen(PORT, () => console.log("Auth server running on", PORT));
