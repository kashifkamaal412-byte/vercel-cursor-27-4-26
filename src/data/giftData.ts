// Gift categories and data
export type GiftCategory = "funny" | "emotional" | "love" | "angry" | "sad" | "respect" | "poor" | "rich" | "car" | "bike" | "dragon" | "drink" | "animal" | "luxury" | "mythic" | "nature";

export interface Gift {
  id: string;
  name: string;
  emoji: string;
  imageUrl?: string;
  category: GiftCategory;
  value: number;
  isPremium: boolean;
  animationType: "bounce" | "float" | "spin" | "shake" | "zoom" | "sparkle" | "cinematic";
  description?: string;
  animationDuration?: number;
}

// ─── FREE GIFTS (Watch Ad to Unlock) ───
export const freeGifts: Gift[] = [
  { id: "f_rose", name: "Rose", emoji: "🌹", imageUrl: "/gifts/free/rose.jpg", category: "love", value: 0, isPremium: false, animationType: "float" },
  { id: "f_teddy", name: "Teddy Bear", emoji: "🧸", imageUrl: "/gifts/free/teddy.jpg", category: "love", value: 0, isPremium: false, animationType: "bounce" },
  { id: "f_hearts", name: "Heart Balloons", emoji: "💕", imageUrl: "/gifts/free/hearts.jpg", category: "love", value: 0, isPremium: false, animationType: "float" },
  { id: "f_star", name: "Star", emoji: "⭐", imageUrl: "/gifts/free/star.jpg", category: "respect", value: 0, isPremium: false, animationType: "sparkle" },
  { id: "f_giftbox", name: "Gift Box", emoji: "🎁", imageUrl: "/gifts/free/giftbox.jpg", category: "funny", value: 0, isPremium: false, animationType: "bounce" },
  { id: "f_money", name: "Money", emoji: "💵", imageUrl: "/gifts/free/money.jpg", category: "rich", value: 0, isPremium: false, animationType: "float" },
  { id: "f_pinkcar", name: "Pink Car", emoji: "🚗", imageUrl: "/gifts/free/pinkcar.jpg", category: "car", value: 0, isPremium: false, animationType: "zoom" },
  { id: "f_cake", name: "Cake", emoji: "🎂", imageUrl: "/gifts/free/cake.jpg", category: "funny", value: 0, isPremium: false, animationType: "bounce" },
  { id: "f_books", name: "Books & Coffee", emoji: "📚", imageUrl: "/gifts/free/books.jpg", category: "respect", value: 0, isPremium: false, animationType: "float" },
  { id: "f_balloons", name: "Balloons", emoji: "🎈", imageUrl: "/gifts/free/balloons.jpg", category: "funny", value: 0, isPremium: false, animationType: "float" },
  { id: "f_puppy", name: "Puppy", emoji: "🐶", imageUrl: "/gifts/free/puppy.jpg", category: "animal", value: 0, isPremium: false, animationType: "bounce" },
  { id: "f_candy", name: "Candy Bouquet", emoji: "🍬", imageUrl: "/gifts/free/candy.jpg", category: "funny", value: 0, isPremium: false, animationType: "sparkle" },
  { id: "f_ring", name: "Ring Box", emoji: "💍", imageUrl: "/gifts/free/ring.jpg", category: "love", value: 0, isPremium: false, animationType: "sparkle" },
  { id: "f_angel", name: "Angel", emoji: "👼", imageUrl: "/gifts/free/angel.jpg", category: "emotional", value: 0, isPremium: false, animationType: "float" },
  { id: "f_dolphin", name: "Dolphin", emoji: "🐬", imageUrl: "/gifts/free/dolphin.jpg", category: "animal", value: 0, isPremium: false, animationType: "zoom" },
  { id: "f_unicorn", name: "Unicorn", emoji: "🦄", imageUrl: "/gifts/free/unicorn.jpg", category: "mythic", value: 0, isPremium: false, animationType: "sparkle" },
  { id: "f_crown", name: "Crown", emoji: "👑", imageUrl: "/gifts/free/crown.jpg", category: "respect", value: 0, isPremium: false, animationType: "sparkle" },
  { id: "f_treasure", name: "Treasure", emoji: "📦", imageUrl: "/gifts/free/treasure.jpg", category: "rich", value: 0, isPremium: false, animationType: "sparkle" },
  { id: "f_gem", name: "Gem", emoji: "💎", imageUrl: "/gifts/free/gem.jpg", category: "rich", value: 0, isPremium: false, animationType: "sparkle" },
  { id: "f_corgi", name: "Corgi", emoji: "🐕", imageUrl: "/gifts/free/corgi.jpg", category: "animal", value: 0, isPremium: false, animationType: "bounce" },
  { id: "f_mic", name: "Microphone", emoji: "🎤", imageUrl: "/gifts/free/mic.jpg", category: "respect", value: 0, isPremium: false, animationType: "bounce" },
  { id: "f_heartnecklace", name: "Heart Necklace", emoji: "❤️‍🔥", imageUrl: "/gifts/free/heartnecklace.jpg", category: "love", value: 0, isPremium: false, animationType: "sparkle" },
  { id: "f_sword", name: "Sword", emoji: "⚔️", imageUrl: "/gifts/free/sword.jpg", category: "respect", value: 0, isPremium: false, animationType: "shake" },
  { id: "f_rocket", name: "Rocket", emoji: "🚀", imageUrl: "/gifts/free/rocket.jpg", category: "rich", value: 0, isPremium: false, animationType: "zoom" },
  { id: "f_panda", name: "Panda", emoji: "🐼", imageUrl: "/gifts/free/panda.jpg", category: "animal", value: 0, isPremium: false, animationType: "bounce" },
  { id: "f_strawberry", name: "Strawberries", emoji: "🍓", imageUrl: "/gifts/free/strawberry.jpg", category: "love", value: 0, isPremium: false, animationType: "float" },
  { id: "f_champagne", name: "Champagne", emoji: "🥂", imageUrl: "/gifts/free/champagne.jpg", category: "drink", value: 0, isPremium: false, animationType: "sparkle" },
  { id: "f_dog", name: "Dog", emoji: "🐕‍🦺", imageUrl: "/gifts/free/dog.jpg", category: "animal", value: 0, isPremium: false, animationType: "bounce" },
  { id: "f_magic", name: "Magic Orb", emoji: "🔮", imageUrl: "/gifts/free/magic.jpg", category: "mythic", value: 0, isPremium: false, animationType: "sparkle" },
  { id: "f_flower", name: "Flower Crown", emoji: "💐", imageUrl: "/gifts/free/flower.jpg", category: "love", value: 0, isPremium: false, animationType: "float" },
];

