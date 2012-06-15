/*********************************************************************
 WEBKOULES: an HTML5 port of the classic Koules game
 License: GPL
**********************************************************************/

/*
  ONGOING: Enemies, game loop
  TODO: 
  - Add eyes, particle tail, explosions, accretion
  - Add background
  - Add a scoreboard/statusbar
*/

/*
  Requirements:
  - Persistence of configuration (soon Crafty.storage)
  - Menu (cannot find anything ready made)
  - Client/server multiplayer (WebSocket)
    - It will be tough to have a client and server side implementation
    - Either we need JS on the server or we are only client/server
    - JS on the server is possible with node.js
    - Do we really need multiplayer?
  - Bunch of entities doing stuff to each other in a loop (Crafty)
*/

/*
  Issues:
  
*/

window.onload = function () {
    //TODO: figure out how to reduce FPS to 25 (original Koules)
    Crafty.init(640, 460);
    initSprites();
    Crafty.scene("story");
    Crafty.scene("menu");
};

Config = {
    // Levels at which certain entities begin appearing
    level: { 
        blackHole: 5,
        bigBall: 12,
        bigBallMulti: 10,
        magneticHole: 20,
        spring: 30,
        thief: 40,
        finder: 50,
        thiefToolkit: 60,
        inspector: 70,
        immediateBigBall: 90,
        lunatic: 80,
        last: 99
    },

    // TODO: Introductory text for above levels
    intro: {
        
    },
    
    // Radii for balls, holes and eyes
    radius: {
        smallBall: 8,
        bigBall: 16,
        applePolisher: 32,
        inspector: 14,
        eye: 10,
        lunatic: 10,
        hole: 12,
        rocket: 14
    },

    // Mass for balls
    mass: {
        rocket: 4,
        smallBall: 3,
        bigBall: 8,
        inspector: 2,
        lunatic: 3.14,
        applePolisher: 34
    },

    // Speed (rocket depends on difficulty)
    speed: {
        rocket: 1.2,
        ball: 1.2,
        bigBall: 1.2,
        lunatic: 1.2,
        inspector: 0,
        applePolisher: 0
    },

    // Physical Modifiers
    modifier: {
        slowDown: 0.8,
        gumm: 20
    },

    // Spring parameters
    spring: {
        size: 64,
        strength: 8,
        rand: 40
    },

    gravity: {
        max: 0.8
    },

    chase: {
        maxDistance: 640
    },
    
    powerup: {
        accelerate: 0.13,
        increaseMass: 0.8,
        goodieAccelerateFactor: 4,
        goodieIncreaseMassFactor: 9
    },

    score: {
        accelerate: 10,
        increaseMass: 10,
        thief: -30,
        goodie: 30,
        thiefToolkit: 30
    },

    // Time until rocket is active after spawning (ms)
    activationDelay: {
        initial: 4000,
        midlevel: 8000
    },

    // Player lives before restarting level
    lives: 5,
    
    // Ship to color
    color: {
        rocket: "yellow",
        smallBall: "red",
        bigBall: "green",
        inspector: "blue",
        lunatic: "gray",
        accelerate: "green",
        increaseMass: "blue",
        thief: "gray",
        spring: "white"
    },

    // Color gradient stops
    gradientStops: {
        yellow: [ [ 0, 'rgb(248, 248, 196)' ],
                  [ 0.25, 'rgb(192, 192, 0)' ],
                  [ 0.90, 'rgb(96, 96, 0)' ],
                  [ 1.0, 'rgba(96, 96, 0, 0)' ]
                ],
        red: [ [ 0, 'rgb(248, 196, 196)' ],
               [ 0.25, 'rgb(196, 0, 0)' ],
               [ 0.90, 'rgb(96, 0, 0)' ],
               [ 1.0, 'rgba(96, 0, 0, 0)' ]
             ],
        green: [ [ 0, 'rgb(196, 248, 196)' ],
                 [ 0.25, 'rgb(0, 248, 0)' ],
                 [ 0.90, 'rgb(0, 96, 0)' ],
                 [ 1.0, 'rgba(0, 96, 0, 0)' ]
               ],
        blue: [ [ 0, 'rgb(196, 196, 248)' ],
                [ 0.25, 'rgb(0, 0, 248)' ],
                [ 0.90, 'rgb(0, 0, 96)' ],
                [ 1.0, 'rgba(0, 0, 96, 0)' ]
              ]
    },

    // Whether the color gradient is reversed (inverted sphere)
    reverseGradient: {
        rocket: false,
        smallBall: false,
        bigBall: false,
        inspector: false,
        applePolisher: false,
        lunatic: true,
        accelerate: false,
        increaseMass: false,
        thief: true,
        thiefToolkit: true,
        goodie: true
    },
    
    // Labels for powerups
    label: {
        accelerate: "A",
        increaseMass: "M",
        thief: "T",
        goodie: "G",
        thiefToolkit: "S"
    },
    
    // Difficulty settings
    difficulty: function(level) {
        if (level == 0) {
            this.speed.rocket = 0.8;
            this.modifier.slowDown = 0.9;
            this.mass.applePolisher = 40;
            this.mass.rocket = 2;
        } else if (level == 1) {
            this.speed.rocket = 1.0;
            this.modifier.slowDown = 0.9;
            this.mass.applePolisher = 40,
            this.mass.rocket = 4;
        } else if (level == 2) {
            this.speed.rocket = 1.2;
            this.mass.applePolisher = 34;
            this.mass.rocket = 4;
        } else if (level == 3) {
            this.speed.rocket = 2.0;
            this.mass.applePolisher = 24;
            this.mass.rocket = 5;
        } else if (level == 4) {
            this.speed.rocket = 2.0;
            this.modifier.gumm = 15;
            this.mass.applePolisher = 24;
            this.mass.rocket = 7;
        }
        return this;
    },

    mode: function(mode) {
        if (mode == "cooperative") {
            this.gravity.multiplier = 200;
            this.spring.min = 0;
        } else if (mode == "deathmatch") {
            this.gravity.multiplier = 50;
            this.spring.min = 2 * this.spring.size;
        }
    }
};

