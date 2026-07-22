export interface Post {
  id: string;
  title: string;
  author: string;
  authorUid?: string;
  authorEmail?: string;
  category: string;
  tags: string[];
  description: string;
  filename: string;
  sizeKb: number;
  likes: number;
  createdAt: number;
  imageUrl?: string;
  passcode?: string;
}

export interface PostWithContent extends Post {
  content: string;
}

export const CATEGORIES = [
  "Todas",
  "Casa",
  "Decoração",
  "Estátua / Pixel art",
  "Mecanismo",
  "Veículo",
  "Cenário / Terreno",
  "Outro"
] as const;

export type Category = typeof CATEGORIES[number];
