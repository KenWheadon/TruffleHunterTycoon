/**
 * Pig.js - Pig Entity Model
 * Represents a pig with stats, abilities, and behavior
 */

import { GAME_CONFIG } from "../config/GameConfig.js";
import { EventEmitter } from "../utils/EventEmitter.js";

export class Pig extends EventEmitter {
  constructor(color = "#FFB6C1") {
    super();

    // Visual properties
    this.color = color;
    this.id = Date.now() + Math.random(); // Unique identifier

    // Core stats (upgrade levels)
    this.sniffingLevel = 1;
    this.speedLevel = 1;
    this.luckLevel = 1;

    // Progress tracking
    this.trufflesFound = 0;
    this.legendariesFound = 0;
    this.totalValue = 0;

    // Behavioral state
    this.state = "walking"; // walking, digging, celebrating, idle
    this.position = { x: 100, y: 0 }; // Position in game world
    this.isMoving = true;
    this.walkDirection = 1; // 1 for right, -1 for left

    // Animation and timing
    this.currentAnimation = "walk";
    this.animationStartTime = Date.now();
    this.stateStartTime = Date.now();

    // Dig-related properties
    this.currentMound = null;
    this.digStartTime = 0;
    this.digDuration = GAME_CONFIG.MECHANICS.pig.digDuration * 1000; // Convert to ms
    this.celebrationDuration =
      GAME_CONFIG.MECHANICS.pig.celebrationDuration * 1000;

    console.log(`🐷 New pig created! Color: ${color}`);
  }

  /**
   * Update pig behavior and movement
   */
  update(deltaTime) {
    const now = Date.now();

    switch (this.state) {
      case "walking":
        this.updateWalking(deltaTime);
        break;

      case "digging":
        this.updateDigging(now);
        break;

      case "celebrating":
        this.updateCelebrating(now);
        break;

      case "idle":
        // Pig is idle, waiting for input
        break;
    }

    this.emit("pigUpdated", {
      state: this.state,
      position: this.position,
      animation: this.currentAnimation,
    });
  }

  /**
   * Update walking behavior
   */
  updateWalking(deltaTime) {
    if (!this.isMoving) return;

    const walkSpeed = this.getWalkSpeed();
    const movement = walkSpeed * deltaTime;

    // Move pig
    this.position.x += movement * this.walkDirection;

    // Wrap around screen (simple infinite scrolling effect)
    if (this.position.x > 800) {
      this.position.x = -50;
    } else if (this.position.x < -50) {
      this.position.x = 800;
    }

    // Ensure walking animation is active
    if (this.currentAnimation !== "walk") {
      this.setAnimation("walk");
    }
  }

  /**
   * Update digging behavior
   */
  updateDigging(currentTime) {
    const digElapsed = currentTime - this.digStartTime;

    if (digElapsed >= this.digDuration) {
      // Digging complete - attempt to find truffle
      this.finishDigging();
    } else {
      // Still digging - update animation
      if (this.currentAnimation !== "dig") {
        this.setAnimation("dig");
      }
    }
  }

  /**
   * Update celebrating behavior
   */
  updateCelebrating(currentTime) {
    const celebrationElapsed = currentTime - this.stateStartTime;

    if (celebrationElapsed >= this.celebrationDuration) {
      // Celebration complete - return to walking
      this.setState("walking");
    } else {
      // Still celebrating
      if (this.currentAnimation !== "celebrate") {
        this.setAnimation("celebrate");
      }
    }
  }

  /**
   * Start digging at a mound
   */
  startDigging(mound) {
    if (this.state === "digging") return false;

    this.currentMound = mound;
    this.setState("digging");
    this.digStartTime = Date.now();
    this.isMoving = false;

    // Position pig at mound
    this.position.x = mound.x;

    this.emit("pigStartedDigging", {
      mound,
      position: this.position,
    });

    return true;
  }

