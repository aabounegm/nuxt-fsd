import type { Author } from "entities/author/@x/book";
// import type { Author } from "entities/author"; // Cross-import error!

export interface Book {
  id: number;
  title: string;
  price: number;
  author: Author;
}
