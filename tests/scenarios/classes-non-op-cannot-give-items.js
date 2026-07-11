import { countItemsByName, waitForChat } from "./helpers.js";

export const name = "Classes give denies non-op players";

export async function run(ctx) {
  const { assert, command, spawnBot, wait } = ctx;
  const bot = await spawnBot("ClassNoPermBot", { op: false });

  await command("deop ClassNoPermBot", 250);
  await command("clear ClassNoPermBot", 250);
  await wait(500);

  const denied = await waitForChat(
    bot,
    () => bot.chat("/classes give ClassNoPermBot long_bow"),
    /You do not have permission to give class items\./
  );
  assert(denied, "non-op /classes give should be denied");
  assert(countItemsByName(bot, "bow") === 0, "non-op /classes give should not grant a Long Bow");
}
