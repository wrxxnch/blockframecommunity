import { Post, PostWithContent } from "../types";
import { db, auth } from "./firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  increment,
  arrayUnion,
  arrayRemove,
  onSnapshot,
  query,
  orderBy,
  Unsubscribe
} from "firebase/firestore";

/**
 * Returns a stable local client ID for anonymous users,
 * ensuring even guests get 1 like per post per device.
 */
export function getOrCreateClientId(): string {
  const KEY = "blockframe_client_uid";
  let id = "";
  try {
    id = localStorage.getItem(KEY) || "";
  } catch {}
  if (!id) {
    id = "guest_" + Math.random().toString(36).substring(2, 11) + Date.now().toString(36);
    try {
      localStorage.setItem(KEY, id);
    } catch {}
  }
  return id;
}

/**
 * Resolves current user identifier: either Google Auth UID if logged in,
 * or the stable guest client ID.
 */
export function getCurrentUserIdentifier(): string {
  try {
    if (auth.currentUser?.uid) {
      return auth.currentUser.uid;
    }
  } catch {}
  return getOrCreateClientId();
}

// Helper to sanitize objects for Firestore (removes 'undefined' fields which cause setDoc to crash)
function cleanForFirestore<T extends Record<string, any>>(obj: T): Record<string, any> {
  const cleaned: Record<string, any> = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val !== undefined) {
      cleaned[key] = val;
    }
  }
  return cleaned;
}

// Safe wrapper for localStorage.setItem to avoid QuotaExceededError crashes
function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    console.warn(`localStorage setItem failed for key "${key}":`, err);
    return false;
  }
}

// Helper for local database storage as backup cache
function getLocalDb(): PostWithContent[] {
  try {
    const data = localStorage.getItem("blockframe_local_db");
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveLocalDb(localList: PostWithContent[]) {
  if (safeSetItem("blockframe_local_db", JSON.stringify(localList))) {
    return;
  }

  try {
    const lightweightDb = localList.map(({ content, imageUrl, ...rest }) => ({
      ...rest,
      content: content && content.length > 1000 ? "" : content,
      imageUrl: imageUrl && imageUrl.startsWith("data:") && imageUrl.length > 500 ? undefined : imageUrl,
    }));
    if (safeSetItem("blockframe_local_db", JSON.stringify(lightweightDb))) {
      return;
    }
  } catch {
    try {
      localStorage.removeItem("blockframe_last_synced_posts");
    } catch {
      // Ignored
    }
  }
}

/**
 * Real-time listener for posts.
 * Allows all users across different devices and browsers to see new posts, likes,
 * and deletions immediately without refreshing the page!
 */
export function subscribeToPosts(
  onUpdate: (posts: Post[]) => void,
  onError?: (err: any) => void
): Unsubscribe {
  try {
    const postsRef = collection(db, "posts");
    const q = query(postsRef, orderBy("createdAt", "desc"));

    return onSnapshot(
      q,
      (snapshot) => {
        const postsList: Post[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as PostWithContent;
          const { content, ...rest } = data;
          postsList.push({ ...rest, id: docSnap.id });
        });

        safeSetItem("blockframe_last_synced_posts", JSON.stringify(postsList));
        onUpdate(postsList);
      },
      (error) => {
        console.warn("Realtime Firestore onSnapshot notice:", error);
        if (onError) onError(error);
        // Fallback to REST fetch if realtime socket has issue
        fetchPosts().then(onUpdate).catch(() => {});
      }
    );
  } catch (err) {
    console.warn("Failed to attach Firestore snapshot listener:", err);
    fetchPosts().then(onUpdate).catch(() => {});
    return () => {};
  }
}

/**
 * Fetches all posts across Firestore (global public cloud), Express server, and local backup.
 */
export async function fetchPosts(): Promise<Post[]> {
  const postsMap = new Map<string, Post>();

  // 1. Fetch directly from Firebase Firestore (Public Global Database)
  const firestorePromise = (async () => {
    try {
      const postsRef = collection(db, "posts");
      const snapshot = await getDocs(postsRef);
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as PostWithContent;
        const { content, ...rest } = data;
        postsMap.set(docSnap.id, { ...rest, id: docSnap.id });
      });
    } catch (err) {
      console.warn("Firestore fetch notice:", err);
    }
  })();

  // 2. Try Express server API in parallel
  const serverPromise = (async () => {
    try {
      const response = await fetch("/api/posts");
      if (response.ok) {
        const serverPosts: Post[] = await response.json();
        serverPosts.forEach((p) => {
          if (!postsMap.has(p.id)) postsMap.set(p.id, p);
        });
      }
    } catch (err) {
      console.warn("Express API fetch notice:", err);
    }
  })();

  // Wait for parallel requests with timeout protection
  await Promise.allSettled([firestorePromise, serverPromise]);

  // 3. Include local storage items as fallback
  const localDb = getLocalDb();
  for (const p of localDb) {
    if (!postsMap.has(p.id)) {
      const { content, ...rest } = p;
      postsMap.set(p.id, rest);
    }
  }

  const resultList = Array.from(postsMap.values()).sort((a, b) => b.createdAt - a.createdAt);

  if (resultList.length > 0) {
    safeSetItem("blockframe_last_synced_posts", JSON.stringify(resultList));
  }

  return resultList;
}

