export function getAuthor(id: number): Author {
  return {
    id,
    name: "Someone",
    birthDate: new Date(),
  };
}
