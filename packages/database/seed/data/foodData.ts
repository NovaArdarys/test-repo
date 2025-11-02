type FoodType = 'PROTEIN' | 'PLANT_BASED_PROTEIN' | 'CARBO' | 'VEGETABLE' | 'FRUIT' | 'DRINK' | 'OTHER';

export const foodData: { name: string; nameEn: string; type: FoodType; description: string; descriptionEn: string; }[] = [
  {
    name: 'Ayam Panggang',
    nameEn: 'Grilled Chicken',
    type: 'PROTEIN',
    description: 'Ayam panggang rendah lemak, tinggi protein.',
    descriptionEn: 'Low-fat grilled chicken rich in protein.',
  },
  {
    name: 'Telur Rebus',
    nameEn: 'Boiled Egg',
    type: 'PROTEIN',
    description: 'Telur ayam direbus hingga matang sempurna.',
    descriptionEn: 'Chicken egg boiled to perfection.',
  },

  {
    name: 'Tahu Goreng',
    nameEn: 'Fried Tofu',
    type: 'PLANT_BASED_PROTEIN',
    description: 'Tahu goreng sumber protein nabati tinggi.',
    descriptionEn: 'Fried tofu, a great source of plant-based protein.',
  },
  {
    name: 'Tempe Bacem',
    nameEn: 'Sweet Marinated Tempeh',
    type: 'PLANT_BASED_PROTEIN',
    description: 'Tempeh dimasak dengan bumbu manis khas Jawa.',
    descriptionEn: 'Traditional Javanese sweet-marinated tempeh.',
  },

  {
    name: 'Nasi Putih',
    nameEn: 'White Rice',
    type: 'CARBO',
    description: 'Nasi putih sebagai sumber karbohidrat utama.',
    descriptionEn: 'White rice as the main carbohydrate source.',
  },
  {
    name: 'Kentang Rebus',
    nameEn: 'Boiled Potato',
    type: 'CARBO',
    description: 'Kentang direbus lembut dan mengenyangkan.',
    descriptionEn: 'Soft-boiled potato, filling and nutritious.',
  },

  {
    name: 'Brokoli Kukus',
    nameEn: 'Steamed Broccoli',
    type: 'VEGETABLE',
    description: 'Brokoli dikukus, kaya serat dan vitamin.',
    descriptionEn: 'Steamed broccoli rich in fiber and vitamins.',
  },
  {
    name: 'Tumis Kangkung',
    nameEn: 'Stir-fried Water Spinach',
    type: 'VEGETABLE',
    description: 'Kangkung ditumis dengan bawang putih.',
    descriptionEn: 'Water spinach stir-fried with garlic.',
  },

  {
    name: 'Pisang',
    nameEn: 'Banana',
    type: 'FRUIT',
    description: 'Buah pisang segar kaya kalium.',
    descriptionEn: 'Fresh banana rich in potassium.',
  },
  {
    name: 'Apel Merah',
    nameEn: 'Red Apple',
    type: 'FRUIT',
    description: 'Apel merah manis dan renyah.',
    descriptionEn: 'Sweet and crunchy red apple.',
  },

  {
    name: 'Air Putih',
    nameEn: 'Mineral Water',
    type: 'DRINK',
    description: 'Air mineral murni tanpa tambahan.',
    descriptionEn: 'Pure mineral water.',
  },
  {
    name: 'Jus Jeruk',
    nameEn: 'Orange Juice',
    type: 'DRINK',
    description: 'Jus jeruk segar tanpa gula tambahan.',
    descriptionEn: 'Fresh orange juice without added sugar.',
  },

  {
    name: 'Sambal',
    nameEn: 'Chili Sauce',
    type: 'OTHER',
    description: 'Sambal pedas khas Indonesia.',
    descriptionEn: 'Spicy Indonesian chili sauce.',
  },
];