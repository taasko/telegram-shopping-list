import { JsonDB, Config } from "node-json-db";
import { Item } from "../typings/Item";

if (!process.env.DB_FILE) {
  throw new Error("DB_FILE is required.");
}

const db = new JsonDB(new Config(process.env.DB_FILE, true, false, "/"));

const StorageService = {
  getShoppingList: async function (userId: number): Promise<Item[]> {
    let shoppingList: Item[] = [];

    try {
      shoppingList = (await db.getData("/shoppingList/" + userId)) as Item[];
    } catch (e) {
      console.error(e);
    }

    return shoppingList;
  },

  insertIntoShoppingList: async function (userId: number, items: Item[]) {
    let shoppingList: Item[] = [];

    try {
      shoppingList = await this.getShoppingList(userId);
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

  async deleteFromShoppingList(userId: number, itemNumbers: string[]) {
    let shoppingList = await this.getShoppingList(userId);

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
