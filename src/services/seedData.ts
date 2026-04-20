import { collection, addDoc, getDocs, query, where, Timestamp, setDoc, doc } from 'firebase/firestore';
import { db } from './firebase';
import { getWeekStart } from './plannerService';

export const seedTestData = async (userId: string) => {
  // Check if already seeded
  const existing = await getDocs(query(collection(db, 'recipes'), where('userId', '==', userId)));
  if (!existing.empty) return;

  // Categories
  const catIds: Record<string, string> = {};
  const categories = [
    { name: 'Healthy', icon: 'leaf', color: '#006b1b', userId },
    { name: 'Rapide', icon: 'flash', color: '#924700', userId },
    { name: 'Dessert', icon: 'ice-cream', color: '#ba1a1a', userId },
    { name: 'Végétarien', icon: 'nutrition', color: '#386b01', userId },
  ];
  for (const cat of categories) {
    const ref = await addDoc(collection(db, 'categories'), cat);
    catIds[cat.name] = ref.id;
  }

  // Recipes
  const recipes = [
    {
      name: 'Buddha Bowl au Quinoa',
      description: 'Bol nutritif avec quinoa, légumes rôtis et sauce tahini.',
      prepTime: 15,
      cookTime: 20,
      servings: 2,
      categoryId: catIds['Healthy'],
      wellnessType: 'balanced',
      userId,
      createdAt: Timestamp.fromDate(new Date()),
      imageUrl: null,
      ingredients: [
        { id: '1', name: 'Quinoa', quantity: 150, unit: 'g', price: 0.90 },
        { id: '2', name: 'Pois chiches', quantity: 200, unit: 'g', price: 0.60 },
        { id: '3', name: 'Avocat', quantity: 1, unit: 'pcs', price: 1.20 },
        { id: '4', name: 'Épinards frais', quantity: 80, unit: 'g', price: 0.40 },
        { id: '5', name: 'Tomates cerises', quantity: 100, unit: 'g', price: 0.80 },
        { id: '6', name: 'Tahini', quantity: 30, unit: 'g', price: 0.50 },
      ],
      instructions: [
        'Rincer et cuire le quinoa dans 300ml d\'eau pendant 15 min.',
        'Égoutter et rôtir les pois chiches au four à 200°C avec huile d\'olive, sel et cumin pendant 20 min.',
        'Couper l\'avocat et les tomates cerises en morceaux.',
        'Préparer la sauce : mélanger tahini, jus de citron, ail et eau.',
        'Assembler le bol : quinoa, légumes, sauce tahini. Servir tiède.',
      ],
      totalCost: 4.40,
      costPerServing: 2.20,
    },
    {
      name: 'Pasta Carbonara Classique',
      description: 'La vraie recette italienne, sans crème.',
      prepTime: 10,
      cookTime: 15,
      servings: 4,
      categoryId: catIds['Rapide'],
      wellnessType: 'indulgent',
      userId,
      createdAt: Timestamp.fromDate(new Date()),
      imageUrl: null,
      ingredients: [
        { id: '1', name: 'Spaghetti', quantity: 400, unit: 'g', price: 1.20 },
        { id: '2', name: 'Lardons fumés', quantity: 200, unit: 'g', price: 2.40 },
        { id: '3', name: 'Parmesan', quantity: 100, unit: 'g', price: 1.80 },
        { id: '4', name: 'Œufs entiers', quantity: 4, unit: 'pcs', price: 1.20 },
        { id: '5', name: 'Poivre noir', quantity: 5, unit: 'g', price: 0.10 },
      ],
      instructions: [
        'Cuire les pâtes al dente dans de l\'eau bien salée.',
        'Faire revenir les lardons à sec dans une poêle chaude.',
        'Battre les œufs avec le parmesan râpé et poivrer généreusement.',
        'Hors du feu, mélanger pâtes égouttées avec lardons, puis ajouter le mélange œufs/parmesan.',
        'Remuer rapidement en ajoutant de l\'eau de cuisson pour créer une sauce crémeuse.',
      ],
      totalCost: 6.70,
      costPerServing: 1.68,
    },
    {
      name: 'Omelette aux Herbes',
      description: 'Petit-déjeuner protéiné prêt en 5 minutes.',
      prepTime: 5,
      cookTime: 5,
      servings: 1,
      categoryId: catIds['Rapide'],
      wellnessType: 'quick',
      userId,
      createdAt: Timestamp.fromDate(new Date()),
      imageUrl: null,
      ingredients: [
        { id: '1', name: 'Œufs', quantity: 3, unit: 'pcs', price: 0.90 },
        { id: '2', name: 'Ciboulette', quantity: 10, unit: 'g', price: 0.20 },
        { id: '3', name: 'Beurre', quantity: 10, unit: 'g', price: 0.15 },
        { id: '4', name: 'Sel et poivre', quantity: 1, unit: 'pcs', price: 0.05 },
      ],
      instructions: [
        'Battre les œufs avec sel, poivre et ciboulette ciselée.',
        'Faire fondre le beurre dans une poêle antiadhésive à feu moyen.',
        'Verser les œufs et remuer légèrement. Plier et servir.',
      ],
      totalCost: 1.30,
      costPerServing: 1.30,
    },
    {
      name: 'Salade Niçoise',
      description: 'Salade complète et fraîche, idéale pour le déjeuner.',
      prepTime: 15,
      cookTime: 10,
      servings: 2,
      categoryId: catIds['Healthy'],
      wellnessType: 'balanced',
      userId,
      createdAt: Timestamp.fromDate(new Date()),
      imageUrl: null,
      ingredients: [
        { id: '1', name: 'Thon en boîte', quantity: 160, unit: 'g', price: 1.80 },
        { id: '2', name: 'Œufs durs', quantity: 2, unit: 'pcs', price: 0.60 },
        { id: '3', name: 'Haricots verts', quantity: 150, unit: 'g', price: 1.00 },
        { id: '4', name: 'Tomates', quantity: 200, unit: 'g', price: 0.80 },
        { id: '5', name: 'Olives noires', quantity: 50, unit: 'g', price: 0.70 },
        { id: '6', name: 'Laitue', quantity: 100, unit: 'g', price: 0.60 },
      ],
      instructions: [
        'Cuire les haricots verts 8 min à l\'eau bouillante salée. Refroidir.',
        'Cuire les œufs durs 10 min. Écaler et couper en quartiers.',
        'Dresser la salade : laitue, tomates, haricots, thon émietté, œufs, olives.',
        'Assaisonner d\'huile d\'olive, vinaigre, sel et poivre.',
      ],
      totalCost: 5.50,
      costPerServing: 2.75,
    },
    {
      name: 'Soupe de Lentilles Corail',
      description: 'Soupe réconfortante, riche en protéines végétales.',
      prepTime: 10,
      cookTime: 25,
      servings: 4,
      categoryId: catIds['Végétarien'],
      wellnessType: 'balanced',
      userId,
      createdAt: Timestamp.fromDate(new Date()),
      imageUrl: null,
      ingredients: [
        { id: '1', name: 'Lentilles corail', quantity: 250, unit: 'g', price: 1.00 },
        { id: '2', name: 'Carottes', quantity: 2, unit: 'pcs', price: 0.40 },
        { id: '3', name: 'Oignon', quantity: 1, unit: 'pcs', price: 0.20 },
        { id: '4', name: 'Cumin', quantity: 5, unit: 'g', price: 0.10 },
        { id: '5', name: 'Bouillon de légumes', quantity: 1, unit: 'L', price: 0.50 },
        { id: '6', name: 'Lait de coco', quantity: 100, unit: 'ml', price: 0.60 },
      ],
      instructions: [
        'Faire revenir l\'oignon émincé dans l\'huile d\'olive 5 min.',
        'Ajouter carottes en rondelles, cumin, et lentilles rincées.',
        'Couvrir de bouillon, cuire 20 min à feu doux.',
        'Mixer et incorporer le lait de coco. Rectifier l\'assaisonnement.',
      ],
      totalCost: 2.80,
      costPerServing: 0.70,
    },
    {
      name: 'Mousse au Chocolat',
      description: 'Dessert classique, léger et aérien.',
      prepTime: 20,
      cookTime: 0,
      servings: 4,
      categoryId: catIds['Dessert'],
      wellnessType: 'indulgent',
      userId,
      createdAt: Timestamp.fromDate(new Date()),
      imageUrl: null,
      ingredients: [
        { id: '1', name: 'Chocolat noir 70%', quantity: 200, unit: 'g', price: 2.40 },
        { id: '2', name: 'Œufs', quantity: 4, unit: 'pcs', price: 1.20 },
        { id: '3', name: 'Sucre', quantity: 30, unit: 'g', price: 0.05 },
        { id: '4', name: 'Beurre', quantity: 20, unit: 'g', price: 0.30 },
      ],
      instructions: [
        'Faire fondre le chocolat et le beurre au bain-marie.',
        'Séparer les blancs des jaunes. Incorporer les jaunes au chocolat fondu.',
        'Monter les blancs en neige ferme avec le sucre.',
        'Incorporer délicatement les blancs au chocolat en 3 fois.',
        'Réfrigérer au moins 2h avant de servir.',
      ],
      totalCost: 3.95,
      costPerServing: 0.99,
    },
  ];

  const recipeIds: string[] = [];
  for (const recipe of recipes) {
    const ref = await addDoc(collection(db, 'recipes'), recipe);
    recipeIds.push(ref.id);
  }

  // Week plan with test meals
  const weekStart = getWeekStart();
  const [buddhaId, carbonaraId, omeletteId, saladeId, soupeId, mousseId] = recipeIds;

  await addDoc(collection(db, 'weekPlans'), {
    userId,
    weekStart,
    weeklyBudgetLimit: 120,
    days: {
      monday: {
        breakfast: { recipeId: omeletteId, recipeName: 'Omelette aux Herbes', cost: 1.30, wellnessType: 'quick' },
        lunch: { recipeId: saladeId, recipeName: 'Salade Niçoise', cost: 2.75, wellnessType: 'balanced' },
        dinner: { recipeId: carbonaraId, recipeName: 'Pasta Carbonara Classique', cost: 1.68, wellnessType: 'indulgent' },
      },
      tuesday: {
        breakfast: { recipeId: omeletteId, recipeName: 'Omelette aux Herbes', cost: 1.30, wellnessType: 'quick' },
        lunch: { recipeId: buddhaId, recipeName: 'Buddha Bowl au Quinoa', cost: 2.20, wellnessType: 'balanced' },
        dinner: { recipeId: soupeId, recipeName: 'Soupe de Lentilles Corail', cost: 0.70, wellnessType: 'balanced' },
      },
      wednesday: {
        breakfast: { recipeId: null },
        lunch: { recipeId: saladeId, recipeName: 'Salade Niçoise', cost: 2.75, wellnessType: 'balanced' },
        dinner: { recipeId: buddhaId, recipeName: 'Buddha Bowl au Quinoa', cost: 2.20, wellnessType: 'balanced' },
      },
      thursday: {
        breakfast: { recipeId: omeletteId, recipeName: 'Omelette aux Herbes', cost: 1.30, wellnessType: 'quick' },
        lunch: { recipeId: soupeId, recipeName: 'Soupe de Lentilles Corail', cost: 0.70, wellnessType: 'balanced' },
        dinner: { recipeId: carbonaraId, recipeName: 'Pasta Carbonara Classique', cost: 1.68, wellnessType: 'indulgent' },
      },
      friday: {
        breakfast: { recipeId: null },
        lunch: { recipeId: buddhaId, recipeName: 'Buddha Bowl au Quinoa', cost: 2.20, wellnessType: 'balanced' },
        dinner: { recipeId: mousseId, recipeName: 'Mousse au Chocolat', cost: 0.99, wellnessType: 'indulgent' },
      },
      saturday: {
        breakfast: { recipeId: omeletteId, recipeName: 'Omelette aux Herbes', cost: 1.30, wellnessType: 'quick' },
        lunch: { recipeId: carbonaraId, recipeName: 'Pasta Carbonara Classique', cost: 1.68, wellnessType: 'indulgent' },
        dinner: { recipeId: saladeId, recipeName: 'Salade Niçoise', cost: 2.75, wellnessType: 'balanced' },
      },
      sunday: {
        breakfast: { recipeId: null },
        lunch: { recipeId: soupeId, recipeName: 'Soupe de Lentilles Corail', cost: 0.70, wellnessType: 'balanced' },
        dinner: { recipeId: mousseId, recipeName: 'Mousse au Chocolat', cost: 0.99, wellnessType: 'indulgent' },
      },
    },
  });
};
