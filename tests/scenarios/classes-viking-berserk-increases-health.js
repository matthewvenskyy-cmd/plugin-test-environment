import { waitForChat, waitForInventoryItem } from "./helpers.js";

export const name = "Classes Viking berserk increases max health";

export async function run(ctx) {
  const { assert, command, wait, spawnBot } = ctx;
  const viking = await spawnBot("BerserkViking");

  await command("clear BerserkViking", 250);
  await command("effect clear BerserkViking", 250);
  await command("attribute BerserkViking minecraft:max_health base set 20", 250);
  await command("gamemode survival BerserkViking", 250);
  await command("tp BerserkViking 58 80 -4 0 0", 500);
  await command("setblock 58 79 -4 minecraft:stone", 250);
  await command("classes give BerserkViking double_long_axe", 500);
  await command("give BerserkViking minecraft:suspicious_stew", 500);
  await wait(750);

  const axe = await waitForInventoryItem(viking, (item) => item?.name === "iron_axe", "Viking class axe");
  await viking.equip(axe, "hand");
  await wait(1500);

  const status = await waitForChat(viking, () => viking.chat("/classes status"), /Current class: Viking/);
  assert(status, "Viking class axe should set class status before berserk");

  const before = await maxHealth(ctx, "BerserkViking");
  const stew = await waitForInventoryItem(viking, (item) => item?.name === "suspicious_stew", "suspicious stew");
  await viking.equip(stew, "hand");

  await command("gamemode creative BerserkViking", 250);
  await wait(500);
  const rage = await consumeAndWaitForChat(viking, /Berserker Rage!/i);
  assert(rage, "consuming suspicious stew as a Viking should trigger Berserker Rage");

  await wait(750);
  const after = await maxHealth(ctx, "BerserkViking");
  assert(after > before * 1.8, `berserk should substantially increase max health; before=${before}, after=${after}`);

  viking.chat("/classes reset");
  await wait(750);
  await command("clear BerserkViking", 250);
  await command("effect clear BerserkViking", 250);
  await command("attribute BerserkViking minecraft:max_health base set 20", 250);
  await command("setblock 58 79 -4 minecraft:air", 250);
}

async function maxHealth(ctx, playerName) {
  const output = await ctx.command(`attribute ${playerName} minecraft:max_health get`, 500);
  const match = output.match(/(?:has the following attribute value:|is) ([\d.]+)/);
  if (!match) {
    throw new Error(`Could not parse ${playerName} max health from command output: ${output}`);
  }
  return Number(match[1]);
}

function consumeAndWaitForChat(bot, pattern, timeoutMs = 12000) {
  let consumeError;
  return waitForChat(bot, () => {
    bot.consume().catch((error) => {
      consumeError = error;
    });
  }, pattern, timeoutMs).then((message) => {
    if (consumeError) {
      throw consumeError;
    }
    return message;
  });
}
