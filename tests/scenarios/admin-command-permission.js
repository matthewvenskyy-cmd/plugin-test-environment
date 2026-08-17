import { waitForChat } from "./helpers.js";

export const name = "Admin command requires permission";

export async function run(ctx) {
  const { assert, command, spawnBot } = ctx;
  const nonOp = await spawnBot("AdminCmdNope", { op: false });
  const op = await spawnBot("AdminCmdOp");

  await command("deop AdminCmdNope", 250);
  await command("op AdminCmdOp", 250);

  const leakedStatus = await seesChat(
    nonOp,
    () => nonOp.chat("/adminplugin"),
    /AdminPlugin v.+ is enabled/i,
    1500
  );
  assert(!leakedStatus, "non-op player should not receive AdminPlugin status from /adminplugin");

  const status = await waitForChat(
    op,
    () => op.chat("/adminplugin"),
    /AdminPlugin v.+ is enabled/i
  );
  assert(status, "op player should receive AdminPlugin status from /adminplugin");
}

function seesChat(bot, action, pattern, timeoutMs) {
  return new Promise((resolve) => {
    const timeout = setTimeout(() => {
      cleanup();
      resolve(false);
    }, timeoutMs);
    const onMessage = (message) => {
      if (!pattern.test(message.toString())) return;
      cleanup();
      resolve(true);
    };
    const cleanup = () => {
      clearTimeout(timeout);
      bot.off("message", onMessage);
    };
    bot.on("message", onMessage);
    action();
  });
}
