const nodeJsonDb = require("node-json-db");
const db = new nodeJsonDb(process.env.DB_FILE, true, false);
import { Item } from "../typings/Item";

const StorageService = {
  getShoppingList: function (userId: number): Item[] {
    let shoppingList = [];

    try {
      shoppingList = db.getData("/shoppingList/" + userId);
    } catch (e) {
      console.error(e);
    }

    return shoppingList;
  },

  insertIntoShoppingList: function (userId: number, items: Item[]): Item[] {
    let shoppingList = [];

    try {
      shoppingList = this.getShoppingList(userId);
    } catch (e) {
      console.error(e);
    }

    shoppingList = shoppingList.concat(items);

    try {
      db.push("/shoppingList/" + userId, shoppingList);
    } catch (e) {
      console.error;
    }

    return shoppingList;
  },

  deleteFromShoppingList(userId: number, itemNumbers: string[]): Item[] {
    let shoppingList = this.getShoppingList(userId);

    itemNumbers
      .map(Number)
      .sort()
      .reverse()
      .forEach((i) => {
        if (shoppingList[i - 1]) {
          shoppingList.splice(i - 1, 1);
        }
      });

    try {
      db.push("/shoppingList/" + userId, shoppingList);
    } catch (e) {
      console.error(e);
    }

    return shoppingList;
  },
};

export default StorageService;
