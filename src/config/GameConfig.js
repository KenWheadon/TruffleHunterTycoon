/**
 * Truffle Hunter Tycoon - Game Configuration
 * All game balance numbers and configuration in one place
 */

export const GAME_CONFIG = {
  // ===== TRUFFLE TYPES & VALUES =====
  TRUFFLE_TYPES: {
    "Button Mushrooms": {
      baseValue: 3,
      color: "#8B7355",
      rarity: "common",
      icon: "🍄",
      description: "Simple mushrooms, but every hunter starts here",
    },
    "Summer Truffles": {
      baseValue: 18,
      color: "#8B4513",
      rarity: "common",
      icon: "🟤",
      description: "Your first real truffles - the gateway to success",
    },
    "Black Truffles": {
      baseValue: 75,
      color: "#2F2F2F",
      rarity: "uncommon",
      icon: "⚫",
      description: "Dark and mysterious, worth serious money",
    },
    "White Truffles": {
      baseValue: 350,
      color: "#F5F5F5",
      rarity: "rare",
      icon: "⚪",
      description: "Pale and otherworldly, a true prize",
    },
    "Diamond Truffles": {
      baseValue: 1750,
      color: "#B9F2FF",
      rarity: "legendary",
      icon: "💎",
      description: "Crystalline perfection, sparkling with value",
    },
    "Golden Truffles": {
      baseValue: 7500,
      color: "#FFD700",
      rarity: "legendary",
      icon: "🌟",
      description: "Mythical golden treasures of the deep forest",
    },
    "Poo Truffles": {
      baseValue: 30000,
      color: "#8B4513",
      rarity: "legendary",
      icon: "💩",
      description: "Monkey-processed delicacies, extremely rare",
    },
  },

  // ===== LOCATION SPAWN RATES =====
  LOCATION_SPAWN_RATES: {
    "Beginner Forest": {
      "Button Mushrooms": 0.4,
      "Summer Truffles": 0.35,
      "Black Truffles": 0.2,
      "White Truffles": 0.0,
      "Diamond Truffles": 0.04,
      "Golden Truffles": 0.0,
      "Poo Truffles": 0.0,
    },
    "Oak Grove": {
      "Button Mushrooms": 0.25,
      "Summer Truffles": 0.35,
      "Black Truffles": 0.3,
      "White Truffles": 0.08,
      "Diamond Truffles": 0.02,
      "Golden Truffles": 0.0,
      "Poo Truffles": 0.0,
    },
    "Ancient Woods": {
      "Button Mushrooms": 0.1,
      "Summer Truffles": 0.2,
      "Black Truffles": 0.35,
      "White Truffles": 0.25,
      "Diamond Truffles": 0.08,
      "Golden Truffles": 0.02,
      "Poo Truffles": 0.0,
    },
    "Mystic Glade": {
      "Button Mushrooms": 0.05,
      "Summer Truffles": 0.1,
      "Black Truffles": 0.2,
      "White Truffles": 0.3,
      "Diamond Truffles": 0.2,
      "Golden Truffles": 0.12,
      "Poo Truffles": 0.03,
    },
  },

  // ===== LOCATIONS =====
  LOCATIONS: {
    "Beginner Forest": {
      id: "beginner",
      name: "Beginner Forest",
      description: "A sunny woodland perfect for learning",
      reputationRequired: 0,
      goldRequired: 0,
      backgroundClass: "beginner-forest",
      unlocked: true,
    },
    "Oak Grove": {
      id: "oak",
      name: "Oak Grove",
      description: "Dense forest with towering ancient oaks",
      reputationRequired: 50,
      goldRequired: 500,
      backgroundClass: "oak-grove",
      unlocked: false,
    },
    "Ancient Woods": {
      id: "ancient",
      name: "Ancient Woods",
      description: "Dark, cathedral-like primeval forest",
      reputationRequired: 500,
      goldRequired: 10000,
      backgroundClass: "ancient-woods",
      unlocked: false,
    },
    "Mystic Glade": {
      id: "mystic",
      name: "Mystic Glade",
      description: "A magical clearing where legends are born",
      reputationRequired: 2000,
      goldRequired: 75000,
      backgroundClass: "mystic-glade",
      unlocked: false,
    },
  },

  // ===== PIG UPGRADES =====
  UPGRADES: {
    sniffing: {
      name: "Sniffing Power",
      description: "Increases chance of finding truffles",
      costs: [0, 50, 125, 300, 750, 1875, 4688, 11719, 29297, 73242],
      values: [10, 15, 22, 31, 42, 55, 70, 80, 88, 95], // Success rates as percentages
      maxLevel: 10,
      formatValue: (level) =>
        `${GAME_CONFIG.UPGRADES.sniffing.values[level - 1]}%`,
    },
    speed: {
      name: "Speed",
      description: "Reduces time between dirt mounds",
      costs: [0, 75, 188, 469, 1172, 2930, 7324, 18311, 45776, 114441],
      values: [5.0, 4.5, 4.0, 3.6, 3.2, 2.9, 2.6, 2.4, 2.2, 2.0], // Seconds between mounds
      maxLevel: 10,
      formatValue: (level) =>
        `${GAME_CONFIG.UPGRADES.speed.values[level - 1]}s`,
    },
    luck: {
      name: "Luck",
      description: "Increases value of rare truffles found",
      costs: [0, 100, 250, 625, 1563, 3906, 9766, 24414, 61035, 152588],
      values: [1.0, 1.2, 1.4, 1.7, 2.0, 2.4, 2.8, 3.3, 3.8, 4.5], // Multipliers for rare truffles
      maxLevel: 10,
      formatValue: (level) => `${GAME_CONFIG.UPGRADES.luck.values[level - 1]}x`,
    },
  },

  // ===== REPUTATION REWARDS =====
  REPUTATION_REWARDS: {
    "Button Mushrooms": 1,
    "Summer Truffles": 2,
    "Black Truffles": 3,
    "White Truffles": 5,
    "Diamond Truffles": 10,
    "Golden Truffles": 25,
    "Poo Truffles": 50,
    pig_retirement: 100,
  },

  // ===== ACHIEVEMENT SYSTEM =====
  ACHIEVEMENTS: {
    // Truffle Discovery Achievements
    truffle_discovery: {
      "Button Mushrooms": [
        {
          name: "First Mushroom",
          description: "Find your first Button Mushroom",
          target: 1,
          level: 1,
        },
        {
          name: "Mushroom Collector",
          description: "Find 20 Button Mushrooms",
          target: 20,
          level: 2,
        },
        {
          name: "Mushroom Master",
          description: "Find 100 Button Mushrooms",
          target: 100,
          level: 3,
        },
      ],
      "Summer Truffles": [
        {
          name: "First Summer",
          description: "Find your first Summer Truffle",
          target: 1,
          level: 1,
        },
        {
          name: "Summer Collector",
          description: "Find 20 Summer Truffles",
          target: 20,
          level: 2,
        },
        {
          name: "Summer Master",
          description: "Find 100 Summer Truffles",
          target: 100,
          level: 3,
        },
      ],
      "Black Truffles": [
        {
          name: "First Black",
          description: "Find your first Black Truffle",
          target: 1,
          level: 1,
        },
        {
          name: "Black Collector",
          description: "Find 20 Black Truffles",
          target: 20,
          level: 2,
        },
        {
          name: "Black Master",
          description: "Find 100 Black Truffles",
          target: 100,
          level: 3,
        },
      ],
      "White Truffles": [
        {
          name: "First White",
          description: "Find your first White Truffle",
          target: 1,
          level: 1,
        },
        {
          name: "White Collector",
          description: "Find 20 White Truffles",
          target: 20,
          level: 2,
        },
        {
          name: "White Master",
          description: "Find 100 White Truffles",
          target: 100,
          level: 3,
        },
      ],
      "Diamond Truffles": [
        {
          name: "First Diamond",
          description: "Find your first Diamond Truffle",
          target: 1,
          level: 1,
        },
        {
          name: "Diamond Collector",
          description: "Find 20 Diamond Truffles",
          target: 20,
          level: 2,
        },
        {
          name: "Diamond Master",
          description: "Find 100 Diamond Truffles",
          target: 100,
          level: 3,
        },
      ],
      "Golden Truffles": [
        {
          name: "First Golden",
          description: "Find your first Golden Truffle",
          target: 1,
          level: 1,
        },
        {
          name: "Golden Collector",
          description: "Find 20 Golden Truffles",
          target: 20,
          level: 2,
        },
        {
          name: "Golden Master",
          description: "Find 100 Golden Truffles",
          target: 100,
          level: 3,
        },
      ],
      "Poo Truffles": [
        {
          name: "First Poo",
          description: "Find your first Poo Truffle",
          target: 1,
          level: 1,
        },
        {
          name: "Poo Collector",
          description: "Find 20 Poo Truffles",
          target: 20,
          level: 2,
        },
        {
          name: "Poo Master",
          description: "Find 100 Poo Truffles",
          target: 100,
          level: 3,
        },
      ],
    },

    // Retirement Achievements
    retirement: [
      {
        name: "First Retirement",
        description: "Retire your first pig",
        target: 1,
        level: 1,
      },
      {
        name: "Pig Academy",
        description: "Retire 10 pigs",
        target: 10,
        level: 2,
      },
      {
        name: "Professor Hall",
        description: "Retire 100 pigs",
        target: 100,
        level: 3,
      },
    ],

    // Gold Achievements
    gold: [
      {
        name: "First Fortune",
        description: "Earn $1,000",
        target: 1000,
        level: 1,
      },
      {
        name: "Growing Wealth",
        description: "Earn $100,000",
        target: 100000,
        level: 2,
      },
      {
        name: "Millionaire",
        description: "Earn $1,000,000",
        target: 1000000,
        level: 3,
      },
    ],
  },

  // ===== RETIREMENT SYSTEM =====
  RETIREMENT: {
    requirements: {
      totalTruffles: 100,
      legendaryTruffles: 1,
    },
    benefits: {
      priceBonus: 0.02, // 2% per retired pig
      passiveIncome: 1, // 1 gold per second (60 per minute)
    },
  },

  // ===== GAME PROGRESSION TARGETS =====
  PROGRESSION_TARGETS: {
    firstRetirement: 15 * 60, // 15 minutes in seconds
    victoryCondition: 1000000, // $1,000,000
    targetPlayTime: 90 * 60, // 90 minutes in seconds

    // Income targets per phase
    earlyGame: { min: 1, max: 500 }, // per minute
    midGame: { min: 500, max: 5000 }, // per minute
    lateGame: { min: 5000, max: 20000 }, // per minute
  },

  // ===== GAME MECHANICS =====
  MECHANICS: {
    // Dirt mound spawning
    moundSpawn: {
      baseInterval: 5.0, // Base seconds between mounds
      spawnZone: { left: 100, right: 600 }, // Pixels from left edge
      moundLifetime: 8.0, // Seconds before mound disappears
      maxActiveMounds: 3, // Maximum mounds on screen
    },

    // Pig behavior
    pig: {
      walkSpeed: 50, // Pixels per second
      digDuration: 1.0, // Seconds to dig
      celebrationDuration: 0.5, // Seconds for success animation
    },

    // Truffle collection
    collection: {
      floatDuration: 1.5, // Seconds to float to basket
      autoSellDelay: 0.5, // Seconds after reaching basket
    },
  },

  // ===== UI FORMATTING =====
  FORMATTING: {
    // Number formatting breakpoints
    numberFormat: [
      { min: 1000, suffix: "K", divisor: 1000 },
      { min: 1000000, suffix: "M", divisor: 1000000 },
      { min: 1000000000, suffix: "B", divisor: 1000000000 },
    ],
  },
};

