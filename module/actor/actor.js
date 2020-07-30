/**
 * Extend the base Actor entity by defining a custom roll data structure which is ideal for the Simple system.
 * @extends {Actor}
 */
export class MongooseTraveller2eActor extends Actor {
  /**
   * Augment the basic actor data with additional dynamic data.
   */
  prepareData() {
    console.log('MongooseTraveller2eActor prepareData')
    super.prepareData();

    const actorData = this.data;
    const data = actorData.data;
    const flags = actorData.flags;

    // Make separate methods for each Actor type (character, npc, etc.) to keep
    // things organized.
    if (actorData.type === 'traveller') this._prepareCharacterData(actorData);
  }


  /**
   * Prepare Character type specific data
   */
  _prepareCharacterData(actorData) {
    const data = actorData.data;

    // Make modifications to data here. For example:

    // Loop through ability scores, and add their modifiers to our sheet output.
    for (let [key, characteristic] of Object.entries(data.characteristics)) {
      // Calculate the modifier using d20 rules.
			if (characteristic.modifier + characteristic.value <= 0) {
        characteristic.dmbonus = -3;
      } else if (characteristic.modifier + characteristic.value > 14) {
        characteristic.dmbonus = 3;
      } else {
        characteristic.dmbonus = Math.floor(((characteristic.modifier + characteristic.value)/3)-2);
      }
    }
  }

}