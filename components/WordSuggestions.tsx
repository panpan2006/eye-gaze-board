const getSuggestions = async (prefix: string) => {
  const res = await fetch(`https://api.datamuse.com/sug?s=${prefix}`);
  const words = await res.json();
  return words.slice(0, 4); // top 4 suggestions
};