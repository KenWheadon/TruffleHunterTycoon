/**
 * main.js - Truffle Hunter Tycoon Entry Point
 * Bootstraps the application and starts the game
 */

import { Game } from "./models/Game.js";
import { GAME_CONFIG, GameUtils } from "./config/GameConfig.js";
import { PigController } from "./controllers/PigController.js";
import { TruffleController } from "./controllers/TruffleController.js";

class TruffleHunterTycoon {
  constructor() {
    this.game = null;
    this.pigController = null;
    this.truffleController = null;

    this.isInitialized = false;
    this.lastFrameTime = 0;
    this.animationFrameId = null;

    // UI Elements
    this.elements = {};

    console.log("🎮 Truffle Hunter Tycoon initializing...");
  }

  /**
   * Initialize the game
   */
  async init() {
    try {
      // Cache DOM elements first
      this.cacheElements();

      // Show loading screen
      this.showLoadingScreen();

      // Initialize game model
      this.game = new Game();

      // Initialize controllers
      this.pigController = new PigController(this.game.activePig, this);
      this.truffleController = new TruffleController(this.game);

      // Set up event listeners
      this.setupEventListeners();

      // Initialize controllers with DOM
      if (!this.pigController.initializePigVisual()) {
        throw new Error("Failed to initialize pig visual");
      }

      if (!this.truffleController.initialize()) {
        throw new Error("Failed to initialize truffle controller");
      }

      // Attempt to load saved game
      const loaded = this.game.load();
      if (loaded) {
        console.log("📂 Loaded saved game");
        // Update pig controller with loaded pig
        this.pigController.pig = this.game.activePig;
        this.pigController.setupPigEvents();
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
    const elementIds = {
      // Resource displays
      goldAmount: "gold-amount",
      reputationAmount: "reputation-amount",

      // Pig stats
      sniffingLevel: "sniffing-level",
      speedLevel: "speed-level",
      luckLevel: "luck-level",

      // Progress stats
      trufflesFound: "truffles-found",
      legendariesFound: "legendaries-found",
      retirementText: "retirement-text",
      retirePigBtn: "retire-pig",

      // Upgrade buttons
      upgradeSniffing: "upgrade-sniffing",
      upgradeSpeed: "upgrade-speed",
      upgradeLuck: "upgrade-luck",

      // Location elements
      currentLocation: "current-location",

      // Game area
      gameArea: "game-area",
      gameObjects: "game-objects",
      pig: "pig",
      dirtMounds: "dirt-mounds",
      truffles: "truffles",
      forestBackground: "forest-background",

      // UI containers
      notifications: "notifications",
      loadingScreen: "loading-screen",
    };

    this.elements = {};
    const missingElements = [];

    // Cache each element
    for (const [key, id] of Object.entries(elementIds)) {
      const element = document.getElementById(id);
      if (element) {
        this.elements[key] = element;
      } else {
        missingElements.push(id);
        console.warn(`⚠️ Element not found: ${id}`);
      }
    }

    // Cache location buttons separately since they're a NodeList
    this.elements.locationButtons = document.querySelectorAll(".location-btn");

    if (missingElements.length > 0) {
      console.warn(
        `⚠️ Missing ${missingElements.length} DOM elements:`,
        missingElements
      );
    } else {
      console.log("✅ All DOM elements cached successfully");
    }

    return missingElements.length === 0;
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

    // Controller events
    this.setupControllerEvents();

    // UI event listeners with null checks
    if (this.elements.upgradeSniffing) {
      this.elements.upgradeSniffing.addEventListener("click", () =>
        this.upgradeClicked("sniffing")
      );
    }
    if (this.elements.upgradeSpeed) {
      this.elements.upgradeSpeed.addEventListener("click", () =>
        this.upgradeClicked("speed")
      );
    }
    if (this.elements.upgradeLuck) {
      this.elements.upgradeLuck.addEventListener("click", () =>
        this.upgradeClicked("luck")
      );
    }

    if (this.elements.retirePigBtn) {
      this.elements.retirePigBtn.addEventListener("click", () =>
        this.retirePigClicked()
      );
    }

    // Location button events
    if (this.elements.locationButtons) {
      this.elements.locationButtons.forEach((btn) => {
        btn.addEventListener("click", () =>
          this.locationClicked(btn.dataset.location)
        );
      });
    }

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
   * Set up controller event listeners
   */
  setupControllerEvents() {
    // Pig controller events
    if (this.pigController) {
      this.pigController.on("pigStateChanged", (data) =>
        this.onPigStateChanged(data)
      );
      this.pigController.on("truffleFoundByPig", (data) =>
        this.onTruffleFoundByPig(data)
      );
      this.pigController.on("pigStartedDigging", (data) =>
        this.onPigStartedDigging(data)
      );
      this.pigController.on("diggingFailed", (data) =>
        this.onDiggingFailed(data)
      );
      this.pigController.on("pigWrappedScreen", (data) =>
        this.onPigWrappedScreen(data)
      );
    }

    // Truffle controller events
    if (this.truffleController) {
      this.truffleController.on("moundSpawned", (data) =>
        this.onMoundSpawned(data)
      );
      this.truffleController.on("moundClicked", (data) =>
        this.onMoundClicked(data)
      );
      this.truffleController.on("moundRemoved", (data) =>
        this.onMoundRemoved(data)
      );
      this.truffleController.on("showNotification", (data) =>
        this.showNotification(data.message, data.type)
      );
    }
  }

  /**
   * Start the game loop
   */
  start() {
    this.game.start();
    this.lastFrameTime = performance.now();
    this.gameLoop();

    console.log("🎮 Game loop started");
  }

  /**
   * Main game loop
   */
  gameLoop(currentTime = performance.now()) {
    const deltaTime = (currentTime - this.lastFrameTime) / 1000; // Convert to seconds
    this.lastFrameTime = currentTime;

    // Update game state
    this.game.update(deltaTime);

    // Update controllers
    if (this.pigController) {
      this.pigController.update(deltaTime);
    }

    if (this.truffleController) {
      this.truffleController.update(deltaTime);
    }

    // Update UI periodically (not every frame for performance)
    if (
      Math.floor(currentTime / 100) !== Math.floor(this.lastFrameTime / 100)
    ) {
      this.updateUI();
    }

    // Continue the loop
    this.animationFrameId = requestAnimationFrame((time) =>
      this.gameLoop(time)
    );
  }

  // Remove old mound management methods since they're now in TruffleController
  // updateMoundSpawning, spawnMound, updateMounds, moundClicked, scheduleMoundSpawn, updateAnimations
  // are all handled by the controllers now

  /**
   * Update UI with current game state
   */
  updateUI() {
    if (!this.game) return;

    const gameState = this.game.getGameState();

    // Update resource displays
    if (this.elements.goldAmount) {
      this.elements.goldAmount.textContent = GameUtils.formatCurrency(
        gameState.gold
      );
    }
    if (this.elements.reputationAmount) {
      this.elements.reputationAmount.textContent =
        gameState.reputation.toString();
    }

    // Update pig stats
    if (gameState.activePig) {
      const pig = gameState.activePig;

      if (this.elements.sniffingLevel) {
        this.elements.sniffingLevel.textContent = `Level ${pig.sniffingLevel} (${pig.upgradeValues.sniffing})`;
      }
      if (this.elements.speedLevel) {
        this.elements.speedLevel.textContent = `Level ${pig.speedLevel} (${pig.upgradeValues.speed})`;
      }
      if (this.elements.luckLevel) {
        this.elements.luckLevel.textContent = `Level ${pig.luckLevel} (${pig.upgradeValues.luck})`;
      }

      // Update upgrade buttons
      this.updateUpgradeButton("sniffing", pig);
      this.updateUpgradeButton("speed", pig);
      this.updateUpgradeButton("luck", pig);

      // Update progress
      if (this.elements.trufflesFound) {
        this.elements.trufflesFound.textContent = pig.trufflesFound.toString();
      }
      if (this.elements.legendariesFound) {
        this.elements.legendariesFound.textContent =
          pig.legendariesFound.toString();
      }

      // Update retirement status
      if (this.elements.retirementText && this.elements.retirePigBtn) {
        if (pig.canRetire) {
          this.elements.retirementText.textContent = "Ready to retire!";
          this.elements.retirePigBtn.style.display = "block";
        } else {
          const needed =
            GAME_CONFIG.RETIREMENT.requirements.totalTruffles -
            pig.trufflesFound;
          const legendaryNeeded =
            GAME_CONFIG.RETIREMENT.requirements.legendaryTruffles -
            pig.legendariesFound;
          this.elements.retirementText.textContent = `Need ${needed} more truffles${
            legendaryNeeded > 0 ? ` + ${legendaryNeeded} legendary` : ""
          }`;
          this.elements.retirePigBtn.style.display = "none";
        }
      }
    }

    // Update location display
    if (this.elements.currentLocation) {
      this.elements.currentLocation.textContent = gameState.currentLocation;
    }

    // Update location buttons
    this.updateLocationButtons(gameState);
  }

  /**
   * Update upgrade button state
   */
  updateUpgradeButton(upgradeType, pigState) {
    const buttonKey = `upgrade${
      upgradeType.charAt(0).toUpperCase() + upgradeType.slice(1)
    }`;
    const button = this.elements[buttonKey];

    if (!button) return;

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

  // ===== CONTROLLER EVENT HANDLERS =====

  /**
   * Handle pig state changes
   */
  onPigStateChanged(data) {
    console.log(`🐷 Pig state: ${data.from} → ${data.to}`);
    this.updateUI();
  }

  /**
   * Handle pig started digging
   */
  onPigStartedDigging(data) {
    console.log("🐷 Pig started digging!");
    this.showNotification("Pig is digging...", "info");
  }

  /**
   * Handle digging failed
   */
  onDiggingFailed(data) {
    console.log("💔 Digging failed");
    this.showNotification("No truffle found!", "warning");
  }

  /**
   * Handle pig wrapped around screen
   */
  onPigWrappedScreen(data) {
    // Optional: could show a cute animation or sound effect
    console.log(`🌍 Pig wrapped screen (${data.direction})`);
  }

  /**
   * Handle mound spawned
   */
  onMoundSpawned(data) {
    // Optional: could show spawn effects or sounds
    if (data.mound.rarity === "legendary") {
      this.showNotification("✨ Legendary mound appeared!", "achievement");
    }
  }

  /**
   * Handle mound clicked
   */
  onMoundClicked(data) {
    console.log(`🎯 Mound clicked: ${data.truffleType}`);

    // Tell pig controller to start digging
    if (this.pigController) {
      this.pigController.startDigging(data.mound);
    }
  }

  /**
   * Handle mound removed
   */
  onMoundRemoved(data) {
    if (data.expired) {
      console.log("⏰ Mound expired");
    }
  }

  // ===== EXISTING EVENT HANDLERS (updated) =====

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
    console.log(`🍄 Pig found ${data.type}! Value: ${data.value}`);

    // Create collection animation
    if (this.truffleController) {
      this.truffleController.createTruffleCollectionEffect(
        data.type,
        data.pig.position.x,
        data.pig.position.y + 20
      );
    }

    // Let the game model handle the actual truffle processing
    // This will trigger onTruffleFound which updates resources
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
    const loadingScreen =
      this.elements.loadingScreen || document.getElementById("loading-screen");
    if (loadingScreen) {
      loadingScreen.style.display = "flex";
    }
  }

  /**
   * Hide loading screen with animation
   */
  async hideLoadingScreen() {
    const loadingScreen =
      this.elements.loadingScreen || document.getElementById("loading-screen");
    if (!loadingScreen) return Promise.resolve();

    return new Promise((resolve) => {
      loadingScreen.classList.add("fade-out");
      setTimeout(() => {
        loadingScreen.style.display = "none";
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
