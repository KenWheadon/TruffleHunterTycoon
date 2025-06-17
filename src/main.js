/**
 * main.js - Truffle Hunter Tycoon Entry Point
 * Bootstraps the application and starts the game
 */

import { Game } from "./models/Game.js";
import { GAME_CONFIG, GameUtils } from "./config/GameConfig.js";

class TruffleHunterTycoon {
  constructor() {
    this.game = null;
    this.isInitialized = false;
    this.lastFrameTime = 0;
    this.animationFrameId = null;

    // UI Elements
    this.elements = {};

    // Game state
    this.activeMounds = [];
    this.moundSpawnTimer = 0;
    this.lastMoundSpawn = 0;

    console.log("🎮 Truffle Hunter Tycoon initializing...");
  }

  /**
   * Initialize the game
   */
  async init() {
    try {
      // Show loading screen
      this.showLoadingScreen();

      // Cache DOM elements
      this.cacheElements();

      // Initialize game model
      this.game = new Game();

      // Set up event listeners
      this.setupEventListeners();

      // Attempt to load saved game
      const loaded = this.game.load();
      if (loaded) {
        console.log("📂 Loaded saved game");
      } else {
        console.log("🆕 Starting new game");
      }

      // Update UI with initial state
      this.updateUI();

      // Hide loading screen and start game
      await this.hideLoadingScreen();

      // Start the game loop
      this.start();

      this.isInitialized = true;
      console.log("✅ Game initialized successfully!");
    } catch (error) {
      console.error("❌ Failed to initialize game:", error);
      this.showError("Failed to load game. Please refresh the page.");
    }
  }

  /**
   * Cache DOM elements for performance
   */
  cacheElements() {
    this.elements = {
      // Resource displays
      goldAmount: document.getElementById("gold-amount"),
      reputationAmount: document.getElementById("reputation-amount"),

      // Pig stats
      sniffingLevel: document.getElementById("sniffing-level"),
      speedLevel: document.getElementById("speed-level"),
      luckLevel: document.getElementById("luck-level"),

      // Progress stats
      trufflesFound: document.getElementById("truffles-found"),
      legendariesFound: document.getElementById("legendaries-found"),
      retirementText: document.getElementById("retirement-text"),
      retirePigBtn: document.getElementById("retire-pig"),

      // Upgrade buttons
      upgradeSniffing: document.getElementById("upgrade-sniffing"),
      upgradeSpeed: document.getElementById("upgrade-speed"),
      upgradeLuck: document.getElementById("upgrade-luck"),

      // Location elements
      currentLocation: document.getElementById("current-location"),
      locationButtons: document.querySelectorAll(".location-btn"),

      // Game area
      gameArea: document.getElementById("game-area"),
      gameObjects: document.getElementById("game-objects"),
      pig: document.getElementById("pig"),
      dirtMounds: document.getElementById("dirt-mounds"),
      truffles: document.getElementById("truffles"),
      forestBackground: document.getElementById("forest-background"),

      // UI containers
      notifications: document.getElementById("notifications"),
      loadingScreen: document.getElementById("loading-screen"),
    };
  }

  /**
   * Set up event listeners
   */
  setupEventListeners() {
    // Game model events
    this.game.on("goldEarned", (data) => this.onGoldEarned(data));
    this.game.on("reputationEarned", (data) => this.onReputationEarned(data));
    this.game.on("pigUpgraded", (data) => this.onPigUpgraded(data));
    this.game.on("locationChanged", (data) => this.onLocationChanged(data));
    this.game.on("truffleFound", (data) => this.onTruffleFound(data));
    this.game.on("achievementCompleted", (data) =>
      this.onAchievementCompleted(data)
    );
    this.game.on("pigRetired", (data) => this.onPigRetired(data));
    this.game.on("victoryAchieved", (data) => this.onVictoryAchieved(data));

    // Pig events
    if (this.game.activePig) {
      this.game.activePig.on("truffleFound", (data) =>
        this.onTruffleFoundByPig(data)
      );
      this.game.activePig.on("pigStartedDigging", (data) =>
        this.onPigStartedDigging(data)
      );
    }

    // UI event listeners
    this.elements.upgradeSniffing.addEventListener("click", () =>
      this.upgradeClicked("sniffing")
    );
    this.elements.upgradeSpeed.addEventListener("click", () =>
      this.upgradeClicked("speed")
    );
    this.elements.upgradeLuck.addEventListener("click", () =>
      this.upgradeClicked("luck")
    );

    this.elements.retirePigBtn.addEventListener("click", () =>
      this.retirePigClicked()
    );

    // Location button events
    this.elements.locationButtons.forEach((btn) => {
      btn.addEventListener("click", () =>
        this.locationClicked(btn.dataset.location)
      );
    });

    // Game area click for dirt mounds
    this.elements.gameArea.addEventListener("click", (e) =>
      this.gameAreaClicked(e)
    );

    // Auto-save every 30 seconds
    setInterval(() => {
      if (this.game && this.isInitialized) {
        this.game.save();
      }
    }, 30000);

    // Save on page unload
    window.addEventListener("beforeunload", () => {
      if (this.game) {
        this.game.save();
      }
    });
  }