Game = {
    difficulty: 2,
    level: 0,
    nrockets: 1,
    mode: "cooperative" // TODO: add 'deathmatch' when multiplayer works
};

/*
  We draw all of our graphics at run-time, so there is no sprite
  sheet.  Thus, it would be inconvenient to use Crafty's sprite
  facility, so we create our own singleton images in each component.
*/

function initSprites() {
    function drawBallImage(r, colorStops, label) {
        var canvas = document.createElement("canvas");
        canvas.width = canvas.height = r * 2;
        var ctx = canvas.getContext("2d");
        
        var grad = ctx.createRadialGradient((3/4) * r, (1/2) * r, (1/16) * r,
                                            r, r, r);
        for (i in colorStops) {
            grad.addColorStop.apply(grad, colorStops[i]);
        }
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        if (label) {
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(label, r, r);
        }
        
        return canvas.toDataURL();
    }

    function sprite(type, role) {
        if (!role)
            role = type;
        var radius = Config.radius[type];
        var colors = Config.gradientStops[Config.color[role]];
        if (Config.reverseGradient[role])
            colors.reverse();
        var label = Config.label[role];
        var key = role.substr(0, 1).toUpperCase() + role.substr(1) + "Sprite";
        var map = {};
        map[key] = [ 0, 0 ];
        Crafty.sprite(radius * 2, drawBallImage(radius, colors, label), map);
    }
    
    sprite("rocket");
    sprite("smallBall");
    sprite("smallBall", "accelerate");
    sprite("smallBall", "increaseMass");
    sprite("smallBall", "thief");
    sprite("smallBall", "thiefToolkit");
    sprite("smallBall", "goodie");
    sprite("applePolisher");
    sprite("inspector");
    sprite("lunatic");
    sprite("bigBall");
    sprite("blackHole");
    sprite("magneticHole");
}

Crafty.scene("story", function() {
    // TODO: show the story, based on state (level number)    
});

