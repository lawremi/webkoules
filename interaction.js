/***********************************************************************
 *
 * EXPERIMENT: Modular interactions
 *
 ***********************************************************************/

    /* Question: how to implement the thief mode?
       * Component?
       * Explicit boolean flag?
       * Ability?

       Are these really abilities or are they more appropriately
       termed interactions? In other words, an interaction is enabled,
       the sprite changes, etc, and is then performed, on both a
       source and a target. Can we have a component for an interactor?
       It would add the interactWith() method. Would the interactor
       decide on whether an interaction should occur?  Probably. What
       about removing the interactor? We could probably just remove
       the base class Interactor, because we would no longer call
       interactWith() without that tag.

       This all seems like more work though than simply using a
       'interactor' field in the Ball component. The main problem is
       the need for removal. Interactors will require other
       components, and these will all need to be cleaned up.

       In depth comparison:

       - Delegation requires a field, with enable/disable methods,
         whereas with components, we already have has(), addComponent(),
         and removeComponent().
         
       - Delegation requires passing the source, in addition to the
         target, to the interactor, whereas with components, we
         already have 'this'.

       - Having to remove components is a messy business, especially
         when multiple components are in play. We have worked around
         this with the 'RemoveComponent' listener. Might be generally
         useful.

       - Without an explicit enableInteractor method, the interactor
         needs to worry about setting the sprite. Every interactor
         needs to call a method to set this for their type name.

       - Using a component would make it difficult (at least) to have
         multiple interactors. Chaining up would have to be explicit;
         could not simply mix multiple interacting components.

       Let's say we go with storing an array of interactions in a
       field. Is "interaction" too general a term? There are all sorts
       of interactions, like magnetic holes, for example, that do not
       happen on collision. Should interactions be limited to
       collisions? Obviously, if we make them too general, they will
       not be conveniently implemented. We could, for example,
       generalize all the way to "ability".

       Each entity has abilities that are executed at some given phase
       of the game loop.

       These stages are:
       - Non-colliding forces (chasing, springs, magnetic holes)
       - Contact interactions (thief, powerups, spring formation)
       - Colliding/rebounding forces

       The first two might make sense as modules to which an entity
       delegates at the appropriate phase. Non-colliding forces are
       performed by 'Actor's, contact interactions by 'Contactor's and
       colliding forces by 'Rebounder's.

       It may be possible to model non-colliding forces as
       interactions. Chasing is an interaction (attraction), springs
       are obvious interactions, and magnetic holes, as well. Can we
       somehow unify non-colliding and contact interactions? Those
       could be performed simultaneously with contact
       interactions. Both could also be made to depend on
       collisions. Chasing already has a radius (think of it as a
       radar). A magnetic hole has a force field (can simply be
       infinite).  It is a bit more complex though. For example, the
       chaser has to arbitrarily choose one target.

       Is the trigger of an interaction inherent to the interaction?
       For example, does "thief" only work on contact with big balls
       and other rockets? Or is that just how the rocket uses thief?
       Does chaser always chase rockets, or is that just the koules?
       Are the cause and effect orthogonal? Do we need a component
       type for each? Or just separate methods in Interaction that can
       be shared/overridden through inheritance? Favor the former.
    */

Crafty.c("Interactor", {
    interactions: {},
    interact: function() {
        var hits = this.hit("Collision");
        if (hits) {
            for (hit in hits) {
                if (this.interactWith(hits[hit]))
                    break;
            }
        }
    },
    interactWith: function(other) {
        for (i in this.interactions) {
            if (this.interactions[i].perform(this, other))
                this.removeInteraction(i);
        }
    },
    addInteraction: function(interactionName) {
        var interaction = Crafty.e(interactionName);
        this.interactions[interactionName] = interaction;
        var interactionSprite = interactionName + this.type + "Sprite";
        if (this.isComp(interactionSprite)) {
            this.addComponent(interactionSprite);
            this.bind("RemoveInteraction", function(name) {
                if (name == interactionName)
                    this.addComponent(this.type + "Sprite");
            });
        }
        this.trigger("AddInteraction", interactionName);
        return interaction;
    },
    removeInteraction: function(interactionName) {
        delete this.interactions[interactionName];
        this.trigger("RemoveInteraction", interactionName);
        return this;
    },
    hasInteraction: function(interactionName) {
        return interactionName in this.interactions;
    }
});

Interaction.prototype = {
    check: function(source) {
        var partners = this.partners(source);
        partners.each(function(partner) {
            this.apply(source, partner);
        });
        return partners;
    },
    partners: function(source) {
        return [];
    },
    apply: function(source, target) {
    }
};

Crafty.extend({
    hits: function(comp) {
        var hits = this.hit(comp);
        if (hits == false)
            hits = [];
        return hits;
    }
});

Thief.prototype = new Interaction;
Thief.prototype = {
    partners: function(source) {
        return source.hits("Rocket").concat(source.hits("BigBall"));
    },
    apply: function(source, target) {
        if (target.hasInteraction("Thief")) { // exchange mass
            var tmpMass = this.mass;
	    this.mass = target.mass;
	    target.mass = tmpMass;
            target.removeInteraction("Thief");
        } else { // drain mass and/or speed, and capture it
            if (target.has("BigBall")) {
                this.mass = target.mass - Config.mass.smallBall;
            } else if (target.has("Rocket")) {
                this.mass = target.mass - Config.mass.rocket;
                this.speed = target.speed - Config.speed.rocket;
            }
            new Drain().confer(target);
        }
    }
};

Drain.prototype = new Powerup;
Drain.prototype = {
    apply: function(source, target) {
        if (target.has("BigBall")) {
            target.mass = Config.mass.smallBall;
        } else if (target.has("Rocket")) {
            target.mass = Config.mass.rocket;
            target.speed = Config.speed.rocket - Config.powerup.accelerate;
            target.score += Config.score.drain;
        }
    }
};