  /**
   * Start the game loop
   */
  start() {
    this.game.start();
    this.lastFrameTime = performance.now();
    this.gameLoop();

    // Start mound spawning
    this.scheduleMoundSpawn();
  }

  /**
   * Main game loop
   */
  gameLoop(currentTime = performance.now()) {
    const deltaTime = (currentTime - this.lastFrameTime) / 1000; // Convert to seconds
    this.lastFrameTime = currentTime;

    // Update game state
    this.game.update(deltaTime);

    // Update mound spawning
    this.updateMoundSpawning(deltaTime);

    // Update visual elements
    this.updateAnimations(deltaTime);

    // Continue the loop
    this.animationFrameId = requestAnimationFrame((time) =>
      this.gameLoop(time)
    );
  }

  /**
   * Update mound spawning system
   */
  updateMoundSpawning(deltaTime) {
    this.moundSpawnTimer += deltaTime;

    const spawnInterval = this.game.activePig
      ? this.game.activePig.getMoundInterval() / 1000 // Convert to seconds
      : GAME_CONFIG.MECHANICS.moundSpawn.baseInterval;

    if (this.moundSpawnTimer >= spawnInterval) {
      this.spawnMound();
      this.moundSpawnTimer = 0;
    }

    // Update existing mounds
    this.updateMounds(deltaTime);
  }

  /**
   * Spawn a new dirt mound
   */
  spawnMound() {
    // Limit number of active mounds
    if (
      this.activeMounds.length >=
      GAME_CONFIG.MECHANICS.moundSpawn.maxActiveMounds
    ) {
      return;
    }

    const spawnZone = GAME_CONFIG.MECHANICS.moundSpawn.spawnZone;
    const x =
      spawnZone.left + Math.random() * (spawnZone.right - spawnZone.left);
    const y = 50; // Ground level

    // Determine truffle type for this mound
    const truffleType = GameUtils.getRandomTruffleType(
      this.game.currentLocation
    );

    const mound = {
      id: Date.now() + Math.random(),
      x,
      y,
      truffleType,
      spawnTime: Date.now(),
      lifetime: GAME_CONFIG.MECHANICS.moundSpawn.moundLifetime * 1000, // Convert to ms
      element: null,
    };

    // Create DOM element
    const moundElement = document.createElement("div");
    moundElement.className = "dirt-mound clickable";
    moundElement.style.left = `${x}px`;
    moundElement.style.bottom = `${y}px`;
    moundElement.innerHTML = "🌰"; // Dirt mound icon
    moundElement.dataset.moundId = mound.id;

    mound.element = moundElement;
    this.elements.dirtMounds.appendChild(moundElement);
    this.activeMounds.push(mound);

    console.log(
      `🌰 Spawned mound at (${Math.round(x)}, ${y}) with ${truffleType}`
    );
  }

  /**
   * Update existing mounds (remove expired ones)
   */
  updateMounds(deltaTime) {
    const now = Date.now();

    for (let i = this.activeMounds.length - 1; i >= 0; i--) {
      const mound = this.activeMounds[i];
      const age = now - mound.spawnTime;

      if (age >= mound.lifetime) {
        // Remove expired mound
        if (mound.element && mound.element.parentNode) {
          mound.element.parentNode.removeChild(mound.element);
        }
        this.activeMounds.splice(i, 1);
      }
    }
  }

  /**
   * Handle game area clicks (dirt mounds)
   */
  gameAreaClicked(event) {
    const target = event.target;
    if (target.classList.contains("dirt-mound")) {
      const moundId = target.dataset.moundId;
      const mound = this.activeMounds.find((m) => m.id == moundId);

      if (mound) {
        this.moundClicked(mound);
      }
    }
  }

