export const DOG_BREEDS = [
  'Labrador Retriever', 'French Bulldog', 'Golden Retriever', 'German Shepherd',
  'Poodle', 'Bulldog', 'Beagle', 'Rottweiler', 'German Shorthaired Pointer',
  'Dachshund', 'Pembroke Welsh Corgi', 'Australian Shepherd', 'Yorkshire Terrier',
  'Cavalier King Charles Spaniel', 'Doberman Pinscher', 'Boxer', 'Miniature Schnauzer',
  'Cane Corso', 'Great Dane', 'Shih Tzu', 'Siberian Husky', 'Bernese Mountain Dog',
  'Pomeranian', 'Boston Terrier', 'Havanese', 'English Springer Spaniel', 'Brittany',
  'Shetland Sheepdog', 'Cocker Spaniel', 'Border Collie', 'Miniature American Shepherd',
  'Belgian Malinois', 'Vizsla', 'Chihuahua', 'Pug', 'Maltese', 'Weimaraner',
  'Rhodesian Ridgeback', 'Collie', 'Basset Hound', 'Newfoundland', 'West Highland White Terrier',
  'Bichon Frise', 'Bloodhound', 'Akita', 'Portuguese Water Dog', 'Chesapeake Bay Retriever',
  'Dalmatian', 'St. Bernard', 'Papillon',
];

export const CAT_BREEDS = [
  'Domestic Shorthair', 'Domestic Longhair', 'Persian', 'Maine Coon', 'Ragdoll',
  'British Shorthair', 'Abyssinian', 'Bengal', 'Siamese', 'Sphynx',
  'Scottish Fold', 'Birman', 'Russian Blue', 'Norwegian Forest Cat', 'Devon Rex',
  'Oriental Shorthair', 'Burmese', 'Exotic Shorthair', 'American Shorthair', 'Tonkinese',
  'Savannah', 'Cornish Rex', 'Ragamuffin', 'Himalayan', 'Turkish Angora',
  'Manx', 'Chartreux', 'Bombay', 'Balinese', 'Somali',
];

export function getBreedsBySpecies(species: 'dog' | 'cat'): string[] {
  return species === 'dog' ? DOG_BREEDS : CAT_BREEDS;
}
