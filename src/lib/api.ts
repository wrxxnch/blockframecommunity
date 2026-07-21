import { Post, PostWithContent } from "../types";

export async function fetchPosts(): Promise<Post[]> {
  const response = await fetch("/api/posts");
  if (!response.ok) {
    throw new Error("Falha ao carregar as construções.");
  }
  return response.json();
}

export async function fetchPostDetails(id: string): Promise<PostWithContent> {
  const response = await fetch(`/api/posts/${id}`);
  if (!response.ok) {
    throw new Error("Falha ao obter os detalhes da construção.");
  }
  return response.json();
}

export async function createPost(postData: {
  title: string;
  author: string;
  category: string;
  tags: string[];
  description: string;
  filename: string;
  sizeKb: number;
  passcode: string;
  content: string;
  imageUrl?: string;
}): Promise<Post> {
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

  return response.json();
}

export async function likePost(id: string): Promise<{ id: string; likes: number }> {
  const response = await fetch(`/api/posts/${id}/like`, {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Falha ao curtir.");
  }
  return response.json();
}

export async function deletePost(id: string, passcode: string): Promise<void> {
  const response = await fetch(`/api/posts/${id}/delete`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ passcode }),
  });

  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(errData.error || "Código incorreto ou falha ao excluir.");
  }
}

export async function importDb(data: any[]): Promise<{ success: boolean; count: number }> {
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

  return response.json();
}

export async function fetchFullPosts(): Promise<PostWithContent[]> {
  const response = await fetch("/api/export");
  if (!response.ok) {
    throw new Error("Falha ao obter dados completos do backup.");
  }
  return response.json();
}