  /**
   * Handle mound click
   */
  moundClicked(mound) {
    if (!this.game.activePig || this.game.activePig.state !== "walking") {
      return; // Pig is busy
    }

    // Start pig digging
    const success = this.game.activePig.startDigging(mound);
    if (success) {
      // Remove mound from active list and DOM
      const index = this.activeMounds.indexOf(mound);
      if (index > -1) {
        this.activeMounds.splice(index, 1);
      }

      if (mound.element && mound.element.parentNode) {
        mound.element.parentNode.removeChild(mound.element);
      }
    }
  }

  /**
   * Schedule next mound spawn
   */
  scheduleMoundSpawn() {
    // This is handled in the game loop now
  }

  /**
   * Update visual animations
   */
  updateAnimations(deltaTime) {
    // Update pig position
    if (this.game.activePig) {
      const pigState = this.game.activePig.getState();
      this.elements.pig.style.left = `${pigState.position.x}px`;

      // Update pig animation class
      this.elements.pig.className = `pig pig--${pigState.animation}`;
    }
  }

  /**
   * Update UI with current game state
   */
  updateUI() {
    const gameState = this.game.getGameState();

    // Update resource displays
    this.elements.goldAmount.textContent = GameUtils.formatCurrency(
      gameState.gold
    );
    this.elements.reputationAmount.textContent =
      gameState.reputation.toString();

    // Update pig stats
    if (gameState.activePig) {
      const pig = gameState.activePig;
      this.elements.sniffingLevel.textContent = `Level ${pig.sniffingLevel} (${pig.upgradeValues.sniffing})`;
      this.elements.speedLevel.textContent = `Level ${pig.speedLevel} (${pig.upgradeValues.speed})`;
      this.elements.luckLevel.textContent = `Level ${pig.luckLevel} (${pig.upgradeValues.luck})`;

      // Update upgrade buttons
      this.updateUpgradeButton("sniffing", pig);
      this.updateUpgradeButton("speed", pig);
      this.updateUpgradeButton("luck", pig);

      // Update progress
      this.elements.trufflesFound.textContent = pig.trufflesFound.toString();
      this.elements.legendariesFound.textContent =
        pig.legendariesFound.toString();

      // Update retirement status
      if (pig.canRetire) {
        this.elements.retirementText.textContent = "Ready to retire!";
        this.elements.retirePigBtn.style.display = "block";
      } else {
        const needed =
          GAME_CONFIG.RETIREMENT.requirements.totalTruffles - pig.trufflesFound;
        const legendaryNeeded =
          GAME_CONFIG.RETIREMENT.requirements.legendaryTruffles -
          pig.legendariesFound;
        this.elements.retirementText.textContent = `Need ${needed} more truffles${
          legendaryNeeded > 0 ? ` + ${legendaryNeeded} legendary` : ""
        }`;
        this.elements.retirePigBtn.style.display = "none";
      }
    }

    // Update location display
    this.elements.currentLocation.textContent = gameState.currentLocation;

    // Update location buttons
    this.updateLocationButtons(gameState);
  }

  /**
   * Update upgrade button state
   */
  updateUpgradeButton(upgradeType, pigState) {
    const button =
      this.elements[
        `upgrade${upgradeType.charAt(0).toUpperCase() + upgradeType.slice(1)}`
      ];
    const cost = pigState.upgradeCosts[upgradeType];

    if (cost === null) {
      button.textContent = "MAX";
      button.disabled = true;
    } else {
      button.textContent = `Upgrade (${GameUtils.formatCurrency(cost)})`;
      button.disabled = this.game.gold < cost;
    }
  }

  /**
   * Update location button states
   */
  updateLocationButtons(gameState) {
    this.elements.locationButtons.forEach((button) => {
      const locationId = button.dataset.location;
      const locationKey = Object.keys(GAME_CONFIG.LOCATIONS).find(
        (key) => GAME_CONFIG.LOCATIONS[key].id === locationId
      );

      if (!locationKey) return;

      const location = GAME_CONFIG.LOCATIONS[locationKey];
      const isUnlocked = gameState.unlockedLocations.includes(locationKey);
      const isCurrent = gameState.currentLocation === locationKey;
      const canUnlock = GameUtils.canUnlockLocation(
        locationKey,
        gameState.gold,
        gameState.reputation
      );

      button.classList.toggle("active", isCurrent);
      button.classList.toggle("locked", !isUnlocked);

      if (!isUnlocked) {
        button.classList.toggle("can-unlock", canUnlock);
        button.textContent = `${location.name} (${
          location.reputationRequired
        }⭐ + ${GameUtils.formatCurrency(location.goldRequired)})`;
      } else {
        button.textContent = location.name;
      }
    });
  }

  // ===== EVENT HANDLERS =====