// TODO: if game not started, display a demo battle in background
// TODO: show some sort of menu
Crafty.scene("menu", function () {
    // Assume the user starts a game
    Config.difficulty(Game.difficulty).mode(Game.mode);
    Crafty.scene("interlude");
});

Crafty.scene("splash", function() {
    // display level (for 2 seconds) 
});

// A meta-scene for level transition
Crafty.scene("interlude", function () {
    Game.level++;
    Crafty.scene("story");
    if (Game.level > Config.level.last) {
        Game.level = 0;
        Crafty.scene("menu");
    } else {
        Crafty.scene("splash");
        Crafty.scene("battle");
    }
});

// If lives exhausted, show splash and then back in the fray
Crafty.scene("reset", function() {
    Crafty.scene("splash");
    Crafty.scene("battle");
});

Crafty.scene("battle", function() {
    // TODO: display a background

    var level = Game.level;
    
    // TODO: add scoreboard
    //var scoreboard = Crafty.e("Scoreboard").text("Level: " + level);

    // Begin the level
    Crafty.e("Level").level(level).bind("completed", function() {
        Crafty.scene("interlude");
    }).bind("failed", function() {
        Crafty.scene("reset");
    });
});

Crafty.c("Level", {
    initialGenerationDelay: 0,
    // We store lives at the Level, because the Rocket represents not
    // the player but the ship; it is recreated each life.
    lives: [],
    level: function(number) {
        this.number = number;
        if (number < 99)
            this.initialGenerationDelay = 100 + 1000 / (number + 1);
        this.bind("EnterFrame", this.iterate);
        this.setup();
        return this;
    },
    setup: function() {
        var nrockets = Game.nrockets;
        var level = this.number;

        // TODO: add border objects
        
        for (i = 0; i < nrockets; i++) {
            this.lives[i] = Config.lives;
            var rocket = Crafty.e("Rocket");
            rocket.delayActivation(Config.activationDelay.initial);
            rocket.bind("killed", function() {
                this.lives[i]--;
                var rocket = Crafty.e("Rocket").attr("score", rocket.score);
                rocket.delayActivation(Config.activationDelay.midlevel);
            });
            if (level > Config.level.spring && Game.mode == "deathmatch") {
                rocket.addComponent("SpringAttacher").attr({
                    randSprings: Config.spring.rand
                });
            }
        }
        
        if (level != 99) {
	    var nobjects = 3 + Math.sqrt(level) *
                ((nrockets + 1) / 2) + 2 * nrockets;
            // NOTE: the number of objects depends on window size? crazy!
	    nobjects = nobjects * (Crafty.viewport.width / 640 *
                                   Crafty.viewport.height / 460 + 2) / 3;
	    if (nobjects > 30)
	        nobjects = 30;
            var nbballs = Math.floor(level / Config.level.immediateBigBall);
            for (i = 0; i < nbballs; i++)
                Crafty.e("BigBall, RandomSpawner");
            for (i = 0; i < nobjects - nbballs - nrockets; i++)
                Crafty.e("SmallBall, RandomSpawner");
            Crafty("Rocket").each(function(rocket) {
                rocket.requires("RandomSpawner");
                if (level < 5)
	            rocket.attr({
                        mass: rocket.mass * (1.0 + (5.0 - level) / 15.0)
                    });
	        if (level < 25)
	            rocket.attr({ mass: rocket.mass * (1.0 + level / 120.0) });
            });
        } else {
            Crafty.e("Apple");
            Crafty("Rocket").each(function(rocket) {
                rocket.attr({
                    x: Crafty.viewport.width / 2 +
                        Math.cos(i * 2 * Math.PI / nrockets) *
                        Crafty.viewport.height / 3,
                    y: Crafty.viewport.height / 2 +
                        Math.sin(i * 2 * Math.PI / nrockets) *
                        Crafty.viewport.height / 3
                });
            });
	    var nobjects = 9;
            for (i = 0; i < this.nobjects; i++) {
                Crafty.e("SmallBall, RandomSpawner");
	    }
        }
    },
    generate: function() {
        var level = this.number;
        if (level == 99) {
            if (Crafty("SmallBall").length < 15)
                if (!Crafty.math.randInt(0, 40))
                    Crafty.e("SmallBall, RandomWarpSpawner");
            if (Crafty("BigBall").length < 3)
                if (!Crafty.math.randInt(0, 3000))
                    Crafty.e("BigBall, RandomWarpSpawner");
            return;
        }
        var nrockets = Game.nrockets;
        
        if (Crafty("SmallBall").length < 4 * level)
            if (!Crafty.math.randInt(0,
                                     (nrockets == 1 ? 200 : 150) + 110 - level))
        {
            var ball = Crafty.e("SmallBall, RandomWarpSpawner");
            if (level > Config.level.spring)
                ball.addComponent("SpringAttacher").attr({
                    randSprings: Config.spring.rand - level / 3
                });
        }
	if (Crafty("Lunatic").length <
            Math.min(level - Config.level.lunatic, 3))
	    if (!Crafty.math.randInt(0,
                                     (nrockets == 1 ? 800 : 450) + 110 - level))
		Crafty.e("Lunatic, RandomWarpSpawner");
	if (Crafty("BlackHole").length < 4 * (level - Config.level.blackHole))
	    if (!Crafty.math.randInt(0, (412 + 512 / level)))
		Crafty.e("BlackHole, RandomWarpSpawner");
	if (Crafty("BigBall").length < 4 * (level - Config.level.bigBall))
	    if (!Math.math.randInt(0,
                                   (nrockets == 1 ? 700 : 500) + (110 - level) /
                                   3 + 2024 / level))
		Crafty.e("BigBall, RandomWarpSpawner");
	if (Crafty("Inspector").length <
            Math.floor(level / Config.level.inspector))
	    if (!Math.math.randInt(0, 1500 + 10 * (110 - level)))
		Crafty.e("Inspector, RandomWarpSpawner");
	if (Crafty("MagneticHole").length <
            Math.floor(level / Config.level.magneticHole) + 1)
	    if (!Math.math.randInt(0, (500 + 1000 / level)))
		Crafty.e("MagneticHole, RandomWarpSpawner");
    },
    iterate: function() {
        if (initialGenerationDelay > 0)
            this.initialGenerationDelay--;
        else this.generate();

    /* How are the interactions processed? Is it rocket-centric, as in
     * the original, or do we process objects in phases? First an
     * interaction phase (when two entities are touching) and then the
     * collide phase (when everything bounces). If we take a
     * rocket-centric approach, we need to make sure that each
     * interaction is processed only once. Intuitively, it makes more
     * sense to have each entity perform its action, in turn, so we
     * will take the phased approach, for now.
     */

        Crafty("Interactor").each(function(interactor) {
            interactor.interact();
        });
        
        if (Game.mode == "cooperative")
            Crafty("Rocket").each(function(rocket) rocket.score++);

        Crafty("Interactor Ball").each(function(ball) {
            ball.bounce();
            ball.translate();
        });       
    }
});