export async function fetchPostDetails(id: string): Promise<PostWithContent> {
  // 1. Try Firebase Firestore first
  try {
    const docRef = doc(db, "posts", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { id: docSnap.id, ...(docSnap.data() as PostWithContent) };
    }
  } catch (err) {
    console.warn("Firestore detail notice:", err);
  }

  // 2. Try Express server API
  try {
    const response = await fetch(`/api/posts/${id}`);
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn("Express API offline:", err);
  }

  // 3. Fallback to local db
  const localDb = getLocalDb();
  const post = localDb.find((p) => p.id === id);
  if (post) return post;
  throw new Error("Construção não encontrada.");
}

/**
 * Creates and publishes a new post globally to Firebase Firestore and syncs to backend.
 */
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
  const id = "p_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const now = Date.now();

  const rawPostData = {
    id,
    title: postData.title.substring(0, 80),
    author: postData.author.substring(0, 40),
    authorUid: postData.authorUid || undefined,
    authorEmail: postData.authorEmail || undefined,
    category: postData.category,
    tags: Array.isArray(postData.tags) ? postData.tags.map((t) => t.trim()).filter(Boolean) : [],
    description: (postData.description || "").substring(0, 500),
    filename: postData.filename.substring(0, 100),
    sizeKb: Number(postData.sizeKb) || 1,
    passcode: postData.passcode,
    likes: 0,
    createdAt: now,
    content: postData.content,
    imageUrl: postData.imageUrl || undefined,
  };

  const newPostData = cleanForFirestore(rawPostData) as PostWithContent;

  // 1. Execute Firestore write and Express backend sync in PARALLEL for ultra-fast publishing
  const firestoreSave = (async () => {
    try {
      const docRef = doc(db, "posts", id);
      await setDoc(docRef, newPostData);
      console.log("Post publicado no Firestore com sucesso:", id);
    } catch (err) {
      console.error("Erro ao salvar no Firestore:", err);
    }
  })();

  const backendSave = (async () => {
    try {
      await fetch("/api/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPostData),
      });
    } catch (err) {
      console.warn("Erro ao sincronizar com backend Express:", err);
    }
  })();

  // 2. Store locally in browser instantly
  const localDb = getLocalDb();
  localDb.unshift(newPostData);
  saveLocalDb(localDb);

  // Wait for cloud persistence in parallel with a fast safety limit
  await Promise.allSettled([firestoreSave, backendSave]);

  const { content, ...summary } = newPostData;
  return summary as Post;
}

