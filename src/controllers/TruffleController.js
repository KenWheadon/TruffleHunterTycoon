/**
 * TruffleController.js - Manages dirt mounds and truffle collection
 * Handles spawning, timing, and interaction with mounds
 */

import { GAME_CONFIG, GameUtils } from "../config/GameConfig.js";
import { EventEmitter } from "../utils/EventEmitter.js";

export class TruffleController extends EventEmitter {
  constructor(game) {
    super();

    this.game = game;

    // Mound management
    this.activeMounds = [];
    this.moundIdCounter = 1;
    this.maxActiveMounds = GAME_CONFIG.MECHANICS.moundSpawn.maxActiveMounds;

    // Timing
    this.spawnTimer = 0;
    this.lastSpawnTime = 0;
    this.baseSpawnInterval = GAME_CONFIG.MECHANICS.moundSpawn.baseInterval;

    // DOM elements
    this.moundContainer = null;
    this.truffleContainer = null;
    this.gameArea = null;

    // Scrolling world mechanics
    this.worldSpeed = 100; // Pixels per second that world moves left
    this.screenWidth = 800; // Approximate screen width
    this.spawnX = this.screenWidth + 50; // Spawn off right side
    this.despawnX = -100; // Remove when off left side

    // Spawning parameters
    this.moundLifetime = GAME_CONFIG.MECHANICS.moundSpawn.moundLifetime * 1000; // Convert to ms

    console.log("🍄 TruffleController initialized for scrolling world");
  }

  /**
   * Initialize DOM containers
   */
  initialize() {
    this.moundContainer = document.getElementById("dirt-mounds");
    this.truffleContainer = document.getElementById("truffles");
    this.gameArea = document.getElementById("game-area");

    if (!this.moundContainer || !this.truffleContainer) {
      console.error("❌ Required DOM containers not found");
      return false;
    }

    // Get actual screen width
    if (this.gameArea) {
      this.screenWidth = this.gameArea.clientWidth;
      this.spawnX = this.screenWidth + 50;
    }

    console.log(
      `✅ TruffleController DOM initialized (screen width: ${this.screenWidth}px)`
    );
    return true;
  }

  /**
   * Update controller each frame
   */
  update(deltaTime) {
    if (!this.game || !this.game.activePig) return;

    // Update spawn timing
    this.updateSpawning(deltaTime);

    // Update existing mounds (move them left)
    this.updateMounds(deltaTime);

    // Clean up off-screen mounds
    this.cleanupOffscreenMounds();
  }

  /**
   * Update mound spawning logic
   */
  updateSpawning(deltaTime) {
    this.spawnTimer += deltaTime;

    // Get spawn interval based on pig speed level
    const spawnInterval = this.getSpawnInterval();

    // Check if it's time to spawn and if we have room
    if (
      this.spawnTimer >= spawnInterval &&
      this.activeMounds.length < this.maxActiveMounds
    ) {
      this.spawnMound();
      this.spawnTimer = 0;
    }
  }

  /**
   * Get current spawn interval based on pig speed
   */
  getSpawnInterval() {
    if (!this.game.activePig) {
      return this.baseSpawnInterval;
    }

    // Speed level reduces time between mounds
    const speedValues = GAME_CONFIG.UPGRADES.speed.values;
    const speedLevel = this.game.activePig.speedLevel || 1;
    return speedValues[speedLevel - 1] || this.baseSpawnInterval;
  }