Crafty.c("Activatable", {
    activate: function() {
        this.requires("Interactor");
    },
    deactivate: function() {
        this.removeComponent("Interactor");
    }
});

Crafty.c("Interactor", {
    force: new Crafty.math.Vector2D(),
    // normalize: function(x, y, size) {
    //     var length = Math.sqrt(x^2 + y^2);
    //     if (length == 0)
    //         length = 1;
    //     return { x: x * size / length, y: y * size / length };
    // },
    forceVector: function(xp, yp, length) {
        return new Crafty.math.Vector2D(xp, yp).setLength(length);
    },
    applyModerateForce: function(xp, yp, length) {
        var force = this.forceVector(xp, yp, length);
        this.force.add(force.multiply(Config.modifier.slowDown));
    },
    applyForce: function(xp, yp, length) {
        var force = this.forceVector(xp, yp, length);
        this.force.add(force);
    }
});

Crafty.c("Circle", {
    init: function() {
        this.requires("Interactor, Collision");
        this.circle(this.radius);
    },
    circle: function(radius) {
        this.w = this.h = this.radius * 2;
        this.collision(Crafty.circle(0, 0, this.radius));
    }
});

/* How to spawn entities?  We should use separate components that are
   added at spawn time, i.e., not required by the entity
   component. The logic is that spawning depends on the game plan and
   is not inherent in the entity.
*/

