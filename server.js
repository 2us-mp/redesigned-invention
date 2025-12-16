import express from "express";
import fetch from "node-fetch";
import jwt from "jsonwebtoken";
import cors from "cors";

const app = express();
app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const PORT = process.env.PORT || 3000;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

/* ------------------ HEALTH ------------------ */
app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

/* ------------------ GOOGLE AUTH ------------------ */
app.post("/api/auth/google", async (req, res) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: "Missing credential" });
    }

    const googleRes = await fetch(
      `https://oauth2.googleapis.com/tokeninfo?id_token=${credential}`
    );
    const profile = await googleRes.json();

    if (profile.aud !== GOOGLE_CLIENT_ID) {
      return res.status(401).json({ error: "Invalid Google token" });
    }

    const user = {
      id: profile.sub,
      email: profile.email,
      name: profile.name,
      picture: profile.picture,
    };

    const token = jwt.sign(user, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: "Google auth failed" });
  }
});

/* ------------------ AUTH MIDDLEWARE ------------------ */
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "No auth" });

  try {
    const token = header.split(" ")[1];
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
}

/* ------------------ CURRENT USER ------------------ */
app.get("/api/me", auth, (req, res) => {
  res.json(req.user);
});

/* ------------------ iTUNES (UNCHANGED CORE) ------------------ */
app.get("/api/itunes/search", async (req, res) => {
  const { term, entity = "song", limit = 24 } = req.query;
  const url = `https://itunes.apple.com/search?term=${encodeURIComponent(
    term
  )}&entity=${entity}&limit=${limit}`;

  const r = await fetch(url);
  const data = await r.text();
  res.set("Content-Type", "application/json");
  res.send(data);
});

app.get("/api/itunes/lookup", async (req, res) => {
  const { id, entity } = req.query;
  const url = `https://itunes.apple.com/lookup?id=${id}${
    entity ? `&entity=${entity}` : ""
  }`;

  const r = await fetch(url);
  const data = await r.text();
  res.set("Content-Type", "application/json");
  res.send(data);
});

/* ------------------ START ------------------ */
app.listen(PORT, () => {
  console.log("Server running on", PORT);
});