  /**
   * Spawn a new dirt mound
   */
  spawnMound() {
    if (!this.moundContainer) return;

    // Spawn at right edge of screen
    const x = this.spawnX;
    const y = 50; // Ground level

    // Determine what truffle type this mound will contain
    const currentLocation = this.game.currentLocation;
    const truffleType = GameUtils.getRandomTruffleType(currentLocation);
    const truffleConfig = GAME_CONFIG.TRUFFLE_TYPES[truffleType];

    // Create mound data
    const mound = {
      id: this.moundIdCounter++,
      x,
      y,
      truffleType,
      spawnTime: Date.now(),
      element: null,
      clicked: false,
      rarity: truffleConfig.rarity,
    };

    // Create DOM element
    const moundElement = this.createMoundElement(mound);
    mound.element = moundElement;

    // Add to active mounds
    this.activeMounds.push(mound);

    // Add to DOM
    this.moundContainer.appendChild(moundElement);

    // Emit spawn event
    this.emit("moundSpawned", {
      mound,
      truffleType,
      position: { x, y },
      totalActive: this.activeMounds.length,
    });

    console.log(
      `🌰 Spawned mound at (${Math.round(x)}, ${y}) with ${truffleType} (${
        truffleConfig.rarity
      })`
    );
  }

  /**
   * Create DOM element for a mound
   */
  createMoundElement(mound) {
    const element = document.createElement("div");
    element.className = "dirt-mound clickable";
    element.dataset.moundId = mound.id;
    element.innerHTML = "🌰";

    // Position the mound
    element.style.left = `${mound.x}px`;
    element.style.bottom = `${mound.y}px`;

    // Add rarity class for visual effects
    if (mound.rarity === "legendary") {
      element.classList.add("dirt-mound--legendary");
    } else if (mound.rarity === "rare") {
      element.classList.add("dirt-mound--rare");
    }

    // Note: Click handling is done via event delegation in main.js
    // No individual click handlers needed here

    return element;
  }

  /**
   * Handle mound click interaction
   */
  handleMoundClick(mound, event) {
    event.stopPropagation();

    // Prevent double-clicking
    if (mound.clicked) return;

    // Check if pig is available
    if (!this.game.activePig || this.game.activePig.state !== "walking") {
      this.showFeedback("Pig is busy!", "warning");
      return;
    }

    // Mark as clicked to prevent double-clicks
    mound.clicked = true;

    // Visual feedback
    mound.element.style.transform = "scale(0.9)";
    mound.element.style.opacity = "0.7";

    // Emit click event
    this.emit("moundClicked", {
      mound,
      pig: this.game.activePig,
      truffleType: mound.truffleType,
    });

    // Remove mound from active list and DOM
    this.removeMound(mound);

    console.log(
      `🎯 Mound clicked: ${mound.truffleType} at (${Math.round(mound.x)}, ${
        mound.y
      })`
    );
  }

  /**
   * Show mound preview on hover
   */
  showMoundPreview(mound) {
    const truffleConfig = GAME_CONFIG.TRUFFLE_TYPES[mound.truffleType];

    // Create tooltip
    const tooltip = document.createElement("div");
    tooltip.className = "mound-tooltip";
    tooltip.innerHTML = `
            <div class="tooltip-content">
                <div class="truffle-type">${mound.truffleType}</div>
                <div class="truffle-value">${GameUtils.formatCurrency(
                  truffleConfig.baseValue
                )}</div>
                <div class="truffle-rarity">${truffleConfig.rarity}</div>
            </div>
        `;

    tooltip.style.cssText = `
            position: absolute;
            left: ${mound.x}px;
            bottom: ${mound.y + 60}px;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 8px 12px;
            border-radius: 6px;
            font-size: 12px;
            text-align: center;
            pointer-events: none;
            z-index: 100;
            white-space: nowrap;
            animation: tooltip-appear 0.2s ease-out;
        `;

    mound.element.tooltip = tooltip;
    this.moundContainer.appendChild(tooltip);
  }

  /**
   * Hide mound preview tooltip
   */
  hideMoundPreview(mound) {
    if (mound.element.tooltip) {
      mound.element.tooltip.remove();
      mound.element.tooltip = null;
    }
  }

  /**
   * Update existing mounds (move them left across screen)
   */
  updateMounds(deltaTime) {
    this.activeMounds.forEach((mound) => {
      // Move mound left across screen
      mound.x -= this.worldSpeed * deltaTime;

      // Update DOM position
      if (mound.element) {
        mound.element.style.left = `${mound.x}px`;
      }
    });
  }

