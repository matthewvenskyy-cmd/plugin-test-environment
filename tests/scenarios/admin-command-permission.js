import { waitForChat, waitForNoChat } from "./helpers.js";

export const name = "Admin command requires permission";

export async function run(ctx) {
  const { assert, command, spawnBot } = ctx;
  const nonOp = await spawnBot("AdminCmdNope", { op: false });
  const op = await spawnBot("AdminCmdOp");

  await command("deop AdminCmdNope", 250);
  await command("op AdminCmdOp", 250);

  const noLeakedStatus = await waitForNoChat(
    nonOp,
    () => nonOp.chat("/adminplugin"),
    /AdminPlugin v.+ is enabled/i,
    1500
  );
  assert(noLeakedStatus, "non-op player should not receive AdminPlugin status from /adminplugin");

  const status = await waitForChat(
    op,
    () => op.chat("/adminplugin"),
    /AdminPlugin v.+ is enabled/i
  );
  assert(status, "op player should receive AdminPlugin status from /adminplugin");
}