  /**
   * Finish digging attempt
   */
  finishDigging() {
    if (!this.currentMound) {
      this.setState("walking");
      return;
    }

    const successRate = this.getSuccessRate();
    const found = Math.random() < successRate;

    if (found) {
      // Successfully found a truffle
      const truffleType = this.currentMound.truffleType;
      const baseValue = GAME_CONFIG.TRUFFLE_TYPES[truffleType].baseValue;
      const luckMultiplier = this.getLuckMultiplier(truffleType);
      const finalValue = Math.floor(baseValue * luckMultiplier);

      // Update pig stats
      this.trufflesFound++;
      this.totalValue += finalValue;

      if (GAME_CONFIG.TRUFFLE_TYPES[truffleType].rarity === "legendary") {
        this.legendariesFound++;
      }

      this.emit("truffleFound", {
        type: truffleType,
        value: finalValue,
        baseValue,
        luckMultiplier,
        pig: this,
        mound: this.currentMound,
      });

      // Start celebration
      this.setState("celebrating");
    } else {
      // Digging failed
      this.emit("diggingFailed", {
        mound: this.currentMound,
        successRate,
      });

      // Return to walking
      this.setState("walking");
    }

    // Clean up
    this.currentMound = null;
    this.isMoving = true;
  }

  /**
   * Set pig state
   */
  setState(newState) {
    if (this.state === newState) return;

    const oldState = this.state;
    this.state = newState;
    this.stateStartTime = Date.now();

    this.emit("pigStateChanged", {
      from: oldState,
      to: newState,
      pig: this,
    });
  }

  /**
   * Set pig animation
   */
  setAnimation(animation) {
    if (this.currentAnimation === animation) return;

    this.currentAnimation = animation;
    this.animationStartTime = Date.now();

    this.emit("pigAnimationChanged", {
      animation,
      pig: this,
    });
  }

  /**
   * Get pig's current success rate for finding truffles
   */
  getSuccessRate() {
    const values = GAME_CONFIG.UPGRADES.sniffing.values;
    const rate = values[this.sniffingLevel - 1] || values[0];
    return rate / 100; // Convert percentage to decimal
  }

  /**
   * Get pig's current walking speed
   */
  getWalkSpeed() {
    // Base speed modified by speed level
    const baseSpeed = GAME_CONFIG.MECHANICS.pig.walkSpeed;
    const speedMultiplier = Math.max(0.5, 2 - this.speedLevel * 0.1); // Higher level = slower walk for balance
    return baseSpeed * speedMultiplier;
  }

  /**
   * Get pig's current luck multiplier for rare truffles
   */
  getLuckMultiplier(truffleType) {
    const truffleConfig = GAME_CONFIG.TRUFFLE_TYPES[truffleType];

    // Only apply luck multiplier to rare and legendary truffles
    if (
      truffleConfig.rarity === "rare" ||
      truffleConfig.rarity === "legendary"
    ) {
      const values = GAME_CONFIG.UPGRADES.luck.values;
      return values[this.luckLevel - 1] || values[0];
    }

    return 1.0; // No multiplier for common truffles
  }

  /**
   * Get current mound spawn interval (time between mounds)
   */
  getMoundInterval() {
    const values = GAME_CONFIG.UPGRADES.speed.values;
    return (values[this.speedLevel - 1] || values[0]) * 1000; // Convert to milliseconds
  }

  /**
   * Check if pig can be retired
   */
  canRetire() {
    const requirements = GAME_CONFIG.RETIREMENT.requirements;
    return (
      this.trufflesFound >= requirements.totalTruffles &&
      this.legendariesFound >= requirements.legendaryTruffles
    );
  }

  /**
   * Get formatted upgrade cost for UI
   */
  getUpgradeCost(upgradeType) {
    const costs = GAME_CONFIG.UPGRADES[upgradeType].costs;
    const currentLevel = this[`${upgradeType}Level`];
    const maxLevel = GAME_CONFIG.UPGRADES[upgradeType].maxLevel;

    if (currentLevel >= maxLevel) {
      return null; // Max level reached
    }

    return costs[currentLevel] || 0;
  }

  /**
   * Get formatted upgrade value for UI
   */
  getUpgradeValue(upgradeType) {
    const config = GAME_CONFIG.UPGRADES[upgradeType];
    const currentLevel = this[`${upgradeType}Level`];

    return config.formatValue(currentLevel);
  }

