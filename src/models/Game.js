/**
 * Game.js - Central Game State Manager
 * Manages all game state, progression, and core game logic
 */

import { GAME_CONFIG, GameUtils } from "../config/GameConfig.js";
import { Pig } from "./Pig.js";
import { EventEmitter } from "../utils/EventEmitter.js";

export class Game extends EventEmitter {
  constructor() {
    super();

    // Core Resources
    this.gold = 0;
    this.reputation = 0;
    this.totalGoldEarned = 0;

    // Game State
    this.currentLocation = "Beginner Forest";
    this.activePig = null;
    this.retiredPigs = [];
    this.gameStartTime = Date.now();
    this.lastUpdateTime = Date.now();
    this.isRunning = false;

    // Statistics
    this.statistics = {
      trufflesFound: {},
      totalTrufflesFound: 0,
      legendaryTrufflesFound: 0,
      pigsRetired: 0,
      locationsUnlocked: 1,
      upgradesPurchased: 0,
    };

    // Initialize truffle statistics
    for (const truffleType of Object.keys(GAME_CONFIG.TRUFFLE_TYPES)) {
      this.statistics.trufflesFound[truffleType] = 0;
    }

    // Achievement tracking
    this.achievements = {
      earned: [],
      progress: {},
    };
    this.initializeAchievementProgress();

    // Passive income from retired pigs
    this.passiveIncomeRate = 0; // Gold per second
    this.lastPassiveIncomeTime = Date.now();

    // Initialize first pig
    this.activePig = new Pig(this.generateRandomPigColor());

    // Initialize location unlocks
    this.unlockedLocations = ["Beginner Forest"];

    console.log("🐷 Game initialized with first pig!");
  }

  /**
   * Initialize achievement progress tracking
   */
  initializeAchievementProgress() {
    // Truffle discovery achievements
    for (const [truffleType, achievements] of Object.entries(
      GAME_CONFIG.ACHIEVEMENTS.truffle_discovery
    )) {
      for (const achievement of achievements) {
        const key = `${truffleType}_${achievement.level}`;
        this.achievements.progress[key] = {
          ...achievement,
          truffleType,
          current: 0,
          completed: false,
        };
      }
    }

    // Retirement achievements
    for (const achievement of GAME_CONFIG.ACHIEVEMENTS.retirement) {
      const key = `retirement_${achievement.level}`;
      this.achievements.progress[key] = {
        ...achievement,
        current: 0,
        completed: false,
      };
    }

    // Gold achievements
    for (const achievement of GAME_CONFIG.ACHIEVEMENTS.gold) {
      const key = `gold_${achievement.level}`;
      this.achievements.progress[key] = {
        ...achievement,
        current: 0,
        completed: false,
      };
    }
  }

  /**
   * Start the game loop
   */
  start() {
    this.isRunning = true;
    this.lastUpdateTime = Date.now();
    this.lastPassiveIncomeTime = Date.now();

    this.emit("gameStarted");
    console.log("🎮 Game started!");
  }

  /**
   * Main game update loop
   */
  update(deltaTime) {
    if (!this.isRunning) return;

    // Update passive income from retired pigs
    this.updatePassiveIncome();

    // Update pig
    if (this.activePig) {
      this.activePig.update(deltaTime);
    }

    // Check for location unlocks
    this.checkLocationUnlocks();

    // Check victory condition
    this.checkVictoryCondition();

    this.emit("gameUpdated", {
      gold: this.gold,
      reputation: this.reputation,
      pig: this.activePig,
      statistics: this.statistics,
    });
  }

  /**
   * Update passive income from retired pigs
   */
  updatePassiveIncome() {
    const now = Date.now();
    const deltaTime = (now - this.lastPassiveIncomeTime) / 1000;

    if (this.passiveIncomeRate > 0 && deltaTime > 0) {
      const income = this.passiveIncomeRate * deltaTime;
      this.addGold(income, "passive");
    }

    this.lastPassiveIncomeTime = now;
  }