Crafty.c("Spawner", {
    activationDelay: 0,
    spawned: false,
    init: function() {
        this.requires("2D");
    },
    delayActivation: function(delay) {
        this.requires("Activatable");
        this.activationDelay = delay;
        this.deactivate();
        if (this.spawned)
            this.activateLater();
        return this;
    },
    spawn: function() {
        this.spawned = true;
        if (this.has("Activatable"))
            this.activateLater();
    },
    activateLater: function() {
        Crafty.delay(this.activate, this.activationDelay);
    }
});

Crafty.c("RandomSpawner", {
    init: function() {
        this.requires("Spawner");
        do {
            this.x = Crafty.math.randInt(30, Crafty.viewport.width - 30);
            this.y = Crafty.math.randInt(30, Crafty.viewport.height - 30);
        } while(this.hit("2D"));
        this.spawn();
    }
});

Crafty.c("WarpEffect", {
    init: function() {
        this.requires("particles");
    }
});

Crafty.c("WarpSpawner", {
    init: function() {
        this.requires("Spawner");
        // TODO: display a warp effect
        //Crafty.e("WarpEffect").attr({x = this.x, y = this.y });
        this.spawn(); // when warp effect is finished
    }
});

Crafty.c("RandomWarpSpawner", {
    init: function() {
        this.requires("RandomSpawner,WarpSpawner");
    }
});

Crafty.c("Ball", {
    init: function() {
        this.requires("Spawner, Circle, Canvas");
        this.type = this.__c.keys()[0];
        this.mass = Config.mass[this.type];
        this.circle(Config.radius[this.type]);
    },
    bounce: function() {
        this.hit("Ball").each(this.bounceOff);
    },
    bounceOff: function(other) {
        var gummfactor = this.mass / other.mass;
        if (other.has("Lunatic"))
	    gummfactor = -Config.mass.rocket / Config.mass.lunatic;
	else if (this.has("Lunatic"))
	    gummfactor = -Config.mass.lunatic / Config.mass.rocket;
        var xp = other.x - this.x;
	var yp = other.y - this.y;
	this.applyForce(xp, yp, 1 / gummfactor * Config.modifier.gumm);
    },
    translate: function() {
        var translation =
            this.force.multiply((Crafty.viewport.width / 640 + 1) / 2);
        this.shift(translation.x, translation.y);
    }
});

Crafty.c("Rocket", {
    score: 0,
    init: function() {
        this.requires("Ball, Thief, Multiway, RocketSprite");
        this.multiway(Config.rocketSpeed,
                      { UP_ARROW: -90,
                        DOWN_ARROW: 90,
                        RIGHT_ARROW: 0,
                        LEFT_ARROW: 180
                      });
        var superBounceOff = this.bounceOff;
        this.bounceOff = function(other) {
            superBounceOff();
            if (other.has("Inspector"))
                this.force.multiply(-2);
        };
    }
});

Crafty.c("Koule" {
    init: function() {
        this.requires("Ball");
    }
});

Crafty.c("ApplePolisher", {
    init: function() {
        this.requires("Koule, ApplePolisherSprite");
        this.x = Crafty.viewport.width / 2;
        this.y = Crafty.viewport.height / 2;
    }
});

Crafty.c("Inspector", {
    init: function() {
        this.requires("Koule, InspectorSprite");
        var superBounceOff = this.bounceOff;
        this.bounceOff = function(other) {
            if (!other.has("Rocket"))
                superBounceOff(other);
        }
    }
});

Crafty.c("Chaser", {
    init: function() {
        this.requires("Koule");
    },
    interact: function() {
        var circle =
            Crafty.circle(this.x, this.y, Config.chase.maxDistance);
        var rocketToChase = null;
        for (rocket in Crafty("Interactor Rocket"))
            if (circle.containsPoint(rocket.x, rocket.y)) {
                rocketToChase = rocket;
                break;
            }
        var xp, yp;
        if (rocketToChase != null) {
            xp = rocketToChase.x - this.x,
	    yp = rocketToChase.y - this.y;
        } else {
            xp = Crafty.viewport.width / 2 - this.x;
	    yp = Crafty.viewport.height / 2 - this.y;
        }
        this.applyModerateForce(xp, yp, this.speed);
    }
});