  /**
   * Handle upgrade button clicks
   */
  upgradeClicked(upgradeType) {
    const success = this.game.upgradePig(upgradeType);
    if (success) {
      this.updateUI();
      this.showNotification(`Upgraded ${upgradeType}!`, "success");
    } else {
      this.showNotification("Not enough gold!", "warning");
    }
  }

  /**
   * Handle retire pig button click
   */
  retirePigClicked() {
    const success = this.game.retirePig();
    if (success) {
      this.updateUI();
      this.showNotification("Pig retired to Professor Hall!", "achievement");
    }
  }

  /**
   * Handle location button clicks
   */
  locationClicked(locationId) {
    const locationKey = Object.keys(GAME_CONFIG.LOCATIONS).find(
      (key) => GAME_CONFIG.LOCATIONS[key].id === locationId
    );

    if (!locationKey) return;

    const isUnlocked = this.game.unlockedLocations.includes(locationKey);

    if (isUnlocked) {
      // Switch to location
      this.game.switchLocation(locationKey);
    } else {
      // Try to unlock location
      const success = this.game.unlockLocation(locationKey);
      if (success) {
        this.showNotification(
          `Unlocked ${GAME_CONFIG.LOCATIONS[locationKey].name}!`,
          "success"
        );
        this.game.switchLocation(locationKey);
      } else {
        this.showNotification("Cannot unlock location yet!", "warning");
      }
    }
  }

  /**
   * Handle gold earned
   */
  onGoldEarned(data) {
    this.updateUI();

    if (data.source === "truffle") {
      // Create floating gold text effect
      this.createFloatingText(
        `+${GameUtils.formatCurrency(data.amount)}`,
        "gold"
      );
    }
  }

  /**
   * Handle reputation earned
   */
  onReputationEarned(data) {
    this.updateUI();

    if (data.source === "truffle") {
      this.createFloatingText(`+${data.amount}⭐`, "reputation");
    }
  }

  /**
   * Handle pig upgraded
   */
  onPigUpgraded(data) {
    this.updateUI();
  }

  /**
   * Handle location changed
   */
  onLocationChanged(data) {
    this.updateUI();

    // Update background
    this.elements.forestBackground.className = `forest-background ${data.location.backgroundClass}`;

    this.showNotification(`Moved to ${data.to}`, "success");
  }

  /**
   * Handle truffle found by game
   */
  onTruffleFound(data) {
    this.updateUI();
  }

  /**
   * Handle truffle found by pig
   */
  onTruffleFoundByPig(data) {
    // This is called when pig successfully digs up a truffle
    // The game model will handle the actual truffle found event
    console.log(`🍄 Pig found ${data.type}!`);
  }

  /**
   * Handle pig started digging
   */
  onPigStartedDigging(data) {
    console.log("🐷 Pig started digging!");
  }

  /**
   * Handle achievement completed
   */
  onAchievementCompleted(data) {
    this.showNotification(`🏆 ${data.achievement.name}!`, "achievement");
    this.updateUI();
  }

  /**
   * Handle pig retired
   */
  onPigRetired(data) {
    this.updateUI();
  }

  /**
   * Handle victory achieved
   */
  onVictoryAchieved(data) {
    this.showNotification("🏆 VICTORY! You reached $1M!", "achievement");
    // Could show victory screen here
  }

  // ===== UI UTILITIES =====

  /**
   * Show loading screen
   */
  showLoadingScreen() {
    this.elements.loadingScreen.style.display = "flex";
  }

  /**
   * Hide loading screen with animation
   */
  async hideLoadingScreen() {
    return new Promise((resolve) => {
      this.elements.loadingScreen.classList.add("fade-out");
      setTimeout(() => {
        this.elements.loadingScreen.style.display = "none";
        resolve();
      }, 500);
    });
  }

  /**
   * Show notification message
   */
  showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `notification notification--${type}`;
    notification.textContent = message;

    this.elements.notifications.appendChild(notification);

    // Trigger show animation
    requestAnimationFrame(() => {
      notification.classList.add("show");
    });

    // Auto-remove after delay
    setTimeout(() => {
      notification.classList.remove("show");
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  /**
   * Create floating text effect
   */
  createFloatingText(text, type) {
    // Simple implementation for now
    console.log(`💫 ${text}`);
  }

  /**
   * Show error message
   */
  showError(message) {
    alert(`Error: ${message}`);
  }
}

// Initialize game when DOM is ready
document.addEventListener("DOMContentLoaded", () => {
  const game = new TruffleHunterTycoon();
  game.init();

  // Expose to window for debugging
  window.truffleGame = game;
});

console.log("🎮 Truffle Hunter Tycoon script loaded!");
