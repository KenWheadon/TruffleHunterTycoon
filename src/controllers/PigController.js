/**
 * PigController.js - Pig Behavior and Movement Controller
 * Manages pig movement, animations, and interaction with game world
 */

import { GAME_CONFIG } from "../config/GameConfig.js";
import { EventEmitter } from "../utils/EventEmitter.js";

export class PigController extends EventEmitter {
  constructor(pig, gameView) {
    super();

    this.pig = pig;
    this.gameView = gameView;

    // Movement state
    this.isActive = true;
    this.walkSpeed = GAME_CONFIG.MECHANICS.pig.walkSpeed;
    this.currentPosition = { x: 100, y: 0 };
    this.targetPosition = null;
    this.isMovingToTarget = false;

    // Animation state
    this.currentAnimation = "walk";
    this.animationStartTime = Date.now();

    // Interaction state
    this.isDigging = false;
    this.digStartTime = 0;
    this.currentMound = null;

    // Visual elements
    this.pigElement = null;
    this.dustParticles = [];

    // Bind pig model events
    this.setupPigEvents();

    console.log("🎮 PigController initialized");
  }

  /**
   * Initialize and bind pig model events
   */
  setupPigEvents() {
    if (!this.pig) return;

    this.pig.on("pigStateChanged", (data) => this.onPigStateChanged(data));
    this.pig.on("pigStartedDigging", (data) => this.onPigStartedDigging(data));
    this.pig.on("truffleFound", (data) => this.onTruffleFound(data));
    this.pig.on("diggingFailed", (data) => this.onDiggingFailed(data));
  }

  /**
   * Initialize pig visual representation
   */
  initializePigVisual(container) {
    this.pigElement = document.getElementById("pig");
    if (!this.pigElement) {
      console.error("❌ Pig element not found in DOM");
      return false;
    }

    // Set pig to center of screen and keep it there
    this.currentPosition = { x: 400, y: 0 }; // Center horizontally
    this.updatePigPosition();

    // Set pig color
    this.updatePigColor();

    // Start walking animation
    this.setAnimation("walk");

    console.log("🐷 Pig visual initialized at center position");
    return true;
  }

  /**
   * Update pig controller each frame
   */
  update(deltaTime) {
    if (!this.isActive || !this.pig) return;

    // Update pig model
    this.pig.update(deltaTime);

    // Update movement
    this.updateMovement(deltaTime);

    // Update animations
    this.updateAnimations(deltaTime);

    // Update visual position
    this.updatePigPosition();

    // Update dust particles
    this.updateDustParticles(deltaTime);
  }

  /**
   * Update pig movement logic
   */
  updateMovement(deltaTime) {
    // Pig stays in center - no horizontal movement
    // Only handle digging movement (move to mound when digging)

    if (this.isMovingToTarget && this.targetPosition) {
      // When digging, pig moves to the mound position
      const dx = this.targetPosition.x - this.currentPosition.x;
      const distance = Math.abs(dx);

      if (distance < 5) {
        // Reached target
        this.currentPosition.x = this.targetPosition.x;
        this.isMovingToTarget = false;
        this.targetPosition = null;
        this.emit("pigReachedTarget");
      } else {
        // Move toward target
        const direction = dx > 0 ? 1 : -1;
        const moveSpeed = this.walkSpeed * 2; // Move faster when targeting
        const movement = moveSpeed * direction * deltaTime;
        this.currentPosition.x += movement;
      }
    } else {
      // Return pig to center position when not digging
      const centerX = 400; // Center of screen
      const dx = centerX - this.currentPosition.x;

      if (Math.abs(dx) > 5) {
        const direction = dx > 0 ? 1 : -1;
        const returnSpeed = this.walkSpeed * 3; // Fast return to center
        const movement = returnSpeed * direction * deltaTime;
        this.currentPosition.x += movement;
      } else {
        this.currentPosition.x = centerX;
      }
    }
  }

  /**
   * Update pig animations based on current state
   */
  updateAnimations(deltaTime) {
    const currentTime = Date.now();

    // Check if animation needs to change based on pig state
    let targetAnimation = "walk";

    switch (this.pig.state) {
      case "walking":
        targetAnimation = "walk";
        break;
      case "digging":
        targetAnimation = "dig";
        break;
      case "celebrating":
        targetAnimation = "celebrate";
        break;
      case "idle":
        targetAnimation = "idle";
        break;
    }

    if (this.currentAnimation !== targetAnimation) {
      this.setAnimation(targetAnimation);
    }
  }

