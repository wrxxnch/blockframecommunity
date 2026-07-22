import { Post, PostWithContent } from "../types";

// Helper for local database storage when running in static/offline environments (like GitHub Pages)
function getLocalDb(): PostWithContent[] {
  const data = localStorage.getItem("blockframe_local_db");
  return data ? JSON.parse(data) : [];
}

function saveLocalDb(db: PostWithContent[]) {
  localStorage.setItem("blockframe_local_db", JSON.stringify(db));
}

export async function fetchPosts(): Promise<Post[]> {
  try {
    const response = await fetch("/api/posts");
    if (!response.ok) {
      throw new Error("Falha ao carregar as construções.");
    }
    const posts = await response.json();
    // Cache locally
    localStorage.setItem("blockframe_last_synced_posts", JSON.stringify(posts));
    return posts;
  } catch (err) {
    console.warn("API offline, falling back to local storage:", err);
    const local = getLocalDb();
    if (local.length > 0) {
      return local.map(({ content, ...rest }) => rest);
    }
    const cache = localStorage.getItem("blockframe_last_synced_posts");
    return cache ? JSON.parse(cache) : [];
  }
}

export async function fetchPostDetails(id: string): Promise<PostWithContent> {
  try {
    const response = await fetch(`/api/posts/${id}`);
    if (!response.ok) {
      throw new Error("Falha ao obter os detalhes da construção.");
    }
    return response.json();
  } catch (err) {
    console.warn("API offline, fetching detail from local storage:", err);
    const db = getLocalDb();
    const post = db.find(p => p.id === id);
    if (post) return post;
    throw new Error("Construção não encontrada localmente.");
  }
}

export async function createPost(postData: {
  title: string;
  author: string;
  authorUid?: string;
  authorEmail?: string;
  category: string;
  tags: string[];
  description: string;
  filename: string;
  sizeKb: number;
  passcode: string;
  content: string;
  imageUrl?: string;
}): Promise<Post> {
  try {
    const response = await fetch("/api/posts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(postData),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || "Falha ao publicar a construção.");
    }

    const newPost = await response.json();
    // Also store fully locally to allow export
    const db = getLocalDb();
    db.push({ ...newPost, content: postData.content });
    saveLocalDb(db);
    return newPost;
  } catch (err: any) {
    console.warn("API offline, saving directly to local storage:", err);
    const id = "p_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    const newPost: PostWithContent = {
      id,
      title: postData.title.substring(0, 80),
      author: postData.author.substring(0, 40),
      authorUid: postData.authorUid,
      authorEmail: postData.authorEmail,
      category: postData.category,
      tags: postData.tags,
      description: postData.description.substring(0, 500),
      filename: postData.filename.substring(0, 100),
      sizeKb: postData.sizeKb,
      passcode: postData.passcode,
      likes: 0,
      createdAt: Date.now(),
      content: postData.content,
      imageUrl: postData.imageUrl,
    };
    const db = getLocalDb();
    db.push(newPost);
    saveLocalDb(db);
    return newPost;
  }
}

export async function likePost(id: string): Promise<{ id: string; likes: number }> {
  try {
    const response = await fetch(`/api/posts/${id}/like`, {
      method: "POST",
    });
    if (!response.ok) {
      throw new Error("Falha ao curtir.");
    }
    const result = await response.json();
    
    // Also update locally if cached
    const db = getLocalDb();
    const idx = db.findIndex(p => p.id === id);
    if (idx !== -1) {
      db[idx].likes = result.likes;
      saveLocalDb(db);
    }
    return result;
  } catch (err) {
    console.warn("API offline, liking locally:", err);
    const db = getLocalDb();
    const idx = db.findIndex(p => p.id === id);
    if (idx !== -1) {
      db[idx].likes = (db[idx].likes || 0) + 1;
      saveLocalDb(db);
      return { id, likes: db[idx].likes };
    }
    return { id, likes: 1 };
  }
}

export async function unlikePost(id: string): Promise<{ id: string; likes: number }> {
  try {
    const response = await fetch(`/api/posts/${id}/unlike`, {
      method: "POST",
    });
    if (!response.ok) {
      throw new Error("Falha ao descurtir.");
    }
    const result = await response.json();
    
    // Also update locally if cached
    const db = getLocalDb();
    const idx = db.findIndex(p => p.id === id);
    if (idx !== -1) {
      db[idx].likes = result.likes;
      saveLocalDb(db);
    }
    return result;
  } catch (err) {
    console.warn("API offline, unliking locally:", err);
    const db = getLocalDb();
    const idx = db.findIndex(p => p.id === id);
    if (idx !== -1) {
      db[idx].likes = Math.max(0, (db[idx].likes || 0) - 1);
      saveLocalDb(db);
      return { id, likes: db[idx].likes };
    }
    return { id, likes: 0 };
  }
}

export async function deletePost(
  id: string,
  passcode: string,
  userInfo?: { userUid?: string; userEmail?: string }
): Promise<void> {
  try {
    const response = await fetch(`/api/posts/${id}/delete`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        passcode,
        userUid: userInfo?.userUid,
        userEmail: userInfo?.userEmail,
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || "Sem permissão ou código incorreto para excluir.");
    }
    
    // Also remove locally
    const db = getLocalDb();
    const filtered = db.filter(p => p.id !== id);
    saveLocalDb(filtered);
  } catch (err: any) {
    console.warn("API offline, deleting locally:", err);
    const db = getLocalDb();
    const post = db.find(p => p.id === id);
    if (!post) throw new Error("Construção não encontrada.");
    const filtered = db.filter(p => p.id !== id);
    saveLocalDb(filtered);
  }
}

export async function importDb(data: any[]): Promise<{ success: boolean; count: number }> {
  try {
    const response = await fetch("/api/import", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ data }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || "Falha ao importar dados.");
    }
    
    const result = await response.json();
    
    // Merge into local storage as well
    const db = getLocalDb();
    for (const item of data) {
      const idx = db.findIndex(p => p.id === item.id);
      if (idx !== -1) {
        db[idx] = item;
      } else {
        db.push(item);
      }
    }
    saveLocalDb(db);
    
    return result;
  } catch (err) {
    console.warn("API offline, importing entirely client-side:", err);
    const db = getLocalDb();
    let count = 0;
    for (const item of data) {
      if (item.id && item.title && item.content) {
        const idx = db.findIndex(p => p.id === item.id);
        if (idx !== -1) {
          db[idx] = item;
        } else {
          db.push(item);
        }
        count++;
      }
    }
    saveLocalDb(db);
    return { success: true, count };
  }
}

export async function fetchFullPosts(): Promise<PostWithContent[]> {
  try {
    const response = await fetch("/api/export");
    if (!response.ok) {
      throw new Error("Falha ao obter dados completos do backup.");
    }
    return response.json();
  } catch (err) {
    console.warn("API offline, exporting from local database:", err);
    return getLocalDb();
  }
}