// ─── PREMIUM / LUXURY GIFTS ───
export const premiumGifts: Gift[] = [
  { id: "p_lamborghini", name: "Lamborghini", emoji: "🏎️", imageUrl: "/gifts/premium/lamborghini.jpg", category: "car", value: 25000, isPremium: true, animationType: "cinematic", description: "A luxury supercar roars across the screen", animationDuration: 6 },
  { id: "p_dragon", name: "Dragon", emoji: "🐉", imageUrl: "/gifts/premium/dragon.jpg", category: "dragon", value: 30000, isPremium: true, animationType: "cinematic", description: "A fire-breathing dragon takes flight", animationDuration: 7 },
  { id: "p_privatejet", name: "Private Jet", emoji: "✈️", imageUrl: "/gifts/premium/privatejet.jpg", category: "luxury", value: 28000, isPremium: true, animationType: "cinematic", description: "A sleek jet soars across the sky", animationDuration: 6 },
  { id: "p_yacht", name: "Royal Yacht", emoji: "🛥️", imageUrl: "/gifts/premium/yacht.jpg", category: "luxury", value: 35000, isPremium: true, animationType: "cinematic", description: "A majestic yacht sails in golden light", animationDuration: 6 },
  { id: "p_lion", name: "Lion", emoji: "🦁", imageUrl: "/gifts/premium/lion.jpg", category: "animal", value: 35000, isPremium: true, animationType: "cinematic", description: "A mighty lion roars with screen shake", animationDuration: 7 },
  { id: "p_diamond", name: "Diamond", emoji: "💎", imageUrl: "/gifts/premium/diamond.jpg", category: "luxury", value: 20000, isPremium: true, animationType: "sparkle", description: "A brilliant diamond sparkles magnificently", animationDuration: 5 },
  { id: "p_throne", name: "Golden Throne", emoji: "🪑", imageUrl: "/gifts/premium/throne.jpg", category: "luxury", value: 40000, isPremium: true, animationType: "sparkle", description: "A majestic golden throne appears", animationDuration: 6 },
  { id: "p_watch", name: "Luxury Watch", emoji: "⌚", imageUrl: "/gifts/premium/watch.jpg", category: "luxury", value: 22000, isPremium: true, animationType: "sparkle", description: "A premium timepiece shines", animationDuration: 5 },
  { id: "p_glamour", name: "Glamour Party", emoji: "🍾", imageUrl: "/gifts/premium/glamour.jpg", category: "drink", value: 24000, isPremium: true, animationType: "sparkle", description: "Pop the champagne and celebrate!", animationDuration: 5 },
  { id: "p_treasurechest", name: "Treasure Chest", emoji: "🏴‍☠️", imageUrl: "/gifts/premium/treasure.jpg", category: "rich", value: 50000, isPremium: true, animationType: "cinematic", description: "An overflowing chest of gold and jewels", animationDuration: 8 },
  { id: "p_castle", name: "Crystal Castle", emoji: "🏰", imageUrl: "/gifts/premium/castle.jpg", category: "luxury", value: 26000, isPremium: true, animationType: "cinematic", description: "A shimmering crystal palace appears", animationDuration: 7 },
  { id: "p_supercar", name: "Exotic Supercar", emoji: "🏎️", imageUrl: "/gifts/premium/supercar.jpg", category: "car", value: 30000, isPremium: true, animationType: "cinematic", description: "A red supercar with blazing lights", animationDuration: 6 },
  { id: "p_goldenrose", name: "Golden Rose", emoji: "🌹", imageUrl: "/gifts/premium/goldenrose.jpg", category: "love", value: 18000, isPremium: true, animationType: "sparkle", description: "A magical golden rose under glass", animationDuration: 5 },
  { id: "p_royalcrown", name: "Royal Crown", emoji: "👑", imageUrl: "/gifts/premium/royalcrown.jpg", category: "luxury", value: 23000, isPremium: true, animationType: "sparkle", description: "A jewel-encrusted royal crown", animationDuration: 5 },
  { id: "p_robot", name: "Robotic Butler", emoji: "🤖", imageUrl: "/gifts/premium/robot.jpg", category: "luxury", value: 35000, isPremium: true, animationType: "cinematic", description: "A high-tech butler serves with style", animationDuration: 6 },
  { id: "p_heartgold", name: "Heart of Gold", emoji: "💛", imageUrl: "/gifts/premium/heartgold.jpg", category: "love", value: 21000, isPremium: true, animationType: "sparkle", description: "A gleaming golden heart", animationDuration: 5 },
  { id: "p_spacerocket", name: "Space Rocket", emoji: "🚀", imageUrl: "/gifts/premium/spacerocket.jpg", category: "luxury", value: 28000, isPremium: true, animationType: "cinematic", description: "Blast off into the stars!", animationDuration: 7 },
  { id: "p_handbag", name: "Luxury Handbag", emoji: "👜", imageUrl: "/gifts/premium/handbag.jpg", category: "luxury", value: 19000, isPremium: true, animationType: "sparkle", description: "A designer luxury handbag", animationDuration: 4 },
  { id: "p_pegasus", name: "Mythic Pegasus", emoji: "🦄", imageUrl: "/gifts/premium/pegasus.jpg", category: "mythic", value: 38000, isPremium: true, animationType: "cinematic", description: "A mythical winged pegasus soars majestically", animationDuration: 8 },
];