  /**
   * Clean up mounds that have moved off screen
   */
  cleanupOffscreenMounds() {
    for (let i = this.activeMounds.length - 1; i >= 0; i--) {
      const mound = this.activeMounds[i];

      if (mound.x < this.despawnX) {
        this.removeMound(mound, true); // true = went off screen
      }
    }
  }

  /**
   * Remove a mound from the game
   */
  removeMound(mound, offScreen = false) {
    // Remove from array
    const index = this.activeMounds.indexOf(mound);
    if (index > -1) {
      this.activeMounds.splice(index, 1);
    }

    // Clean up tooltip
    if (mound.element.tooltip) {
      mound.element.tooltip.remove();
    }

    // Remove from DOM with animation
    if (mound.element && mound.element.parentNode) {
      if (offScreen) {
        // Just remove immediately for off-screen mounds
        mound.element.parentNode.removeChild(mound.element);
      } else {
        // Animate removal for clicked mounds
        mound.element.classList.add("dirt-mound--despawning");
        setTimeout(() => {
          if (mound.element.parentNode) {
            mound.element.parentNode.removeChild(mound.element);
          }
        }, 300);
      }
    }

    // Emit removal event
    this.emit("moundRemoved", {
      mound,
      offScreen,
      remainingMounds: this.activeMounds.length,
    });

    if (offScreen) {
      console.log(`📤 Mound went off screen: ${mound.truffleType}`);
    }
  }

  /**
   * Create and animate a truffle collection effect
   */
  createTruffleCollectionEffect(truffleType, startX, startY) {
    if (!this.truffleContainer) return;

    const truffleConfig = GAME_CONFIG.TRUFFLE_TYPES[truffleType];
    const basketElement = document.getElementById("collection-basket");

    if (!basketElement) {
      console.error("❌ Collection basket not found");
      return;
    }

    // Get basket position
    const basketRect = basketElement.getBoundingClientRect();
    const gameArea = document.getElementById("game-area");
    const gameRect = gameArea.getBoundingClientRect();

    const basketX = basketRect.left - gameRect.left + basketRect.width / 2;
    const basketY = gameRect.bottom - basketRect.bottom + basketRect.height / 2;

    // Create truffle element
    const truffleElement = document.createElement("div");
    truffleElement.className = `truffle truffle--${truffleType
      .toLowerCase()
      .replace(/\s+/g, "-")} truffle--collecting`;
    truffleElement.innerHTML = truffleConfig.icon;
    truffleElement.style.background = truffleConfig.color;

    // Position at start location
    truffleElement.style.left = `${startX}px`;
    truffleElement.style.bottom = `${startY}px`;

    // Calculate collection animation
    const deltaX = basketX - startX;
    const deltaY = basketY - startY;

    truffleElement.style.setProperty("--collect-x", `${deltaX}px`);
    truffleElement.style.setProperty("--collect-y", `${deltaY}px`);

    // Add to container
    this.truffleContainer.appendChild(truffleElement);

    // Remove after animation
    setTimeout(() => {
      if (truffleElement.parentNode) {
        truffleElement.parentNode.removeChild(truffleElement);
      }

      // Trigger basket animation
      this.animateCollectionBasket();
    }, GAME_CONFIG.MECHANICS.collection.floatDuration * 1000);

    // Create floating value text
    this.createFloatingValueText(truffleType, startX, startY);

    console.log(`✨ Created collection effect for ${truffleType}`);
  }