Crafty.c("Lunatic", {
    init: function() {
        this.requires("Chaser, LunaticSprite");
        var chase = this.act;
        this.interact = function() {
            if (Math.random() < 0.25) {
                this.applyModerateForce(Math.random(), Math.random(),
                                        this.speed);
            } else chase();
        };
    }
});

Crafty.c("SmallBall", {
    init: function() {
        this.requires("Chaser, PowerupDeliverer, SmallBallSprite");
    }
});

Crafty.c("BigBall", {
    init: function() {
        this.requires("Chaser, BigBallSprite");
    }
});

Crafty.c("Hole", {
    radius: Config.radius.hole,
    init: function() {
        this.requires("Circle, Canvas");
    },
    interact: function() {
        var hits = this.hits();
        hits.each(function(other) {
            if (!other.has("ApplePolisher"))
                other.kill();
        });
        return hits.length > 0;
    }
});

Crafty.c("BlackHole", {
    init: function() {
        this.requires("Hole, BlackHoleSprite");
    }
});

Crafty.c("MagneticHole", {
    init: function() {
        this.requires("Hole, MagneticHoleSprite");
        var superInteract = this.iteract;
        this.interact = function() {
            if (superInteract())
                this.kill();
            Crafty("Interactor Rocket").each(this.attract);
        },
        attract: function(other) {
            var xp = this.x - other.x;
	    var yp = this.y - other.y;
	    var distance = Math.sqrt(xp * xp + yp * yp);
	    var gravity = Config.speed.ball *
                this.gravity.multiplier / distance;
	    if (gravity > Config.speed.ball * 4 / 5)
		gravity = Config.speed.ball * 4 / 5;
	    this.applyModerateForce(xp, yp, gravity);
        }
    }
});

// Crafty.extend({
//     requires2: function(list) {
//         var compId = this.__c[this.__c.length - 1];
//         for(comp in list.split(rlist)) {
//             this.bind("RemoveComponent", function(id) {
//                 if (id == comp)
//                     this.removeComponent(compId);
//             });
// 	}
//     }
// });

Crafty.c("Thief", {
    hasToolkit: false,
    init: function() {
        var superInteract = this.interact;
        this.interact = function() {
            if (superInteract)
                superInteract();
            if (this.hasToolkit) {
                var hits = this.hits();
                hits.each(function(target) {
                    if (target.has("Rocket") || target.has("BigBall")) {
                        this.steal(target);
                    }
                });
            }
        };
    },
    steal: function(target) {
        if (!this.hasToolkit)
            return;
        if (target.has("Thief") && target.hasToolkit) { // exchange mass
            var tmpMass = this.mass;
	    this.mass = target.mass;
	    target.mass = tmpMass;
            target.consumeToolkit();
        } else { // drain mass and/or speed, and capture it
            if (target.has("BigBall")) {
                this.mass = target.mass - Config.mass.smallBall;
            } else if (target.has("Rocket")) {
                this.mass = target.mass - Config.mass.rocket;
                this.speed = target.speed - Config.speed.rocket;
            }
            Crafty.e("Drain").conferPowerup(target);
        }
        this.consumeToolkit();
    },
    gainToolkit: function() {
        this.hasToolkit = true;
        this.addComponent("Thief" + this.type + "Sprite");
    },
    consumeToolkit: function() {
        this.hasToolkit = false;
        this.addComponent(this.type + "Sprite");
    }
});

/* Powerups carried by small balls and conferred upon the rocket */