// ===== UTILITY FUNCTIONS =====
export const GameUtils = {
  /**
   * Format number with K, M, B suffixes
   */
  formatNumber(num) {
    if (num < 1000) return Math.floor(num).toString();

    for (let i = GAME_CONFIG.FORMATTING.numberFormat.length - 1; i >= 0; i--) {
      const format = GAME_CONFIG.FORMATTING.numberFormat[i];
      if (num >= format.min) {
        const formatted = (num / format.divisor).toFixed(1);
        return `${formatted}${format.suffix}`;
      }
    }
    return num.toString();
  },

  /**
   * Format currency with $ prefix
   */
  formatCurrency(amount) {
    return `$${this.formatNumber(amount)}`;
  },

  /**
   * Get cumulative upgrade cost
   */
  getCumulativeUpgradeCost(upgradeType, level) {
    const costs = GAME_CONFIG.UPGRADES[upgradeType].costs;
    return costs.slice(0, level + 1).reduce((sum, cost) => sum + cost, 0);
  },

  /**
   * Get next upgrade cost
   */
  getNextUpgradeCost(upgradeType, currentLevel) {
    const costs = GAME_CONFIG.UPGRADES[upgradeType].costs;
    const maxLevel = GAME_CONFIG.UPGRADES[upgradeType].maxLevel;

    if (currentLevel >= maxLevel) return null;
    return costs[currentLevel];
  },

  /**
   * Calculate achievement reputation reward
   */
  getAchievementReward(level) {
    return 10 * (level * level);
  },

  /**
   * Check if location can be unlocked
   */
  canUnlockLocation(locationId, currentGold, currentReputation) {
    const location = GAME_CONFIG.LOCATIONS[locationId];
    if (!location) return false;

    return (
      currentGold >= location.goldRequired &&
      currentReputation >= location.reputationRequired
    );
  },

  /**
   * Get random truffle type based on location spawn rates
   */
  getRandomTruffleType(locationName) {
    const spawnRates = GAME_CONFIG.LOCATION_SPAWN_RATES[locationName];
    const random = Math.random();
    let cumulativeProbability = 0;

    for (const [truffleType, probability] of Object.entries(spawnRates)) {
      cumulativeProbability += probability;
      if (random <= cumulativeProbability) {
        return truffleType;
      }
    }

    // Fallback to first truffle type
    return Object.keys(spawnRates)[0];
  },
};