  /**
   * Add gold to player's total
   */
  addGold(amount, source = "truffle") {
    const bonusMultiplier =
      1 + this.retiredPigs.length * GAME_CONFIG.RETIREMENT.benefits.priceBonus;
    const finalAmount = amount * bonusMultiplier;

    this.gold += finalAmount;
    this.totalGoldEarned += finalAmount;

    // Update gold achievement progress
    this.updateAchievementProgress("gold", this.totalGoldEarned);

    this.emit("goldEarned", {
      amount: finalAmount,
      total: this.gold,
      bonusMultiplier,
      source,
    });
  }

  /**
   * Spend gold if player has enough
   */
  spendGold(amount) {
    if (this.gold >= amount) {
      this.gold -= amount;
      this.emit("goldSpent", { amount, remaining: this.gold });
      return true;
    }
    return false;
  }

  /**
   * Add reputation
   */
  addReputation(amount, source = "truffle") {
    this.reputation += amount;
    this.emit("reputationEarned", {
      amount,
      total: this.reputation,
      source,
    });
  }

  /**
   * Record a truffle find
   */
  foundTruffle(truffleType, value) {
    // Update statistics
    this.statistics.trufflesFound[truffleType]++;
    this.statistics.totalTrufflesFound++;

    // Check if it's legendary
    const truffleConfig = GAME_CONFIG.TRUFFLE_TYPES[truffleType];
    if (truffleConfig.rarity === "legendary") {
      this.statistics.legendaryTrufflesFound++;
      this.activePig.legendariesFound++;
    }

    // Update pig stats
    this.activePig.trufflesFound++;

    // Add gold and reputation
    this.addGold(value);
    const reputationReward = GAME_CONFIG.REPUTATION_REWARDS[truffleType] || 1;
    this.addReputation(reputationReward);

    // Update achievement progress
    this.updateAchievementProgress(
      truffleType,
      this.statistics.trufflesFound[truffleType]
    );

    this.emit("truffleFound", {
      type: truffleType,
      value,
      reputationReward,
      totalFound: this.statistics.trufflesFound[truffleType],
    });

    console.log(
      `🍄 Found ${truffleType}! Value: $${value}, Total: ${this.statistics.trufflesFound[truffleType]}`
    );
  }

  /**
   * Update achievement progress
   */
  updateAchievementProgress(type, currentValue) {
    let progressUpdated = false;

    // Handle truffle type achievements
    if (GAME_CONFIG.TRUFFLE_TYPES[type]) {
      for (let level = 1; level <= 3; level++) {
        const key = `${type}_${level}`;
        const achievement = this.achievements.progress[key];

        if (achievement && !achievement.completed) {
          achievement.current = currentValue;

          if (achievement.current >= achievement.target) {
            this.completeAchievement(key);
            progressUpdated = true;
          }
        }
      }
    }

    // Handle gold achievements
    if (type === "gold") {
      for (let level = 1; level <= 3; level++) {
        const key = `gold_${level}`;
        const achievement = this.achievements.progress[key];

        if (achievement && !achievement.completed) {
          achievement.current = currentValue;

          if (achievement.current >= achievement.target) {
            this.completeAchievement(key);
            progressUpdated = true;
          }
        }
      }
    }

    // Handle retirement achievements
    if (type === "retirement") {
      for (let level = 1; level <= 3; level++) {
        const key = `retirement_${level}`;
        const achievement = this.achievements.progress[key];

        if (achievement && !achievement.completed) {
          achievement.current = currentValue;

          if (achievement.current >= achievement.target) {
            this.completeAchievement(key);
            progressUpdated = true;
          }
        }
      }
    }

    if (progressUpdated) {
      this.emit("achievementProgressUpdated");
    }
  }

  /**
   * Complete an achievement
   */
  completeAchievement(achievementKey) {
    const achievement = this.achievements.progress[achievementKey];
    if (!achievement || achievement.completed) return;

    achievement.completed = true;
    this.achievements.earned.push(achievementKey);

    // Award reputation
    const reputationReward = GameUtils.getAchievementReward(achievement.level);
    this.addReputation(reputationReward, "achievement");

    this.emit("achievementCompleted", {
      achievement,
      reputationReward,
    });

    console.log(
      `🏆 Achievement completed: ${achievement.name} (+${reputationReward} reputation)`
    );
  }