Crafty.c("PowerupDeliverer", {
    _powerup: null,
    init: function() {
        var superInteract = this.interact;
        this.interact = function() {
            if (superInteract)
                superInteract();
            if (this._powerup) {
                var hits = this.hits("Rocket");
                if (hits.length)
                    _powerup.confer(hits[0]);
            }
        };
        var superKill = this.kill;
        this.kill = function() {
            var resurrection = this._powerup.resurrect();
            if (resurrection)
                this.powerup(resurrection);
            else if (!this._powerup) {
                
            }
        };
    },
    powerup: function(powerupName) {
        this._powerup = Crafty.e(powerupName);
        this._powerup.bind("Remove", function() {
            this._powerup = null;
            this.addComponent(this.type + "Sprite");
        });
        this.addComponent(powerupName + this.type + "Sprite");
        return this;
    }
});

Crafty.c("Powerup", {
    confer: function(target) {
        this.affect(target);
        this.kill();
    },
    resurrect: function() {
        return null;
    }
});

Crafty.c("Drain", {
    init: function() {
        this.requires("Powerup");
        this.resurrect = function() {
            return "Goodie";
        };
    },
    affect: function(target) {
        target.mass = Config.mass.rocket;
        target.speed = Config.speed.rocket - Config.powerup.accelerate;
        target.score += Config.score.drain;
    }
});

Crafty.c("Accelerate", {
    init: function() {
        this.requires("Powerup");
    },
    affect: function(target) {
        target.speed += Config.powerup.accelerate;
        target.score += Config.score.accelerate;
    }
});

Crafty.c("IncreaseMass", {
    init: function() {
        this.requires("Powerup");
    },
    affect: function(target) {
        target.mass += Config.powerup.increaseMass;
        target.score += Config.score.increaseMass;
    }
});

Crafty.c("ThiefToolkit", {
    init: function() {
        this.requires("Powerup");
    },
    affect: function(target) {
        target.gainToolkit();
        target.score += Config.score.thiefToolkit;
    }
});

Crafty.c("Goodie", {
    init: function() {
        this.requires("Powerup");
    },
    affect: function(target) {
        target.speed += Config.powerup.accelerate *
            Crafty.math.randInt(0, Config.powerup.goodieAccelerateFactor);
        target.mass += Config.powerup.increaseMass *
            Crafty.math.randInt(0, Config.powerup.goodieIncreaseMassFactor);
        target.score += Config.score.goodie;
    }
});

/* Spring, (spit, tractor beam?) */

Crafty.c("Spring", {
    init: function() {
        this.requires("Interactor, 2D, Canvas");
    },
    spring: function(from, to) {
        this.from = from;
        this.to = to;
        this.bind("Draw", function(e) {
            if(e.type === "canvas") {
                e.ctx.moveTo(from.x, from.y);
                e.ctx.lineTo(to.x, to.y);
                e.ctx.strokeStyle = Config.color.spring;
                e.ctx.stroke();
            }
        });
        from.bind("Remove", this.destroy);
        to.bind("Remove", this.destroy);
    },
    interact: function() {
        var from = this.from; var to = this.to;
        var xp = from.x - to.x;
	var yp = from.y - to.y;
	var force = Math.sqrt(xp * xp + yp * yp);
	if (force >= Config.spring.min)
	{
	    force = force - Config.spring.size;
	    if (force < 0)
		force *= 3;
	    force = force / Config.spring.strength;
	    from.applyModerateForce(xp, yp, force * from.speed / from.mass);
	    to.applyModerateForce(norm.x, norm.y, force * from.speed / to.mass);
	}
    }
});

Crafty.c("SpringAttacher", {
    init: function() {
        var superInteract = this.interact;
        this.interact = function() {
            if (superInteract)
                superInteract();
            this.hits("Rocket").each(function(rocket) {
                if (!Crafty.math.randInt(0, this.randSprings))
                    Crafty.e("Spring").spring(this, rocket);
            });
        };
    }
});

/* Game Bounds */

Crafty.c("Bounds", {
    init: function() {
        this.requires("Interactor, 2D");
    },
    interact: function() {
        Crafty("Ball").each(this.check);
    },
    check: function(ball) {
        if (!this.contains(ball))
            ball.kill();
    }
});

/* Scoreboard */

Crafty.c("Scoreboard", {
    init: function() {
        this.requires("Text, DOM");
    }
});
