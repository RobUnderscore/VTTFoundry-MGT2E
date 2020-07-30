/**
 * Extend the basic ActorSheet with some very simple modifications
 * @extends {ActorSheet}
 */
export class MongooseTraveller2eActorSheet extends ActorSheet {
  /** @override */
  static get defaultOptions() {
    return mergeObject(super.defaultOptions, {
      classes: ["mongoosetraveller2e", "sheet", "actor"],
      template: "systems/mongoosetraveller2e/templates/actor/actor-sheet.html",
      width: 600,
      height: 600,
      tabs: [{ navSelector: ".sheet-tabs", contentSelector: ".sheet-body", initial: "description" }],
      hideUntrainedSkills: true
    });
  }

  /* -------------------------------------------- */

  /** @override */
  getData() {
    const data = super.getData();
    data.dtypes = ["String", "Number", "Boolean"];

    // Prepare items.
    if (this.actor.data.type == 'traveller') {
      this._prepareCharacterItems(data);
    }

    return data;
  }

  /**
   * Organize and classify Items for Character sheets.
   *
   * @param {Object} actorData The actor to prepare.
   *
   * @return {undefined}
   */
  _prepareCharacterItems(sheetData) {
    const actorData = sheetData.actor;

    // Initialize containers.
    const gear = [];

    // Iterate through items, allocating to containers
    let totalWeight = 0;
    for (let i of sheetData.items) {
      let item = i.data;
      i.img = i.img || DEFAULT_TOKEN;
      // Append to gear.
      if (i.type === 'equipment' || i.type === 'weapon') {
        gear.push(i);
      }
    }

    // Assign and return
    actorData.gear = gear;
  }

  /* -------------------------------------------- */

  /** @override */
  activateListeners(html) {
    super.activateListeners(html);

    // Everything below here is only needed if the sheet is editable
    if (!this.options.editable) return;

    // Add Inventory Item
    html.find('.item-create').click(this._onItemCreate.bind(this));

    // Update Inventory Item
    html.find('.item-edit').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      const item = this.actor.getOwnedItem(li.data("itemId"));
      item.sheet.render(true);
    });

    // Delete Inventory Item
    html.find('.item-delete').click(ev => {
      const li = $(ev.currentTarget).parents(".item");
      this.actor.deleteOwnedItem(li.data("itemId"));
      li.slideUp(200, () => this.render(false));
    });

    // Rollable abilities.
    html.find('.rollable').click(this._onRoll.bind(this));

    // Upgrade/downgrade skills.
    html.find('.upgrade-skill').click(this._onUpgrade.bind(this));
    html.find('.downgrade-skill').click(this._onDowngrade.bind(this));
    html.find('.upgrade-joat').click(this._onUpgradeJoat.bind(this));
    html.find('.downgrade-joat').click(this._onDowngradeJoat.bind(this));

    html.find('.toggle-skills').click(ev => {
      ev.preventDefault();
      this.options.hideUntrainedSkills = !this.options.hideUntrainedSkills;
      this.actor.sheet.render(true)
    })

    // Drag events for macros.
    if (this.actor.owner) {
      let handler = ev => this._onDragItemStart(ev);
      html.find('li.item').each((i, li) => {
        if (li.classList.contains("inventory-header")) return;
        li.setAttribute("draggable", true);
        li.addEventListener("dragstart", handler, false);
      });
    }
  }

  /**
   * Handle creating a new Owned Item for the actor using initial data defined in the HTML dataset
   * @param {Event} event   The originating click event
   * @private
   */
  _onItemCreate(event) {
    event.preventDefault();
    const header = event.currentTarget;
    // Get the type of item to create.
    const type = header.dataset.type;
    // Grab any data associated with this control.
    const data = duplicate(header.dataset);
    // Initialize a default name.
    const name = `New ${type.capitalize()}`;
    // Prepare the item object.
    const itemData = {
      name: name,
      type: type,
      data: data
    };
    // Remove the type from the dataset since it's in the itemData.type prop.
    delete itemData.data["type"];

    // Finally, create the item!
    return this.actor.createOwnedItem(itemData);
  }

  /**
   * Handle clickable rolls.
   * @param {Event} event   The originating click event
   * @private
   */
  _onRoll(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const dataset = element.dataset;
    const trainable = element.getAttribute('trainable');
    const trained = element.getAttribute('trained');

    if (trainable == 'true' && trained == 'false' && !dataset.roll.includes('jackofalltrades.value')) {
      dataset.roll += "+@jackofalltrades.value";
    }

    if (dataset.roll) {
      let roll = new Roll(dataset.roll, this.actor.data.data);
      let label = dataset.label ? `Rolling ${dataset.label}` : '';
      roll.roll().toMessage({
        speaker: ChatMessage.getSpeaker({ actor: this.actor }),
        flavor: label
      });
    }
  }

  _onUpgradeJoat(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const actorData = this.actor.data;
    const data = actorData.data;

    if (data.jackofalltrades.value < 3) {
      this.actor.update({'data.jackofalltrades.value': data.jackofalltrades.value + 1})
    }
  }

  _onDowngradeJoat(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const actorData = this.actor.data;
    const data = actorData.data;

    if (data.jackofalltrades.value > 0) {
      this.actor.update({'data.jackofalltrades.value': data.jackofalltrades.value - 1})
    }
  }

  /**
   * Handle skill upgrade
   * @param {Event} event   The originating click event
   * @private
   */
  _onUpgrade(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const skillName = element.getAttribute('data-label');
    const actorData = this.actor.data;
    const data = actorData.data;
    const matchingSkill = data.skills[skillName];
    if (matchingSkill && !matchingSkill.trained) {
      this.actor.update({[`data.skills.${skillName}.value`]: 0})
      this.actor.update({[`data.skills.${skillName}.trained`]: true})
    } else if (matchingSkill && matchingSkill.value < matchingSkill.max) {
      this.actor.update({[`data.skills.${skillName}.value`]: data.skills[skillName].value + 1})      
    }
  }

  /**
   * Handle skill downgrade
   * @param {Event} event   The originating click event
   * @private
   */
  _onDowngrade(event) {
    event.preventDefault();
    const element = event.currentTarget;
    const skillName = element.getAttribute('data-label');
    const actorData = this.actor.data;
    const data = actorData.data;
    const matchingSkill = data.skills[skillName];
    if (matchingSkill && matchingSkill.trained && data.skills[skillName].value == 0) {
      this.actor.update({[`data.skills.${skillName}.value`]: -3})
      this.actor.update({[`data.skills.${skillName}.trained`]: false})
    } else if (matchingSkill && matchingSkill.trained) {
      this.actor.update({[`data.skills.${skillName}.value`]: data.skills[skillName].value - 1})      
    }
  }
}