  /**
   * Update visual pig position in DOM
   */
  updatePigPosition() {
    if (!this.pigElement) return;

    // Update CSS position
    this.pigElement.style.left = `${this.currentPosition.x}px`;

    // Update pig model position
    if (this.pig) {
      this.pig.position.x = this.currentPosition.x;
      this.pig.position.y = this.currentPosition.y;
    }
  }

  /**
   * Set pig animation state
   */
  setAnimation(animation) {
    if (this.currentAnimation === animation) return;

    this.currentAnimation = animation;
    this.animationStartTime = Date.now();

    if (this.pigElement) {
      // Remove all animation classes
      this.pigElement.className = this.pigElement.className
        .replace(/pig--\w+/g, "")
        .trim();

      // Add new animation class
      this.pigElement.classList.add(`pig--${animation}`);
    }

    this.emit("pigAnimationChanged", {
      animation,
      pig: this.pig,
    });

    console.log(`🐷 Pig animation changed to: ${animation}`);
  }

  /**
   * Update pig color based on pig model
   */
  updatePigColor() {
    if (!this.pigElement || !this.pig) return;

    const pigSprite = this.pigElement.querySelector(".pig-sprite");
    if (pigSprite) {
      pigSprite.style.background = this.pig.color;

      // Update pseudo-elements (ears) via CSS custom properties
      pigSprite.style.setProperty("--pig-color", this.pig.color);
    }
  }

  /**
   * Get speed modifier based on pig upgrades
   */
  getSpeedModifier() {
    if (!this.pig) return 1;

    // Speed upgrade actually reduces time between mounds, not walking speed
    // But we can add a slight visual speed increase for higher levels
    const speedLevel = this.pig.speedLevel || 1;
    return 1 + (speedLevel - 1) * 0.1; // 10% faster per level
  }

  /**
   * Make pig move to a specific position (like a mound)
   */
  moveToPosition(x, y) {
    this.targetPosition = { x, y };
    this.isMovingToTarget = true;

    this.emit("pigMovingToTarget", {
      target: this.targetPosition,
      current: this.currentPosition,
    });

    console.log(`🐷 Pig moving to position: ${x}, ${y}`);
  }

  /**
   * Start pig digging at current position
   */
  startDigging(mound) {
    if (!this.pig || this.pig.state === "digging") {
      return false;
    }

    // Move to mound position first
    this.moveToPosition(mound.x, mound.y);

    // Once at mound, start digging
    this.once("pigReachedTarget", () => {
      const success = this.pig.startDigging(mound);
      if (success) {
        this.currentMound = mound;
        this.isDigging = true;
        this.digStartTime = Date.now();

        // Create dust particles
        this.createDustParticles();

        this.emit("pigStartedDigging", {
          mound,
          pig: this.pig,
        });
      }
    });

    return true;
  }

  /**
   * Create dust particles for digging effect
   */
  createDustParticles() {
    const particleCount = 5;

    for (let i = 0; i < particleCount; i++) {
      const particle = {
        x: this.currentPosition.x + (Math.random() - 0.5) * 30,
        y: this.currentPosition.y + 20 + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 40,
        vy: -Math.random() * 30 - 10,
        life: 1.0,
        maxLife: 0.8 + Math.random() * 0.4,
        size: 2 + Math.random() * 3,
      };

      this.dustParticles.push(particle);
    }
  }

  /**
   * Update dust particle system
   */
  updateDustParticles(deltaTime) {
    for (let i = this.dustParticles.length - 1; i >= 0; i--) {
      const particle = this.dustParticles[i];

      // Update position
      particle.x += particle.vx * deltaTime;
      particle.y += particle.vy * deltaTime;

      // Apply gravity
      particle.vy += 60 * deltaTime;

      // Update life
      particle.life -= deltaTime / particle.maxLife;

      if (particle.life <= 0) {
        this.dustParticles.splice(i, 1);
      }
    }

    // Render dust particles (simple DOM implementation)
    this.renderDustParticles();
  }

  /**
   * Render dust particles to DOM
   */
  renderDustParticles() {
    // Remove old particles
    const oldParticles = document.querySelectorAll(".dust-particle");
    oldParticles.forEach((p) => p.remove());

    // Add current particles
    const gameObjects = document.getElementById("game-objects");
    if (!gameObjects) return;

    this.dustParticles.forEach((particle) => {
      const element = document.createElement("div");
      element.className = "dust-particle";
      element.style.cssText = `
                position: absolute;
                left: ${particle.x}px;
                bottom: ${particle.y}px;
                width: ${particle.size}px;
                height: ${particle.size}px;
                background: #8B7355;
                border-radius: 50%;
                opacity: ${particle.life * 0.7};
                pointer-events: none;
                z-index: 15;
            `;
      gameObjects.appendChild(element);
    });
  }