  /**
   * Get next upgrade value for UI
   */
  getNextUpgradeValue(upgradeType) {
    const config = GAME_CONFIG.UPGRADES[upgradeType];
    const currentLevel = this[`${upgradeType}Level`];
    const maxLevel = config.maxLevel;

    if (currentLevel >= maxLevel) {
      return "MAX";
    }

    return config.formatValue(currentLevel + 1);
  }

  /**
   * Check if upgrade is available
   */
  canUpgrade(upgradeType) {
    const currentLevel = this[`${upgradeType}Level`];
    const maxLevel = GAME_CONFIG.UPGRADES[upgradeType].maxLevel;

    return currentLevel < maxLevel;
  }

  /**
   * Get pig's current state for UI
   */
  getState() {
    return {
      id: this.id,
      color: this.color,
      sniffingLevel: this.sniffingLevel,
      speedLevel: this.speedLevel,
      luckLevel: this.luckLevel,
      trufflesFound: this.trufflesFound,
      legendariesFound: this.legendariesFound,
      totalValue: this.totalValue,
      state: this.state,
      position: this.position,
      animation: this.currentAnimation,
      successRate: this.getSuccessRate(),
      canRetire: this.canRetire(),
      upgradeCosts: {
        sniffing: this.getUpgradeCost("sniffing"),
        speed: this.getUpgradeCost("speed"),
        luck: this.getUpgradeCost("luck"),
      },
      upgradeValues: {
        sniffing: this.getUpgradeValue("sniffing"),
        speed: this.getUpgradeValue("speed"),
        luck: this.getUpgradeValue("luck"),
      },
      nextUpgradeValues: {
        sniffing: this.getNextUpgradeValue("sniffing"),
        speed: this.getNextUpgradeValue("speed"),
        luck: this.getNextUpgradeValue("luck"),
      },
    };
  }

  /**
   * Get save data for persistence
   */
  getSaveData() {
    return {
      id: this.id,
      color: this.color,
      sniffingLevel: this.sniffingLevel,
      speedLevel: this.speedLevel,
      luckLevel: this.luckLevel,
      trufflesFound: this.trufflesFound,
      legendariesFound: this.legendariesFound,
      totalValue: this.totalValue,
      state: this.state,
      position: this.position,
    };
  }

  /**
   * Load from save data
   */
  loadSaveData(saveData) {
    this.id = saveData.id || this.id;
    this.color = saveData.color || this.color;
    this.sniffingLevel = saveData.sniffingLevel || 1;
    this.speedLevel = saveData.speedLevel || 1;
    this.luckLevel = saveData.luckLevel || 1;
    this.trufflesFound = saveData.trufflesFound || 0;
    this.legendariesFound = saveData.legendariesFound || 0;
    this.totalValue = saveData.totalValue || 0;
    this.position = saveData.position || { x: 100, y: 0 };
    this.setState(saveData.state || "walking");

    // Reset behavioral state for clean restart
    this.isMoving = true;
    this.currentMound = null;
    this.walkDirection = 1;
  }

  /**
   * Get debug information
   */
  getDebugInfo() {
    return {
      id: this.id,
      state: this.state,
      position: this.position,
      levels: `S${this.sniffingLevel}/Sp${this.speedLevel}/L${this.luckLevel}`,
      progress: `${this.trufflesFound}T/${this.legendariesFound}L`,
      successRate: `${Math.round(this.getSuccessRate() * 100)}%`,
      canRetire: this.canRetire(),
      totalValue: this.totalValue,
    };
  }

  /**
   * Force pig to stop current action and return to walking
   */
  stopCurrentAction() {
    this.currentMound = null;
    this.isMoving = true;
    this.setState("walking");
  }

  /**
   * Manually set pig position (for testing or special events)
   */
  setPosition(x, y) {
    this.position.x = x;
    this.position.y = y;

    this.emit("pigPositionChanged", {
      position: this.position,
      pig: this,
    });
  }

  /**
   * Get pig's contribution to passive income (if retired)
   */
  getPassiveIncomeContribution() {
    return GAME_CONFIG.RETIREMENT.benefits.passiveIncome;
  }

  /**
   * Get pig's price bonus contribution (if retired)
   */
  getPriceBonusContribution() {
    return GAME_CONFIG.RETIREMENT.benefits.priceBonus;
  }
}
