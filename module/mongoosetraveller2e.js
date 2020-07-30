// Import Modules
import { MongooseTraveller2eActor } from "./actor/actor.js";
import { MongooseTraveller2eActorSheet } from "./actor/actor-sheet.js";
import { MongooseTraveller2eItem } from "./item/item.js";
import { MongooseTraveller2eItemSheet } from "./item/item-sheet.js";

Hooks.once('init', async function() {

  game.mongoosetraveller2e = {
    MongooseTraveller2eActor,
    MongooseTraveller2eItem,
    rollItemMacro
  };

  /**
   * Set an initiative formula for the system
   * @type {String}
   */
  CONFIG.Combat.initiative = {
    formula: "2d6", // todo - pick higher of int or dex
    decimals: 2
  };

  // Define custom Entity classes
  CONFIG.Actor.entityClass = MongooseTraveller2eActor;
  CONFIG.Item.entityClass = MongooseTraveller2eItem;

  // Register sheet application classes
  Actors.unregisterSheet("core", ActorSheet);
  Actors.registerSheet("mongoosetraveller2e", MongooseTraveller2eActorSheet, { makeDefault: true });
  Items.unregisterSheet("core", ItemSheet);
  Items.registerSheet("mongoosetraveller2e", MongooseTraveller2eItemSheet, { makeDefault: true });

  // If you need to add Handlebars helpers, here are a few useful examples:
  Handlebars.registerHelper('concat', function() {
    var outStr = '';
    for (var arg in arguments) {
      if (typeof arguments[arg] != 'object') {
        outStr += arguments[arg];
      }
    }
    return outStr;
  });

  Handlebars.registerHelper('toLowerCase', function(str) {
    return str.toLowerCase();
  });

  Handlebars.registerHelper('checkPsi', function(characteristic) {
    if (!game.user.isGM && characteristic.shortlabel === 'PSI' && characteristic.value === 0) {
      return false;
    }
    return true;
  });

  Handlebars.registerHelper('checkTrainedSkill', function(skill) {
    return skill.trained
  });

  Handlebars.registerHelper('shouldShowSkill', function(skill, hideUntrainedSkills) {
    console.log('shouldShowSkill', skill, hideUntrainedSkills)
    return skill.trained || hideUntrainedSkills
  });

  Handlebars.registerHelper('getSkillValueWithJoat', function(skill, joat) {
    if (skill.trained) return skill.value
    return skill.value + joat.value
  });

});

Hooks.once("ready", async function() {
  // Wait to register hotbar drop hook on ready so that modules could register earlier if they want to
  Hooks.on("hotbarDrop", (bar, data, slot) => createMongooseTraveller2eMacro(data, slot));
});

/* -------------------------------------------- */
/*  Hotbar Macros                               */
/* -------------------------------------------- */

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {Object} data     The dropped data
 * @param {number} slot     The hotbar slot to use
 * @returns {Promise}
 */
async function createMongooseTraveller2eMacro(data, slot) {
  if (data.type !== "Item") return;
  if (!("data" in data)) return ui.notifications.warn("You can only create macro buttons for owned Items");
  const item = data.data;

  // Create the macro command
  const command = `game.mongoosetraveller2e.rollItemMacro("${item.name}");`;
  let macro = game.macros.entities.find(m => (m.name === item.name) && (m.command === command));
  if (!macro) {
    macro = await Macro.create({
      name: item.name,
      type: "script",
      img: item.img,
      command: command,
      flags: { "mongoosetraveller2e.itemMacro": true }
    });
  }
  game.user.assignHotbarMacro(macro, slot);
  return false;
}

/**
 * Create a Macro from an Item drop.
 * Get an existing item macro if one exists, otherwise create a new one.
 * @param {string} itemName
 * @return {Promise}
 */
function rollItemMacro(itemName) {
  const speaker = ChatMessage.getSpeaker();
  let actor;
  if (speaker.token) actor = game.actors.tokens[speaker.token];
  if (!actor) actor = game.actors.get(speaker.actor);
  const item = actor ? actor.items.find(i => i.name === itemName) : null;
  if (!item) return ui.notifications.warn(`Your controlled Actor does not have an item named ${itemName}`);

  // Trigger the item roll
  return item.roll();
}