export const giftCategories: { id: GiftCategory; label: string; emoji: string }[] = [
  { id: "love", label: "Love", emoji: "❤️" },
  { id: "funny", label: "Funny", emoji: "😂" },
  { id: "emotional", label: "Emotional", emoji: "🥹" },
  { id: "respect", label: "Respect", emoji: "🔥" },
  { id: "rich", label: "Rich", emoji: "💰" },
  { id: "car", label: "Car", emoji: "🚗" },
  { id: "animal", label: "Animals", emoji: "🐶" },
  { id: "luxury", label: "Luxury", emoji: "👑" },
  { id: "dragon", label: "Dragon", emoji: "🐉" },
  { id: "drink", label: "Drink", emoji: "🍻" },
  { id: "mythic", label: "Mythic", emoji: "🦄" },
  { id: "nature", label: "Nature", emoji: "🌿" },
];

// Combined gifts array for easy lookup
export const gifts: Gift[] = [...freeGifts, ...premiumGifts];

// Premium gift → MP4 video mapping (hard-mapped by gift id)
const premiumGiftVideoVersion = "20260324-fix-6";

export const premiumGiftVideoMap: Record<string, string> = {
  p_lamborghini: `/gifts/videos/lamborghini.mp4?v=${premiumGiftVideoVersion}`,
  p_dragon: `/gifts/videos/dragon.mp4?v=${premiumGiftVideoVersion}`,
  p_privatejet: `/gifts/videos/privatejet.mp4?v=${premiumGiftVideoVersion}`,
  p_yacht: `/gifts/videos/yacht.mp4?v=${premiumGiftVideoVersion}`,
  p_lion: `/gifts/videos/lion.mp4?v=${premiumGiftVideoVersion}`,
  p_diamond: `/gifts/videos/diamond.mp4?v=${premiumGiftVideoVersion}`,
  p_throne: `/gifts/videos/throne.mp4?v=${premiumGiftVideoVersion}`,
  p_spacerocket: `/gifts/videos/spacerocket.mp4?v=${premiumGiftVideoVersion}`,
  p_supercar: `/gifts/videos/supercar.mp4?v=${premiumGiftVideoVersion}`,
  p_pegasus: `/gifts/videos/pegasus.mp4?v=${premiumGiftVideoVersion}`,
  p_watch: `/gifts/videos/watch.mp4?v=${premiumGiftVideoVersion}`,
  p_glamour: `/gifts/videos/glamour.mp4?v=${premiumGiftVideoVersion}`,
  p_treasurechest: `/gifts/videos/treasure.mp4?v=${premiumGiftVideoVersion}`,
  p_castle: `/gifts/videos/castle.mp4?v=${premiumGiftVideoVersion}`,
  p_goldenrose: `/gifts/videos/goldenrose.mp4?v=${premiumGiftVideoVersion}`,
  p_royalcrown: `/gifts/videos/royalcrown.mp4?v=${premiumGiftVideoVersion}`,
  p_robot: `/gifts/videos/robot.mp4?v=${premiumGiftVideoVersion}`,
  p_heartgold: `/gifts/videos/heartgold.mp4?v=${premiumGiftVideoVersion}`,
  p_handbag: `/gifts/videos/handbag.mp4?v=${premiumGiftVideoVersion}`,
};

// Coin packages for deposit
export const coinPackages = [
  { coins: 100, price: 10, bonus: 0, label: "" },
  { coins: 200, price: 20, bonus: 0, label: "Most Popular" },
  { coins: 500, price: 50, bonus: 0, label: "" },
  { coins: 1000, price: 200, bonus: 50, label: "" },
  { coins: 2600, price: 200, bonus: 100, label: "Best Value" },
  { coins: 4000, price: 300, bonus: 1200, label: "" },
  { coins: 7000, price: 500, bonus: 1200, label: "" },
  { coins: 10000, price: 1000, bonus: 3000, label: "" },
  { coins: 17000, price: 1000, bonus: 20000, label: "" },
];
