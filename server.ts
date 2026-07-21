import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

interface Post {
  id: string;
  title: string;
  author: string;
  category: string;
  tags: string[];
  description: string;
  filename: string;
  sizeKb: number;
  passcode: string;
  likes: number;
  createdAt: number;
  content: string;
  imageUrl?: string;
}

const DATA_DIR = path.join(process.cwd(), "data");
const DB_FILE = path.join(DATA_DIR, "db.json");

// Helper to ensure database file exists
function initDb() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify([], null, 2), "utf-8");
  }
}

// Read database
function readDb(): Post[] {
  try {
    initDb();
    const data = fs.readFileSync(DB_FILE, "utf-8");
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading database:", err);
    return [];
  }
}

// Write database
function writeDb(data: Post[]) {
  try {
    initDb();
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing database:", err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ limit: "15mb", extended: true }));

  // API Endpoints

  // GET: All posts (without the actual file contents for performance)
  app.get("/api/posts", (req, res) => {
    try {
      const posts = readDb();
      // Map to remove content field to keep response compact
      const list = posts.map(({ content, ...rest }) => rest);
      res.json(list);
    } catch (err) {
      res.status(500).json({ error: "Erro ao ler posts" });
    }
  });

  // GET: Individual post with file content for download
  app.get("/api/posts/:id", (req, res) => {
    try {
      const { id } = req.params;
      const posts = readDb();
      const post = posts.find((p) => p.id === id);
      if (!post) {
        return res.status(404).json({ error: "Construção não encontrada" });
      }
      res.json(post);
    } catch (err) {
      res.status(500).json({ error: "Erro ao obter dados da construção" });
    }
  });

  // POST: Create a new post
  app.post("/api/posts", (req, res) => {
    try {
      const { title, author, category, tags, description, filename, sizeKb, passcode, content, imageUrl } = req.body;

      if (!title || !author || !category || !filename || !content || !passcode) {
        return res.status(400).json({ error: "Campos obrigatórios ausentes" });
      }

      const posts = readDb();
      const id = "p_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

      const newPost: Post = {
        id,
        title: title.substring(0, 80),
        author: author.substring(0, 40),
        category,
        tags: Array.isArray(tags) ? tags.map((t: string) => t.trim()).filter(Boolean) : [],
        description: (description || "").substring(0, 500),
        filename: filename.substring(0, 100),
        sizeKb: Number(sizeKb) || 1,
        passcode: passcode.substring(0, 40),
        likes: 0,
        createdAt: Date.now(),
        content,
        imageUrl: imageUrl ? String(imageUrl) : undefined
      };

      posts.push(newPost);
      writeDb(posts);

      res.status(210).json(newPost);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erro ao salvar post" });
    }
  });

  // POST: Like a post
  app.post("/api/posts/:id/like", (req, res) => {
    try {
      const { id } = req.params;
      const posts = readDb();
      const idx = posts.findIndex((p) => p.id === id);
      if (idx === -1) {
        return res.status(404).json({ error: "Post não encontrado" });
      }

      posts[idx].likes = (posts[idx].likes || 0) + 1;
      writeDb(posts);

      res.json({ id, likes: posts[idx].likes });
    } catch (err) {
      res.status(500).json({ error: "Erro ao curtir post" });
    }
  });

  // DELETE: Delete a post
  app.post("/api/posts/:id/delete", (req, res) => {
    try {
      const { id } = req.params;
      const { passcode } = req.body;

      if (!passcode) {
        return res.status(400).json({ error: "Código de gerenciamento é necessário" });
      }

      const posts = readDb();
      const post = posts.find((p) => p.id === id);

      if (!post) {
        return res.status(404).json({ error: "Post não encontrado" });
      }

      if (post.passcode !== passcode) {
        return res.status(403).json({ error: "Código de gerenciamento inválido" });
      }

      const filtered = posts.filter((p) => p.id !== id);
      writeDb(filtered);

      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Erro ao excluir post" });
    }
  });

  // GET: Export entire database in JSON format
  app.get("/api/export", (req, res) => {
    try {
      const posts = readDb();
      res.setHeader("Content-Disposition", "attachment; filename=blockframe_archive_export.json");
      res.setHeader("Content-Type", "application/json");
      res.send(JSON.stringify(posts, null, 2));
    } catch (err) {
      res.status(500).json({ error: "Erro ao exportar banco de dados" });
    }
  });

  // POST: Import JSON data
  app.post("/api/import", (req, res) => {
    try {
      const { data } = req.body;
      if (!Array.isArray(data)) {
        return res.status(400).json({ error: "Dados inválidos: deve ser um array de posts" });
      }

      const posts = readDb();
      let importedCount = 0;

      for (const item of data) {
        if (item.id && item.title && item.author && item.content) {
          // Check if it already exists to avoid duplication, or overwrite
          const existingIdx = posts.findIndex((p) => p.id === item.id);
          const formatted: Post = {
            id: item.id,
            title: String(item.title).substring(0, 80),
            author: String(item.author).substring(0, 40),
            category: String(item.category || "Outro"),
            tags: Array.isArray(item.tags) ? item.tags.map((t: any) => String(t).trim()).filter(Boolean) : [],
            description: String(item.description || "").substring(0, 500),
            filename: String(item.filename || "file.bf").substring(0, 100),
            sizeKb: Number(item.sizeKb) || 1,
            passcode: String(item.passcode || "1234"),
            likes: Number(item.likes) || 0,
            createdAt: Number(item.createdAt) || Date.now(),
            content: String(item.content),
            imageUrl: item.imageUrl ? String(item.imageUrl) : undefined
          };

          if (existingIdx !== -1) {
            posts[existingIdx] = formatted;
          } else {
            posts.push(formatted);
          }
          importedCount++;
        }
      }

      writeDb(posts);
      res.json({ success: true, count: importedCount });
    } catch (err) {
      res.status(500).json({ error: "Erro ao importar dados" });
    }
  });

  // Serve Frontend with Vite middleware (development) or static files (production)
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`BlockFrame server running on port ${PORT}`);
  });
}

startServer();
