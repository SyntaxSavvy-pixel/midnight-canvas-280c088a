export const categorizeChatsByDate = (chats: { id: string; title: string; timestamp: string; createdAt?: Date }[]) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const sevenDaysAgo = new Date(today);
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const thirtyDaysAgo = new Date(today);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const categories = {
    Today: [] as typeof chats,
    Yesterday: [] as typeof chats,
    'Previous 7 Days': [] as typeof chats,
    'Previous 30 Days': [] as typeof chats,
    Older: [] as typeof chats,
  };

  chats.forEach(chat => {
    const chatDate = chat.createdAt || new Date();
    const chatDay = new Date(chatDate.getFullYear(), chatDate.getMonth(), chatDate.getDate());

    if (chatDay.getTime() === today.getTime()) {
      categories.Today.push(chat);
    } else if (chatDay.getTime() === yesterday.getTime()) {
      categories.Yesterday.push(chat);
    } else if (chatDate >= sevenDaysAgo) {
      categories['Previous 7 Days'].push(chat);
    } else if (chatDate >= thirtyDaysAgo) {
      categories['Previous 30 Days'].push(chat);
    } else {
      categories.Older.push(chat);
    }
  });

  return categories;
};