  /**
   * Upgrade pig ability
   */
  upgradePig(upgradeType) {
    if (!this.activePig) return false;

    const cost = GameUtils.getNextUpgradeCost(
      upgradeType,
      this.activePig[`${upgradeType}Level`]
    );
    if (cost === null) {
      console.log(`❌ ${upgradeType} is already at max level`);
      return false;
    }

    if (!this.spendGold(cost)) {
      console.log(
        `❌ Not enough gold for ${upgradeType} upgrade (need ${cost})`
      );
      return false;
    }

    // Upgrade the pig
    this.activePig[`${upgradeType}Level`]++;
    this.statistics.upgradesPurchased++;

    this.emit("pigUpgraded", {
      upgradeType,
      newLevel: this.activePig[`${upgradeType}Level`],
      cost,
    });

    console.log(
      `✅ Upgraded ${upgradeType} to level ${
        this.activePig[`${upgradeType}Level`]
      } for ${cost}`
    );
    return true;
  }

  /**
   * Retire the current pig
   */
  retirePig() {
    if (!this.activePig || !this.activePig.canRetire()) {
      console.log("❌ Cannot retire pig - requirements not met");
      return false;
    }

    // Add pig to retired list
    const retiredPig = {
      id: Date.now(),
      color: this.activePig.color,
      trufflesFound: this.activePig.trufflesFound,
      legendariesFound: this.activePig.legendariesFound,
      sniffingLevel: this.activePig.sniffingLevel,
      speedLevel: this.activePig.speedLevel,
      luckLevel: this.activePig.luckLevel,
      retiredAt: Date.now(),
      totalGoldEarned: 0,
    };

    this.retiredPigs.push(retiredPig);
    this.statistics.pigsRetired++;

    // Update passive income rate
    this.passiveIncomeRate =
      this.retiredPigs.length * GAME_CONFIG.RETIREMENT.benefits.passiveIncome;

    // Award retirement reputation
    const reputationReward = GAME_CONFIG.REPUTATION_REWARDS.pig_retirement;
    this.addReputation(reputationReward, "retirement");

    // Update retirement achievement progress
    this.updateAchievementProgress("retirement", this.statistics.pigsRetired);

    // Create new pig
    this.activePig = new Pig(this.generateRandomPigColor());

    this.emit("pigRetired", {
      retiredPig,
      newPig: this.activePig,
      passiveIncomeRate: this.passiveIncomeRate,
      reputationReward,
    });

    console.log(
      `🎓 Pig retired! Now have ${this.retiredPigs.length} professor pigs earning ${this.passiveIncomeRate} gold/sec`
    );
    return true;
  }

  /**
   * Switch to a different location
   */
  switchLocation(locationName) {
    const location = GAME_CONFIG.LOCATIONS[locationName];
    if (!location) {
      console.log(`❌ Invalid location: ${locationName}`);
      return false;
    }

    if (!this.unlockedLocations.includes(locationName)) {
      console.log(`❌ Location not unlocked: ${locationName}`);
      return false;
    }

    const previousLocation = this.currentLocation;
    this.currentLocation = locationName;

    this.emit("locationChanged", {
      from: previousLocation,
      to: locationName,
      location,
    });

    console.log(`🌲 Switched to ${locationName}`);
    return true;
  }

