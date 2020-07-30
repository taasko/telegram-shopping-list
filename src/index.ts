require("dotenv").config();

const Telegraf = require("telegraf");
const Stage = require("telegraf/stage");
const Scene = require("telegraf/scenes/base");
const session = require("telegraf/session");

const bot = new Telegraf(process.env.BOT_TOKEN);
const { leave } = Stage;

import StorageService from "./service/storage";
import { Item } from "./typings/Item";

// Main keyboard.
const commandKeyboard = Telegraf.Markup.keyboard([
  Telegraf.Markup.callbackButton("📋 List"),
  Telegraf.Markup.callbackButton("➕ Add"),
  Telegraf.Markup.callbackButton("🗑️ Remove"),
])
  .resize()
  .extra();

// Adder scene.
const adder = new Scene("adder");

const adderKeyboard = Telegraf.Markup.keyboard([
  Telegraf.Markup.callbackButton("⬅️ End"),
])
  .resize()
  .extra();

adder.enter(({ reply }) =>
  reply("Please tell me what item you want to add?", adderKeyboard)
);

adder.leave(({ reply }) => {
  reply("Adding ended.");
  return reply("Choose action:", commandKeyboard);
});

adder.hears("⬅️ End", leave());

adder.on("message", ({ reply, message }) => {
  addItemsToShoppingList(message.from.id, [message.text]);
  return reply(`Item added. To end adding, tap "End" button.`);
});

// Stage.
const stage = new Stage();

stage.register(adder);

// Middleware.
bot.use(({ from, reply }, next) => {
  if (process.env.AUTHORIZED_USERS.indexOf(from.id) > -1) {
    next();
  } else {
    return reply("Not authorized");
  }
});

bot.use(session());

bot.use(stage.middleware());

// When end user starts bot.
bot.start(({ reply }) => reply("Choose action:", commandKeyboard));

// Main listeners.
bot.hears("📋 List", ({ reply, message }) =>
  reply(getCurrentShoplist(message.from.id))
);

bot.hears("➕ Add", ({ scene }) => scene.enter("adder"));

bot.hears("🗑️ Remove", ({ reply, message }) => {
  const keyboard = buildRemoveList(message.from.id);
  return reply(
    "Choose item to remove:",
    Telegraf.Markup.keyboard(keyboard).resize().extra()
  );
});

bot.hears("⬅️ Back", ({ reply }) => reply("Choose action:", commandKeyboard));

// Remove command.
bot.command("r", (ctx) => {
  let shoppingList = StorageService.getShoppingList(ctx.message.from.id);

  const itemNumbers = getParams(ctx);

  if (itemNumbers.length < 1 || shoppingList.length < 1) {
    return ctx.reply("No items selected or shoplist is empty already.");
  }
  StorageService.deleteFromShoppingList(ctx.message.from.id, itemNumbers);

  ctx.reply(`Item${itemNumbers.length > 1 ? "s" : ""} removed`);
  ctx.reply(getCurrentShoplist(ctx.message.from.id));

  if (shoppingList.length > 0) {
    const keyboard = buildRemoveList(ctx.message.from.id);

    return ctx.reply(
      "Choose item to remove:",
      Telegraf.Markup.keyboard(keyboard).resize().extra()
    );
  }
  return ctx.reply("Choose action:", commandKeyboard);
});

// Start bot itself.
bot.startPolling();

// Functions.
function getParams(ctx): string[] {
  if (ctx.message.text.indexOf(" ") !== -1) {
    return ctx.message.text
      .substring(ctx.message.text.indexOf(" "))
      .trim()
      .split(" ");
  }
  return [];
}

function getCurrentShoplist(userId: number): string {
  let shoppingList = StorageService.getShoppingList(userId);

  if (!shoppingList || shoppingList.length < 1) {
    return "Shoplist is empty.";
  }

  return getShoppingListString(shoppingList);
}

function getShoppingListString(shoppingList: Item[]): string {
  let listString = "Shoplist: \n";
  let itemNumber = 1;
  for (const item of shoppingList) {
    listString += itemNumber++ + ". " + item.name + "\n";
  }

  return listString;
}

function buildRemoveList(userId: number) {
  let shoppingList = StorageService.getShoppingList(userId);
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