  /**
   * Create floating value text for collected truffle
   */
  createFloatingValueText(truffleType, x, y) {
    const truffleConfig = GAME_CONFIG.TRUFFLE_TYPES[truffleType];
    const baseValue = truffleConfig.baseValue;

    // Apply luck multiplier if applicable
    let finalValue = baseValue;
    if (
      this.game.activePig &&
      (truffleConfig.rarity === "rare" || truffleConfig.rarity === "legendary")
    ) {
      const luckMultiplier = this.game.activePig.getLuckMultiplier(truffleType);
      finalValue = Math.floor(baseValue * luckMultiplier);
    }

    const valueText = document.createElement("div");
    valueText.className = "floating-value";

    // Determine text class based on value
    if (finalValue < 50) {
      valueText.classList.add("floating-value--small");
    } else if (finalValue < 500) {
      valueText.classList.add("floating-value--medium");
    } else if (finalValue < 5000) {
      valueText.classList.add("floating-value--large");
    } else {
      valueText.classList.add("floating-value--legendary");
    }

    valueText.textContent = `+${GameUtils.formatCurrency(finalValue)}`;
    valueText.style.left = `${x}px`;
    valueText.style.bottom = `${y + 40}px`;

    // Add to container
    const gameObjects = document.getElementById("game-objects");
    if (gameObjects) {
      gameObjects.appendChild(valueText);

      // Remove after animation
      setTimeout(() => {
        if (valueText.parentNode) {
          valueText.parentNode.removeChild(valueText);
        }
      }, 2500);
    }
  }

  /**
   * Animate collection basket when truffle is collected
   */
  animateCollectionBasket() {
    const basket = document.getElementById("collection-basket");
    if (!basket) return;

    basket.style.animation = "none";
    basket.offsetHeight; // Trigger reflow
    basket.style.animation = "basket-collect 0.4s ease-out";

    setTimeout(() => {
      basket.style.animation = "";
    }, 400);
  }

  /**
   * Show feedback message
   */
  showFeedback(message, type = "info") {
    this.emit("showNotification", {
      message,
      type,
      duration: 2000,
    });
  }

  /**
   * Get spawn zone information
   */
  getSpawnZone() {
    return { ...this.spawnZone };
  }

  /**
   * Get active mounds count
   */
  getActiveMoundsCount() {
    return this.activeMounds.length;
  }

  /**
   * Get active mounds data (for debugging)
   */
  getActiveMounds() {
    return this.activeMounds.map((mound) => ({
      id: mound.id,
      x: Math.round(mound.x),
      y: mound.y,
      truffleType: mound.truffleType,
      age: Date.now() - mound.spawnTime,
      remainingLife: mound.lifetime - (Date.now() - mound.spawnTime),
    }));
  }

  /**
   * Force spawn a mound (for testing)
   */
  forceSpawnMound(truffleType = null) {
    if (this.activeMounds.length >= this.maxActiveMounds) {
      console.log("❌ Cannot force spawn - too many active mounds");
      return false;
    }

    // Temporarily override random truffle selection
    if (truffleType && GAME_CONFIG.TRUFFLE_TYPES[truffleType]) {
      const originalGetRandom = GameUtils.getRandomTruffleType;
      GameUtils.getRandomTruffleType = () => truffleType;

      this.spawnMound();

      // Restore original function
      GameUtils.getRandomTruffleType = originalGetRandom;

      console.log(`🎯 Force spawned mound with ${truffleType}`);
      return true;
    } else {
      this.spawnMound();
      return true;
    }
  }

  /**
   * Clear all active mounds
   */
  clearAllMounds() {
    const moundsToRemove = [...this.activeMounds];
    moundsToRemove.forEach((mound) => {
      this.removeMound(mound);
    });

    console.log("🧹 Cleared all active mounds");
  }

  /**
   * Get debug information
   */
  getDebugInfo() {
    return {
      activeMounds: this.activeMounds.length,
      maxMounds: this.maxActiveMounds,
      spawnTimer: Math.round(this.spawnTimer * 100) / 100,
      spawnInterval: this.getSpawnInterval(),
      spawnZone: this.spawnZone,
      moundLifetime: this.moundLifetime / 1000,
      currentLocation: this.game.currentLocation,
    };
  }

  /**
   * Clean up controller
   */
  destroy() {
    // Clear all mounds
    this.clearAllMounds();

    // Remove event listeners
    this.removeAllListeners();

    console.log("🧹 TruffleController destroyed");
  }
}