  /**
   * Attempt to unlock a location
   */
  unlockLocation(locationName) {
    const location = GAME_CONFIG.LOCATIONS[locationName];
    if (!location) return false;

    if (this.unlockedLocations.includes(locationName)) {
      console.log(`📍 ${locationName} is already unlocked`);
      return true;
    }

    if (
      !GameUtils.canUnlockLocation(locationName, this.gold, this.reputation)
    ) {
      console.log(`❌ Cannot unlock ${locationName} - insufficient resources`);
      return false;
    }

    // Spend resources
    if (!this.spendGold(location.goldRequired)) {
      return false;
    }

    // Add to unlocked locations
    this.unlockedLocations.push(locationName);
    this.statistics.locationsUnlocked++;

    this.emit("locationUnlocked", {
      locationName,
      location,
      totalUnlocked: this.unlockedLocations.length,
    });

    console.log(
      `🔓 Unlocked ${locationName}! (Cost: ${location.goldRequired}, ${location.reputationRequired} rep)`
    );
    return true;
  }

  /**
   * Check for automatic location unlocks
   */
  checkLocationUnlocks() {
    const allLocations = Object.keys(GAME_CONFIG.LOCATIONS);

    for (const locationName of allLocations) {
      if (!this.unlockedLocations.includes(locationName)) {
        if (
          GameUtils.canUnlockLocation(locationName, this.gold, this.reputation)
        ) {
          this.emit("locationUnlockAvailable", {
            locationName,
            location: GAME_CONFIG.LOCATIONS[locationName],
          });
        }
      }
    }
  }

  /**
   * Check victory condition
   */
  checkVictoryCondition() {
    if (
      this.totalGoldEarned >= GAME_CONFIG.PROGRESSION_TARGETS.victoryCondition
    ) {
      if (!this.hasWon) {
        this.hasWon = true;
        const playTime = Math.floor((Date.now() - this.gameStartTime) / 1000);

        this.emit("victoryAchieved", {
          totalGold: this.totalGoldEarned,
          playTime,
          pigsRetired: this.statistics.pigsRetired,
          trufflesFound: this.statistics.totalTrufflesFound,
        });

        console.log(
          `🏆 VICTORY! Reached ${GameUtils.formatNumber(
            GAME_CONFIG.PROGRESSION_TARGETS.victoryCondition
          )} in ${Math.floor(playTime / 60)} minutes!`
        );
      }
    }
  }

  /**
   * Generate random pig color
   */
  generateRandomPigColor() {
    const colors = [
      "#FFB6C1", // Light Pink
      "#DDA0DD", // Plum
      "#F0E68C", // Khaki
      "#E6E6FA", // Lavender
      "#FFF8DC", // Cornsilk
      "#F5DEB3", // Wheat
      "#FFE4E1", // Misty Rose
      "#FFEFD5", // Papaya Whip
      "#F0F8FF", // Alice Blue
      "#E0FFFF", // Light Cyan
    ];

    return colors[Math.floor(Math.random() * colors.length)];
  }

  /**
   * Get current game state for UI
   */
  getGameState() {
    return {
      gold: this.gold,
      reputation: this.reputation,
      totalGoldEarned: this.totalGoldEarned,
      currentLocation: this.currentLocation,
      unlockedLocations: this.unlockedLocations,
      activePig: this.activePig ? this.activePig.getState() : null,
      retiredPigs: this.retiredPigs,
      passiveIncomeRate: this.passiveIncomeRate,
      statistics: this.statistics,
      achievements: this.achievements,
      playTime: Math.floor((Date.now() - this.gameStartTime) / 1000),
      hasWon: this.hasWon || false,
    };
  }

  /**
   * Save game state to localStorage
   */
  save() {
    const saveData = {
      version: "1.0",
      timestamp: Date.now(),
      gold: this.gold,
      reputation: this.reputation,
      totalGoldEarned: this.totalGoldEarned,
      currentLocation: this.currentLocation,
      unlockedLocations: this.unlockedLocations,
      activePig: this.activePig ? this.activePig.getSaveData() : null,
      retiredPigs: this.retiredPigs,
      passiveIncomeRate: this.passiveIncomeRate,
      statistics: this.statistics,
      achievements: this.achievements,
      gameStartTime: this.gameStartTime,
      hasWon: this.hasWon || false,
    };

    try {
      localStorage.setItem(
        "truffle-hunter-tycoon-save",
        JSON.stringify(saveData)
      );
      this.emit("gameSaved");
      console.log("💾 Game saved successfully");
      return true;
    } catch (error) {
      console.error("❌ Failed to save game:", error);
      this.emit("saveError", error);
      return false;
    }
  }