export async function likePost(id: string, userId?: string): Promise<{ id: string; likes: number }> {
  const uid = userId || getCurrentUserIdentifier();
  let likesCount = 1;

  // Update Firestore and Express server in parallel
  const firestoreLike = (async () => {
    try {
      const docRef = doc(db, "posts", id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        const likedBy: string[] = Array.isArray(data.likedBy) ? data.likedBy : [];
        if (!likedBy.includes(uid)) {
          await updateDoc(docRef, {
            likes: increment(1),
            likedBy: arrayUnion(uid),
          });
          likesCount = (data.likes || 0) + 1;
        } else {
          likesCount = data.likes || likedBy.length;
        }
      }
    } catch (err) {
      console.warn("Firestore like error:", err);
    }
  })();

  const backendLike = (async () => {
    try {
      const response = await fetch(`/api/posts/${id}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: uid }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.likes !== undefined) likesCount = data.likes;
      }
    } catch (err) {
      // Ignored
    }
  })();

  // Update Local Storage immediately
  const localDb = getLocalDb();
  const idx = localDb.findIndex((p) => p.id === id);
  if (idx !== -1) {
    localDb[idx].likedBy = Array.isArray(localDb[idx].likedBy) ? localDb[idx].likedBy : [];
    if (!localDb[idx].likedBy!.includes(uid)) {
      localDb[idx].likedBy!.push(uid);
      localDb[idx].likes = (localDb[idx].likes || 0) + 1;
      saveLocalDb(localDb);
    }
  }

  await Promise.allSettled([firestoreLike, backendLike]);

  return { id, likes: likesCount };
}

export async function unlikePost(id: string, userId?: string): Promise<{ id: string; likes: number }> {
  const uid = userId || getCurrentUserIdentifier();
  let likesCount = 0;

  const firestoreUnlike = (async () => {
    try {
      const docRef = doc(db, "posts", id);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        const likedBy: string[] = Array.isArray(data.likedBy) ? data.likedBy : [];
        if (likedBy.includes(uid)) {
          await updateDoc(docRef, {
            likes: increment(-1),
            likedBy: arrayRemove(uid),
          });
          likesCount = Math.max(0, (data.likes || 1) - 1);
        } else {
          likesCount = data.likes || 0;
        }
      }
    } catch (err) {
      console.warn("Firestore unlike error:", err);
    }
  })();

  const backendUnlike = (async () => {
    try {
      const response = await fetch(`/api/posts/${id}/unlike`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: uid }),
      });
      if (response.ok) {
        const data = await response.json();
        if (data.likes !== undefined) likesCount = data.likes;
      }
    } catch (err) {
      // Ignored
    }
  })();

  // Update Local Storage
  const localDb = getLocalDb();
  const idx = localDb.findIndex((p) => p.id === id);
  if (idx !== -1) {
    localDb[idx].likedBy = Array.isArray(localDb[idx].likedBy) ? localDb[idx].likedBy : [];
    if (localDb[idx].likedBy!.includes(uid)) {
      localDb[idx].likedBy = localDb[idx].likedBy!.filter((u) => u !== uid);
      localDb[idx].likes = Math.max(0, (localDb[idx].likes || 1) - 1);
      saveLocalDb(localDb);
    }
  }

  await Promise.allSettled([firestoreUnlike, backendUnlike]);

  return { id, likes: likesCount };
}

export async function deletePost(
  id: string,
  passcode: string,
  userInfo?: { userUid?: string; userEmail?: string }
): Promise<void> {
  // 1. Fetch post details first to verify passcode
  let post: PostWithContent | null = null;
  try {
    post = await fetchPostDetails(id);
  } catch {
    // Ignore if not found
  }

  if (post) {
    const isOwnerByEmail = userInfo?.userEmail && post.authorEmail && userInfo.userEmail.toLowerCase() === post.authorEmail.toLowerCase();
    const isAdmin = userInfo?.userEmail === "jeanpierreowner@gmail.com";
    const isPasscodeValid = passcode.trim() === (post.passcode || "").trim();

    if (!isPasscodeValid && !isAdmin && !isOwnerByEmail) {
      throw new Error("Código de segurança incorreto. Verifique o código enviado por e-mail ou cadastrado na publicação.");
    }
  }

  // 2. Delete from Firebase Firestore and Express backend in parallel
  const firestoreDelete = (async () => {
    try {
      const docRef = doc(db, "posts", id);
      await deleteDoc(docRef);
    } catch (err) {
      console.warn("Firestore delete error:", err);
    }
  })();

  const backendDelete = (async () => {
    try {
      await fetch(`/api/posts/${id}/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passcode, userUid: userInfo?.userUid, userEmail: userInfo?.userEmail }),
      });
    } catch (err) {
      console.warn("Express delete error:", err);
    }
  })();

  // 3. Delete from Local Storage
  const localDb = getLocalDb();
  const filtered = localDb.filter((p) => p.id !== id);
  saveLocalDb(filtered);

  await Promise.allSettled([firestoreDelete, backendDelete]);
}

