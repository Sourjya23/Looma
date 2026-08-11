export function isCombinationValid(genre: string, character: string, setting: string, situation: string): boolean {
  // Example compatibility rules to prevent absurd combinations (CP3)
  
  const absurdCombinations = [
    // E.g., Medieval knights in submarines (if we had them)
    // Here we can define specific clashes
    { character: 'Retired detective', genre: 'Comedy', setting: 'Forest cabin' }, // A bit too clashy maybe
    { character: 'Teenager', situation: 'Receives an unexpected letter', setting: 'Airport' }, // Maybe fine, but let's say we want to avoid it for some reason
  ];

  // A more generalized scoring approach:
  let clashScore = 0;

  if (genre === 'Comedy' && (setting === 'Hospital' || setting === 'Abandoned hotel')) clashScore += 2;
  if (genre === 'Sci-Fi' && setting === 'Small village') clashScore += 1;
  if (character === 'Retired detective' && genre === 'Romance') clashScore += 1;
  if (situation === 'Discovers a hidden room' && setting === 'Airport') clashScore += 2; // Airports don't usually have "hidden rooms" you casually discover
  if (situation === 'Misses the last train' && setting !== 'Railway station') clashScore += 2; // Context mismatch

  // If it clashes too much, reject it
  if (clashScore >= 2) {
    return false;
  }

  return true;
}