  /**
   * Load game state from localStorage
   */
  load() {
    try {
      const saveDataStr = localStorage.getItem("truffle-hunter-tycoon-save");
      if (!saveDataStr) {
        console.log("📁 No save data found");
        return false;
      }

      const saveData = JSON.parse(saveDataStr);

      // Restore game state
      this.gold = saveData.gold || 0;
      this.reputation = saveData.reputation || 0;
      this.totalGoldEarned = saveData.totalGoldEarned || 0;
      this.currentLocation = saveData.currentLocation || "Beginner Forest";
      this.unlockedLocations = saveData.unlockedLocations || [
        "Beginner Forest",
      ];
      this.retiredPigs = saveData.retiredPigs || [];
      this.passiveIncomeRate = saveData.passiveIncomeRate || 0;
      this.statistics = saveData.statistics || this.statistics;
      this.achievements = saveData.achievements || this.achievements;
      this.gameStartTime = saveData.gameStartTime || Date.now();
      this.hasWon = saveData.hasWon || false;

      // Restore active pig
      if (saveData.activePig) {
        this.activePig = new Pig();
        this.activePig.loadSaveData(saveData.activePig);
      } else {
        this.activePig = new Pig(this.generateRandomPigColor());
      }

      // Reset passive income timer
      this.lastPassiveIncomeTime = Date.now();

      this.emit("gameLoaded", this.getGameState());
      console.log("📂 Game loaded successfully");
      console.log(
        `🐷 ${this.retiredPigs.length} retired pigs, ${GameUtils.formatNumber(
          this.gold
        )} gold, ${this.reputation} reputation`
      );
      return true;
    } catch (error) {
      console.error("❌ Failed to load game:", error);
      this.emit("loadError", error);
      return false;
    }
  }

  /**
   * Reset game to initial state
   */
  reset() {
    // Clear save data
    localStorage.removeItem("truffle-hunter-tycoon-save");

    // Reset all properties
    this.gold = 0;
    this.reputation = 0;
    this.totalGoldEarned = 0;
    this.currentLocation = "Beginner Forest";
    this.retiredPigs = [];
    this.passiveIncomeRate = 0;
    this.gameStartTime = Date.now();
    this.lastUpdateTime = Date.now();
    this.lastPassiveIncomeTime = Date.now();
    this.hasWon = false;

    // Reset statistics
    this.statistics = {
      trufflesFound: {},
      totalTrufflesFound: 0,
      legendaryTrufflesFound: 0,
      pigsRetired: 0,
      locationsUnlocked: 1,
      upgradesPurchased: 0,
    };

    for (const truffleType of Object.keys(GAME_CONFIG.TRUFFLE_TYPES)) {
      this.statistics.trufflesFound[truffleType] = 0;
    }

    // Reset achievements
    this.achievements = { earned: [], progress: {} };
    this.initializeAchievementProgress();

    // Reset locations
    this.unlockedLocations = ["Beginner Forest"];

    // Create new pig
    this.activePig = new Pig(this.generateRandomPigColor());

    this.emit("gameReset");
    console.log("🔄 Game reset to initial state");
  }

  /**
   * Get debug information
   */
  getDebugInfo() {
    return {
      version: "1.0",
      playTime: Math.floor((Date.now() - this.gameStartTime) / 1000),
      tickRate: this.isRunning ? "60 FPS" : "Paused",
      memoryUsage:
        this.achievements.earned.length +
        this.retiredPigs.length +
        this.unlockedLocations.length,
      activePig: this.activePig ? this.activePig.getDebugInfo() : null,
      passiveIncome: `${this.passiveIncomeRate}/sec from ${this.retiredPigs.length} pigs`,
      achievements: `${this.achievements.earned.length} earned`,
      locations: `${this.unlockedLocations.length}/4 unlocked`,
    };
  }
}