  // ===== EVENT HANDLERS =====

  /**
   * Handle pig state changes from model
   */
  onPigStateChanged(data) {
    console.log(`🐷 Pig state changed: ${data.from} → ${data.to}`);

    if (data.to === "walking") {
      this.isDigging = false;
      this.currentMound = null;
      this.dustParticles = []; // Clear particles
    }

    this.emit("pigStateChanged", data);
  }

  /**
   * Handle pig started digging event
   */
  onPigStartedDigging(data) {
    console.log("🐷 Pig started digging");
    this.createDustParticles();
  }

  /**
   * Handle truffle found event
   */
  onTruffleFound(data) {
    console.log(`🍄 Pig found truffle: ${data.type}`);

    // Create success particles
    this.createSuccessParticles(data.type);

    // Emit to parent controllers
    this.emit("truffleFoundByPig", data);
  }

  /**
   * Handle digging failed event
   */
  onDiggingFailed(data) {
    console.log("🐷 Pig digging failed");

    // Visual feedback for failure
    this.createFailureEffect();

    this.emit("diggingFailed", data);
  }

  /**
   * Create success particles for truffle found
   */
  createSuccessParticles(truffleType) {
    const truffleConfig = GAME_CONFIG.TRUFFLE_TYPES[truffleType];
    const isLegendary = truffleConfig.rarity === "legendary";
    const particleCount = isLegendary ? 15 : 8;

    const gameObjects = document.getElementById("game-objects");
    if (!gameObjects) return;

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement("div");
      particle.className = "success-particle";

      const angle = (i / particleCount) * Math.PI * 2;
      const speed = 50 + Math.random() * 30;
      const distance = 30 + Math.random() * 20;

      const endX = this.currentPosition.x + Math.cos(angle) * distance;
      const endY = 20 + Math.sin(angle) * distance;

      particle.style.cssText = `
                position: absolute;
                left: ${this.currentPosition.x}px;
                bottom: 20px;
                width: ${isLegendary ? 8 : 6}px;
                height: ${isLegendary ? 8 : 6}px;
                background: ${isLegendary ? "#FFD700" : truffleConfig.color};
                border-radius: 50%;
                z-index: 25;
                pointer-events: none;
                animation: particle-burst 1s ease-out forwards;
                --burst-x: ${endX - this.currentPosition.x}px;
                --burst-y: ${endY}px;
            `;

      gameObjects.appendChild(particle);

      // Remove after animation
      setTimeout(() => {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle);
        }
      }, 1000);
    }
  }

  /**
   * Create failure effect for unsuccessful digging
   */
  createFailureEffect() {
    if (!this.pigElement) return;

    // Simple shake effect
    this.pigElement.style.animation = "none";
    this.pigElement.offsetHeight; // Trigger reflow
    this.pigElement.style.animation = "pig-shake 0.5s ease-out";

    setTimeout(() => {
      if (this.pigElement) {
        this.pigElement.style.animation = "";
      }
    }, 500);
  }

  // ===== PUBLIC METHODS =====

  /**
   * Get current pig position
   */
  getPosition() {
    return { ...this.currentPosition };
  }

  /**
   * Set pig position manually
   */
  setPosition(x, y) {
    this.currentPosition.x = x;
    this.currentPosition.y = y;
    this.updatePigPosition();
  }

  /**
   * Check if pig is currently busy (digging, moving to target, etc.)
   */
  isBusy() {
    return (
      this.isDigging ||
      this.isMovingToTarget ||
      (this.pig && this.pig.state !== "walking")
    );
  }

  /**
   * Get debug information
   */
  getDebugInfo() {
    return {
      position: this.currentPosition,
      animation: this.currentAnimation,
      state: this.pig ? this.pig.state : "no pig",
      isBusy: this.isBusy(),
      isDigging: this.isDigging,
      isMovingToTarget: this.isMovingToTarget,
      dustParticles: this.dustParticles.length,
      walkSpeed: this.walkSpeed * this.getSpeedModifier(),
    };
  }

  /**
   * Clean up controller
   */
  destroy() {
    // Remove event listeners
    if (this.pig) {
      this.pig.removeAllListeners();
    }

    // Clean up DOM elements
    const particles = document.querySelectorAll(
      ".dust-particle, .success-particle"
    );
    particles.forEach((p) => p.remove());

    // Clear arrays
    this.dustParticles = [];

    console.log("🧹 PigController destroyed");
  }
}
