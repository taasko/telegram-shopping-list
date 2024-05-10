import "dotenv/config";
import { Telegraf, Scenes, Markup, session } from "telegraf";
import StorageService from "./service/storage";
import { Item } from "./typings/Item";

if (!process.env.BOT_TOKEN) {
  throw new Error("BOT_TOKEN is required.");
}

const bot = new Telegraf<Scenes.SceneContext>(process.env.BOT_TOKEN);

// Main keyboard.
const commandKeyboard = Markup.keyboard([
  Markup.button.callback("📋 List", "list"),
  Markup.button.callback("➕ Add", "add"),
  Markup.button.callback("🗑️ Remove", "remove"),
]);

// Adder scene.
const adder = new Scenes.BaseScene<Scenes.SceneContext>("adder");

adder.enter((ctx) => {
  return ctx.reply("Please tell me what item you want to add?", adderKeyboard);
});

adder.leave((ctx) => {
  ctx.reply("Adding ended.");

  return ctx.reply("Choose action:", commandKeyboard);
});

adder.hears("⬅️ End", (ctx) => {
  ctx.scene.leave();

  if (ctx.scene.current) {
    ctx.scene.current.leave();
  }
});

adder.on("message", async (ctx) => {
  if (!("text" in ctx.message)) {
    return ctx.reply("Please provide a valid item name.");
  }

  addItemsToShoppingList(ctx.message.from.id, [ctx.message.text]);

  return ctx.reply(`Item added. To end adding, tap "End" button.`);
});

const adderKeyboard = Markup.keyboard([
  Markup.button.callback("⬅️ End", "end"),
]);

const stage = new Scenes.Stage<Scenes.SceneContext>([adder], {
  ttl: 10,
});

// Middleware.
bot.use((ctx, next) => {
  if (
    ctx.from &&
    ctx.from.id &&
    process.env.AUTHORIZED_USERS &&
    process.env.AUTHORIZED_USERS.includes(ctx.from.id.toString())
  ) {
    next();
  } else {
    return ctx.reply("Not authorized");
  }
});

bot.use(session());
bot.use(stage.middleware());

// When end user starts bot.
bot.start((ctx) => {
  return ctx.reply("Choose action:", commandKeyboard);
});

// Main listeners.
bot.hears("📋 List", async (ctx) => {
  ctx.reply(await getCurrentShoplist(ctx.message.from.id));
});

bot.hears("➕ Add", (ctx) => {
  ctx.scene.enter("adder");
});

bot.hears("🗑️ Remove", async (ctx) => {
  const keyboard = await buildRemoveList(ctx.message.from.id);

  return ctx.reply("Choose item to remove:", Markup.keyboard(keyboard));
});

bot.hears(["⬅️ Back", "⬅️ End"], (ctx) => {
  ctx.reply("Choose action:", commandKeyboard);
});

// Remove command.
bot.command("r", async (ctx) => {
  let shoppingList = await StorageService.getShoppingList(ctx.message.from.id);

  const itemNumbers = getParams(ctx);

  if (itemNumbers.length < 1 || shoppingList.length < 1) {
    return ctx.reply("No items selected or shoplist is empty already.");
  }
  StorageService.deleteFromShoppingList(ctx.message.from.id, itemNumbers);

  ctx.reply(`Item${itemNumbers.length > 1 ? "s" : ""} removed`);
  ctx.reply(await getCurrentShoplist(ctx.message.from.id));

  if (shoppingList.length > 0) {
    const keyboard = await buildRemoveList(ctx.message.from.id);

    return ctx.reply("Choose item to remove:", Markup.keyboard(keyboard));
  }

  return ctx.reply("Choose action:", commandKeyboard);
});

// Functions.
function getParams(ctx: any): string[] {
  if (ctx.message.text.indexOf(" ") !== -1) {
    return ctx.message.text
      .substring(ctx.message.text.indexOf(" "))
      .trim()
      .split(" ");
  }

  return [];
}

async function getCurrentShoplist(userId: number) {
  let shoppingList = await StorageService.getShoppingList(userId);

  if (!shoppingList || shoppingList.length < 1) {
    return "Shoplist is empty.";
  }

  return getShoppingListString(shoppingList);
}

function getShoppingListString(shoppingList: Item[]) {
  let listString = "Shoplist: \n";
  let itemNumber = 1;
  for (const item of shoppingList) {
    listString += itemNumber++ + ". " + item.name + "\n";
  }

  return listString;
}

async function buildRemoveList(userId: number) {
  let shoppingList = await StorageService.getShoppingList(userId);
  const keyboard = [];

  shoppingList.forEach((item, i) => {
    keyboard.push("/r " + (i + 1));
  });

  keyboard.push("⬅️ Back");

  return keyboard;
}

function addItemsToShoppingList(userId: number, itemNames: string[]): void {
  const itemsToAdd: Item[] = [];

  itemNames.forEach((name) => {
    itemsToAdd.push({ name });
  });

  StorageService.insertIntoShoppingList(userId, itemsToAdd);
}

bot.launch();

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