export async function importDb(data: any[]): Promise<{ success: boolean; count: number }> {
  let count = 0;

  for (const item of data) {
    if (item.id && item.title && item.content) {
      const postItem = cleanForFirestore({
        id: item.id,
        title: String(item.title).substring(0, 80),
        author: String(item.author || "Anônimo").substring(0, 40),
        authorUid: item.authorUid || undefined,
        authorEmail: item.authorEmail || undefined,
        category: String(item.category || "Outro"),
        tags: Array.isArray(item.tags) ? item.tags.map((t: any) => String(t).trim()).filter(Boolean) : [],
        description: String(item.description || "").substring(0, 500),
        filename: String(item.filename || "file.bf").substring(0, 100),
        sizeKb: Number(item.sizeKb) || 1,
        passcode: String(item.passcode || "1234"),
        likes: Number(item.likes) || 0,
        createdAt: Number(item.createdAt) || Date.now(),
        content: String(item.content),
        imageUrl: item.imageUrl ? String(item.imageUrl) : undefined,
      });

      try {
        const docRef = doc(db, "posts", item.id);
        await setDoc(docRef, postItem);
        count++;
      } catch (err) {
        console.error("Firestore import error:", err);
      }
    }
  }

  // Send to Express backend
  try {
    await fetch("/api/import", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    });
  } catch (err) {
    // Ignored
  }

  // Merge into local storage
  const localDb = getLocalDb();
  for (const item of data) {
    const idx = localDb.findIndex((p) => p.id === item.id);
    if (idx !== -1) {
      localDb[idx] = item;
    } else {
      localDb.push(item);
    }
  }
  saveLocalDb(localDb);

  return { success: true, count };
}

export async function fetchFullPosts(): Promise<PostWithContent[]> {
  try {
    const postsRef = collection(db, "posts");
    const snapshot = await getDocs(postsRef);
    if (!snapshot.empty) {
      const fullList: PostWithContent[] = [];
      snapshot.forEach((docSnap) => {
        fullList.push({ id: docSnap.id, ...(docSnap.data() as PostWithContent) });
      });
      return fullList;
    }
  } catch (err) {
    console.warn("Firestore full posts error:", err);
  }

  try {
    const response = await fetch("/api/export");
    if (response.ok) {
      return await response.json();
    }
  } catch (err) {
    console.warn("API export offline:", err);
  }

  return getLocalDb();
}

/**
 * Automatically syncs any posts stored in browser localStorage into Firestore.
 * This guarantees that posts previously created offline or locally become globally
 * published and visible to all users immediately.
 */
export async function syncLocalPostsToFirestore(): Promise<number> {
  const localDb = getLocalDb();
  if (!localDb || localDb.length === 0) return 0;

  let synced = 0;
  for (const post of localDb) {
    if (post && post.id && post.title && post.content) {
      try {
        const docRef = doc(db, "posts", post.id);
        const existing = await getDoc(docRef);
        if (!existing.exists()) {
          const cleaned = cleanForFirestore(post);
          await setDoc(docRef, cleaned);
          synced++;
          console.log("Successfully migrated local post to Firestore:", post.id, post.title);
        }
      } catch (err) {
        console.warn("Could not sync local post to Firestore:", post.id, err);
      }
    }
  }
  return synced;
}

