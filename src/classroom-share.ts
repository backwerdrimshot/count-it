/* Google Classroom's own share page. The teacher picks a class and posts the
   assignment link there; nothing is sent from Count It and no key, sign-in or
   roster is involved. */
export function classroomShareUrl(link: string, title?: string): string {
  const params = new URLSearchParams({ url: link });
  if (title) params.set("title", title);
  return `https://classroom.google.com/share?${params.toString()}`;
}
