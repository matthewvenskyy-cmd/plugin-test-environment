import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import { createWriteStream, existsSync, statSync } from "node:fs";
import { finished } from "node:stream/promises";
import path from "node:path";
import fg from "fast-glob";

const root = path.resolve(".");
const workDir = path.join(root, ".work");
const cacheDir = path.join(workDir, "cache");
const serverDir = path.join(workDir, "server");
const reportsDir = path.join(workDir, "reports");
const logFile = path.join(workDir, "server.log");
const configPath = path.join(root, "test-env.config.json");

const command = process.argv[2] ?? "test";
const flags = parseFlags(process.argv.slice(3));

main().catch((error) => {
  console.error(error.stack ?? error.message ?? error);
  process.exitCode = 1;
});

async function main() {
  const config = await readConfig();
  if (command === "selftest") {
    await runSelfTest();
    return;
  }
  if (command === "setup") {
    await setup(config);
    return;
  }
  if (command === "build") {
    await buildProjects(config);
    return;
  }
  if (command === "server") {
    await setup(config);
    if (!flags["no-build"]) await buildProjects(config);
    await prepareServer(config);
    await runServer(config, { interactive: true });
    return;
  }
  if (command === "smoke" || command === "test" || command === "scenarios") {
    await setup(config);
    if (!flags["no-build"]) await buildProjects(config);
    if (command === "scenarios" && flags["fresh-scenarios"]) {
      await runFreshScenarios(config);
      console.log("Scenario tests passed.");
      return;
    }
    await prepareServer(config);
    const server = await runServer(config, { interactive: false });
    try {
      await runConsoleSmoke(config, server);
      if (command === "test" && !flags["no-bots"]) {
        await runBotSmoke(config, server);
      }
      if (command === "test" || command === "scenarios") {
        await runScenarios(config, server);
      }
      await assertCleanLog(config);
      console.log(command === "scenarios" ? "Scenario tests passed." : "Smoke test passed.");
    } finally {
      await stopServer(server);
    }
    return;
  }
  if (command === "clean") {
    await fs.rm(workDir, { recursive: true, force: true });
    console.log(`Removed ${workDir}`);
    return;
  }
  throw new Error(`Unknown command: ${command}`);
}

async function readConfig() {
  return JSON.parse(await fs.readFile(configPath, "utf8"));
}

function parseFlags(args) {
  const parsed = {};
  for (const arg of args) {
    if (arg.startsWith("--")) {
      const [key, value] = arg.slice(2).split("=");
      parsed[key] = value ?? true;
    }
  }
  return parsed;
}

function selectedProjects(config) {
  const selected = flags.plugin ?? flags.project;
  if (!selected) return config.projects;
  const names = String(selected).split(",").map((name) => name.trim().toLowerCase());
  return config.projects.filter((project) => {
    return names.includes(project.name.toLowerCase()) || names.includes(project.plugin.toLowerCase());
  });
}

async function setup(config) {
  await fs.mkdir(cacheDir, { recursive: true });
  await fs.mkdir(serverDir, { recursive: true });
  await downloadPaper(config);
}

async function downloadPaper(config) {
  const jarPath = paperJarPath(config);
  if (existsSync(jarPath)) {
    console.log(`Paper ${config.minecraftVersion} already cached.`);
    return;
  }

  const buildsUrl = `https://fill.papermc.io/v3/projects/${config.paperProject}/versions/${config.minecraftVersion}/builds`;
  const buildsResponse = await paperFetch(config, buildsUrl);
  if (!buildsResponse.ok) {
    throw new Error(`Could not read Paper builds: ${buildsResponse.status} ${buildsResponse.statusText}`);
  }

  const builds = await buildsResponse.json();
  const candidates = builds.filter((build) => {
    return build.downloads?.["server:default"]?.url && build.channel === (config.paperChannel ?? "STABLE");
  });
  const latest = candidates[0] ?? builds.find((build) => build.downloads?.["server:default"]?.url);
  if (!latest) {
    throw new Error(`No downloadable Paper builds found for ${config.minecraftVersion}`);
  }

  const downloadInfo = latest.downloads["server:default"];
  console.log(`Downloading ${downloadInfo.name} (${latest.channel})...`);
  const download = await paperFetch(config, downloadInfo.url);
  if (!download.ok) {
    throw new Error(`Could not download Paper: ${download.status} ${download.statusText}`);
  }
  await streamToFile(download.body, jarPath);
}

function paperFetch(config, url) {
  return fetch(url, {
    headers: {
      "User-Agent": config.userAgent ?? "plugin-testing-environment/1.0.0 (local@example.invalid)"
    }
  });
}

async function streamToFile(webStream, target) {
  await fs.mkdir(path.dirname(target), { recursive: true });
  const file = createWriteStream(target);
  const reader = webStream.getReader();
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      file.write(Buffer.from(value));
    }
  } finally {
    file.end();
  }
  await finished(file);
}

function paperJarPath(config) {
  return path.join(cacheDir, `paper-${config.minecraftVersion}.jar`);
}

async function buildProjects(config) {
  for (const project of selectedProjects(config)) {
    const projectDir = path.resolve(root, project.path);
    console.log(`Building ${project.name}...`);
    if (project.build === "maven") {
      await run(projectDir, commandName("mvn"), ["package"]);
    } else if (project.build === "gradle") {
      const wrapper = process.platform === "win32" ? "gradlew.bat" : "./gradlew";
      const gradleCommand = existsSync(path.join(projectDir, wrapper)) ? wrapper : commandName("gradle");
      await run(projectDir, gradleCommand, ["build"]);
    } else {
      throw new Error(`Unsupported build type for ${project.name}: ${project.build}`);
    }
  }
}

async function prepareServer(config) {
  await resetServerDir();
  await fs.mkdir(path.join(serverDir, "plugins"), { recursive: true });
  await fs.copyFile(paperJarPath(config), path.join(serverDir, "paper.jar"));
  await fs.writeFile(path.join(serverDir, "eula.txt"), "eula=true\n");
  await fs.writeFile(path.join(serverDir, "server.properties"), toProperties(config.serverProperties));
  await fs.writeFile(path.join(serverDir, "ops.json"), "[]\n");

  for (const project of selectedProjects(config)) {
    const projectDir = path.resolve(root, project.path);
    const matches = await fg(project.jar, {
      cwd: projectDir,
      absolute: true,
      onlyFiles: true,
      ignore: ["**/original-*.jar", "**/*-sources.jar", "**/*-javadoc.jar"]
    });
    if (matches.length === 0) {
      throw new Error(`No built jar found for ${project.name} using ${project.jar}`);
    }
    const jar = newestFile(matches);
    await fs.copyFile(jar, path.join(serverDir, "plugins", `${project.name}.jar`));
  }
}

async function resetServerDir() {
  await fs.mkdir(serverDir, { recursive: true });
  const removeNames = [
    "plugins",
    "world",
    "world_nether",
    "world_the_end",
    "logs",
    "crash-reports",
    "config",
    "eula.txt",
    "server.properties",
    "ops.json",
    "banned-ips.json",
    "banned-players.json",
    "whitelist.json",
    "usercache.json"
  ];
  await Promise.all(removeNames.map((name) => {
    return fs.rm(path.join(serverDir, name), { recursive: true, force: true });
  }));
}

function newestFile(files) {
  return files
    .map((file) => ({ file, time: statTime(file) }))
    .sort((a, b) => b.time - a.time)[0].file;
}

function statTime(file) {
  try {
    return statSync(file).mtimeMs;
  } catch {
    return -1;
  }
}

function toProperties(values) {
  return Object.entries(values)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n") + "\n";
}

async function runServer(config, options) {
  await fs.mkdir(workDir, { recursive: true });
  await fs.writeFile(logFile, "");
  const args = [...config.javaArgs, "-jar", "paper.jar", "nogui"];
  const child = spawn("java", args, {
    cwd: serverDir,
    stdio: ["pipe", "pipe", "pipe"]
  });

  const lines = [];
  const append = async (chunk) => {
    const text = chunk.toString();
    lines.push(text);
    await fs.appendFile(logFile, text);
    if (options.interactive) process.stdout.write(text);
  };
  child.stdout.on("data", append);
  child.stderr.on("data", append);
  child.stdin.on("error", () => {
    // The server may already be gone during failure cleanup.
  });

  if (options.interactive) {
    console.log(`Server running in ${serverDir}`);
    await onceExit(child);
    return { child, lines };
  }

  try {
    await waitForOutput(lines, /Done \([\d.]+s\)! For help, type "help"/, config.serverStartupTimeoutMs ?? 120000);
  } catch (error) {
    child.kill("SIGTERM");
    throw error;
  }
  return { child, lines };
}

async function runConsoleSmoke(config, server) {
  send(server, "plugins");
  for (const project of selectedProjects(config)) {
    for (const commandText of project.consoleCommands ?? []) {
      send(server, commandText);
    }
  }
  await delay(2500);
}

async function runBotSmoke(config, server) {
  const projectsWithBotCommands = selectedProjects(config).filter((project) => (project.botCommands ?? []).length > 0);
  if (projectsWithBotCommands.length === 0) return;

  let mineflayer;
  try {
    mineflayer = await import("mineflayer");
  } catch (error) {
    console.warn(`Skipping bot smoke tests because Mineflayer is not installed: ${error.message}`);
    return;
  }

  const bot = mineflayer.createBot({
    host: "127.0.0.1",
    port: Number(config.serverProperties["server-port"] ?? 25565),
    username: "TestBot",
    auth: "offline",
    version: config.minecraftVersion
    ,
    checkTimeoutInterval: config.botTimeoutMs ?? 120000
  });

  await waitForBot(bot, "spawn", 45000);
  send(server, "op TestBot");
  await delay(1000);

  for (const project of projectsWithBotCommands) {
    for (const commandText of project.botCommands) {
      console.log(`Bot: ${commandText}`);
      bot.chat(commandText);
      await delay(1500);
    }
  }

  bot.quit("test complete");
  await delay(1000);
}

async function runScenarios(config, server) {
  const scenarios = selectedScenarios(config);
  if (scenarios.length === 0) return;
  await runScenarioBatch(config, server, scenarios);
}

async function runFreshScenarios(config) {
  const scenarios = selectedScenarios(config);
  if (scenarios.length === 0) return;

  for (const scenarioSpec of scenarios) {
    const progress = scenarioProgress(scenarioSpec, scenarios);
    console.log(`Fresh server scenario ${progress}`);
    await prepareServer(config);
    const server = await runServer(config, { interactive: false });
    try {
      await runConsoleSmoke(config, server);
      await runScenarioBatch(config, server, [scenarioSpec]);
      await assertCleanLog(config);
    } finally {
      await stopServer(server);
    }
  }
}

async function runScenarioBatch(config, server, scenarios) {
  const bot = await createScenarioBot(config, "ScenarioBot");
  const results = [];
  try {
    send(server, "op ScenarioBot");
    await delay(1000);
    for (const scenarioPath of scenarios) {
      const extraBots = [];
      const scenarioSpec = normalizeScenarioSpec(scenarioPath);
      const absolutePath = path.resolve(root, scenarioSpec.path);
      const scenario = await import(`file://${absolutePath.replace(/\\/g, "/")}?t=${Date.now()}`);
      const name = scenario.name ?? path.basename(scenarioSpec.path);
      const progress = scenarioProgress(scenarioPath, scenarios);
      console.log(`Scenario ${progress}: ${name}`);
      const started = Date.now();
      try {
        try {
          await withTimeout(
            scenario.run(createScenarioContext(config, server, bot, name, extraBots)),
            config.scenarioTimeoutMs ?? 60000,
            `Scenario timed out: ${name}`
          );
          if (scenarioSpec.expectedFailure) {
            const error = new Error(`Scenario unexpectedly passed: ${name}. Expected failure: ${scenarioSpec.reason ?? "no reason provided"}`);
            throw error;
          }
          results.push(scenarioResult(scenarioSpec, name, progress, started, "passed"));
          await writeScenarioJUnitReport(results);
          console.log(`Scenario passed: ${name}`);
        } catch (error) {
          if (scenarioSpec.expectedFailure && !error.message.startsWith("Scenario unexpectedly passed:")) {
            results.push(scenarioResult(scenarioSpec, name, progress, started, "expectedFailure", error));
            await writeScenarioJUnitReport(results);
            console.log(`Scenario expected failure: ${name} (${scenarioSpec.reason ?? error.message})`);
          } else {
            await writeScenarioFailureArtifact(server, scenarioSpec, name, progress, error, [bot, ...extraBots]);
            results.push(scenarioResult(scenarioSpec, name, progress, started, "failed", error));
            await writeScenarioJUnitReport(results);
            throw error;
          }
        }
      } finally {
        for (const extraBot of extraBots) {
          extraBot.quit("scenario complete");
        }
        await delay(500);
      }
    }
  } finally {
    bot.quit("scenario tests complete");
    await delay(1000);
  }
}

function scenarioResult(scenarioSpec, name, progress, started, status, error = null) {
  return {
    name,
    progress,
    path: scenarioSpec.path,
    expectedFailure: Boolean(scenarioSpec.expectedFailure),
    reason: scenarioSpec.reason ?? "",
    status,
    timeMs: Date.now() - started,
    error
  };
}

async function writeScenarioJUnitReport(results) {
  await fs.mkdir(reportsDir, { recursive: true });
  const failures = results.filter((result) => result.status === "failed").length;
  const skipped = results.filter((result) => result.status === "expectedFailure").length;
  const testcases = results.map((result) => {
    const attributes = [
      `classname="minecraft.scenarios"`,
      `name="${xmlEscape(result.name)}"`,
      `time="${(result.timeMs / 1000).toFixed(3)}"`
    ].join(" ");
    const properties = [
      `      <property name="path" value="${xmlEscape(result.path)}"/>`,
      `      <property name="progress" value="${xmlEscape(result.progress)}"/>`,
      `      <property name="expectedFailure" value="${result.expectedFailure ? "true" : "false"}"/>`,
      result.reason ? `      <property name="reason" value="${xmlEscape(result.reason)}"/>` : null
    ].filter(Boolean).join("\n");
    if (result.status === "passed") {
      return `    <testcase ${attributes}>\n      <properties>\n${properties}\n      </properties>\n    </testcase>`;
    }
    if (result.status === "expectedFailure") {
      const message = result.reason || result.error?.message || "expected failure";
      return `    <testcase ${attributes}>\n      <properties>\n${properties}\n      </properties>\n      <skipped message="${xmlEscape(message)}">${xmlEscape(result.error?.stack ?? result.error?.message ?? message)}</skipped>\n    </testcase>`;
    }
    const message = result.error?.message ?? "scenario failed";
    return `    <testcase ${attributes}>\n      <properties>\n${properties}\n      </properties>\n      <failure message="${xmlEscape(message)}">${xmlEscape(result.error?.stack ?? message)}</failure>\n    </testcase>`;
  }).join("\n");
  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<testsuite name="minecraft-plugin-scenarios" tests="${results.length}" failures="${failures}" errors="0" skipped="${skipped}">`,
    testcases,
    "</testsuite>",
    ""
  ].join("\n");
  await fs.writeFile(path.join(reportsDir, "scenarios.xml"), xml);
}

function xmlEscape(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function selectedScenarios(config) {
  const scenarios = config.scenarios ?? [];
  const selected = flags.scenario;
  if (!selected) {
    return scenarios.filter((scenario) => !normalizeScenarioSpec(scenario).manual);
  }
  const needles = String(selected).split(",").map((value) => value.trim().toLowerCase());
  return scenarios.filter((scenario) => {
    const scenarioPath = normalizeScenarioSpec(scenario).path;
    const normalized = scenarioPath.toLowerCase();
    const base = path.basename(scenarioPath).toLowerCase();
    return needles.some((needle) => normalized.includes(needle) || base.includes(needle));
  });
}

function normalizeScenarioSpec(scenario) {
  return typeof scenario === "string" ? { path: scenario } : scenario;
}

function scenarioProgress(scenario, scenarios) {
  const index = scenarios.indexOf(scenario) + 1;
  const spec = normalizeScenarioSpec(scenario);
  return `[${index}/${scenarios.length}] ${spec.path}`;
}

async function writeScenarioFailureArtifact(server, scenarioSpec, name, progress, error, bots = []) {
  const failuresDir = path.join(workDir, "failures");
  await fs.mkdir(failuresDir, { recursive: true });
  const filename = `${new Date().toISOString().replace(/[:.]/g, "-")}-${safeArtifactName(scenarioSpec.path)}.txt`;
  const artifactPath = path.join(failuresDir, filename);
  const logTail = server.lines.join("").split(/\r?\n/).slice(-200).join("\n");
  const body = [
    `Scenario: ${name}`,
    `Progress: ${progress}`,
    `Path: ${scenarioSpec.path}`,
    `Expected failure: ${scenarioSpec.expectedFailure ? "yes" : "no"}`,
    scenarioSpec.reason ? `Reason: ${scenarioSpec.reason}` : null,
    "",
    "Error:",
    error.stack ?? error.message ?? String(error),
    "",
    "Bot snapshots:",
    botSnapshots(bots),
    "",
    "Server log tail:",
    logTail
  ].filter((line) => line !== null).join("\n");
  await fs.writeFile(artifactPath, body);
  console.error(`Scenario failure artifact written to ${artifactPath}`);
  return artifactPath;
}

function safeArtifactName(value) {
  return value.replace(/[^a-z0-9._-]+/gi, "-").replace(/^-+|-+$/g, "");
}

function botSnapshots(bots) {
  const snapshots = bots.filter(Boolean).map((bot) => {
    const entity = bot.entity;
    const position = entity?.position ? formatPosition(entity.position) : "unknown";
    const held = formatItem(bot.heldItem);
    const inventory = bot.inventory?.items?.().map(formatItem).join(", ") || "empty";
    return [
      `- ${bot.username ?? "unknown"}`,
      `  connected: ${bot.player ? "yes" : "no"}`,
      `  position: ${position}`,
      `  health: ${bot.health ?? "unknown"}`,
      `  food: ${bot.food ?? "unknown"}`,
      `  gamemode: ${bot.game?.gameMode ?? "unknown"}`,
      `  held: ${held}`,
      `  inventory: ${inventory}`
    ].join("\n");
  });
  return snapshots.length > 0 ? snapshots.join("\n") : "No bot snapshots available.";
}

function formatPosition(position) {
  return [position.x, position.y, position.z]
    .map((value) => Number.isFinite(value) ? value.toFixed(2) : String(value))
    .join(", ");
}

function formatItem(item) {
  if (!item) return "empty";
  const parts = [`${item.name ?? "unknown"} x${item.count ?? 1}`];
  if (Number.isInteger(item.slot)) parts.push(`slot=${item.slot}`);
  const display = item.displayName ?? item.customName;
  if (display) parts.push(`display=${JSON.stringify(display)}`);
  return parts.join(" ");
}

async function runSelfTest() {
  await fs.mkdir(workDir, { recursive: true });
  const expected = "&lt;scenario &amp; &quot;bot&quot;&gt;";
  assertSelf(xmlEscape('<scenario & "bot">') === expected, "xmlEscape should escape XML-sensitive characters");

  const xmlResults = [
    scenarioResult({ path: "tests/scenarios/pass.js" }, "Pass <case>", "[1/2] pass", Date.now() - 250, "passed"),
    scenarioResult(
      { path: "tests/scenarios/expected.js", expectedFailure: true, reason: "known <bug>" },
      "Expected Failure",
      "[2/2] expected",
      Date.now() - 500,
      "expectedFailure",
      new Error("expected stack")
    )
  ];
  await writeScenarioJUnitReport(xmlResults);
  const report = await fs.readFile(path.join(reportsDir, "scenarios.xml"), "utf8");
  assertSelf(report.includes('tests="2"'), "JUnit report should include the testcase count");
  assertSelf(report.includes('skipped="1"'), "JUnit report should include expected failures as skipped");
  assertSelf(report.includes("known &lt;bug&gt;"), "JUnit report should XML-escape expected-failure reasons");

  const artifact = await writeScenarioFailureArtifact(
    { lines: ["[INFO] first\n", "[ERROR] tail\n"] },
    { path: "tests/scenarios/failing-case.js" },
    "Synthetic Failure",
    "[1/1] failing-case",
    new Error("synthetic failure"),
    [fakeBot()]
  );
  const artifactText = await fs.readFile(artifact, "utf8");
  assertSelf(artifactText.includes("Bot snapshots:"), "failure artifact should include bot snapshots");
  assertSelf(artifactText.includes("ScenarioBot"), "failure artifact should include bot usernames");
  assertSelf(artifactText.includes("diamond x2"), "failure artifact should include inventory items");
  assertSelf(artifactText.includes("1.25, 80.00, -3.50"), "failure artifact should include formatted bot positions");
  console.log("Harness selftest passed.");
}

function fakeBot() {
  return {
    username: "ScenarioBot",
    player: {},
    entity: { position: { x: 1.25, y: 80, z: -3.5 } },
    health: 20,
    food: 19,
    game: { gameMode: "survival" },
    heldItem: { name: "netherite_pickaxe", count: 1, slot: 36, displayName: "Corebreaker" },
    inventory: {
      items: () => [
        { name: "diamond", count: 2, slot: 10 },
        { name: "crafter", count: 1, slot: 11, displayName: "Bigger Crafting Table" }
      ]
    }
  };
}

function assertSelf(condition, message) {
  if (!condition) throw new Error(`Harness selftest failed: ${message}`);
}

async function createScenarioBot(config, username) {
  const mineflayer = await import("mineflayer");
  const bot = mineflayer.createBot({
    host: "127.0.0.1",
    port: Number(config.serverProperties["server-port"] ?? 25565),
    username,
    auth: "offline",
    version: config.minecraftVersion
  });
  await waitForBot(bot, "spawn", 45000);
  return bot;
}

function createScenarioContext(config, server, bot, name, extraBots) {
  return {
    bot,
    config,
    server,
    name,
    command: async (commandText, waitMs = 500) => {
      const before = server.lines.join("");
      send(server, commandText);
      await delay(waitMs);
      return server.lines.join("").slice(before.length);
    },
    chat: async (message, waitMs = 500) => {
      bot.chat(message);
      await delay(waitMs);
    },
    spawnBot: async (username, options = {}) => {
      const extraBot = await createScenarioBot(config, username);
      extraBots.push(extraBot);
      if (options.op !== false) {
        send(server, `op ${username}`);
        await delay(500);
      }
      return extraBot;
    },
    wait: delay,
    waitForInventory: async (predicate, timeoutMs = 5000) => {
      const started = Date.now();
      while (Date.now() - started < timeoutMs) {
        if (predicate(bot.inventory.items())) return;
        await delay(100);
      }
      throw new Error(`Timed out waiting for inventory condition in ${name}`);
    },
    assert: (condition, message) => {
      if (!condition) throw new Error(`${name}: ${message}`);
    }
  };
}

async function assertCleanLog(config) {
  const log = await fs.readFile(logFile, "utf8");
  const failures = [
    /Could not load ['"].+\.jar['"]/i,
    /Error occurred while enabling/i,
    /Exception in thread/i,
    /Encountered an unexpected exception/i,
    /FAILED TO BIND TO PORT/i,
    /java\.lang\.OutOfMemoryError/i,
    /NoClassDefFoundError/i,
    /ClassNotFoundException/i,
    /UnsupportedClassVersionError/i
  ];
  for (const pattern of failures) {
    if (pattern.test(log)) {
      throw new Error(`Server log contains a failure matching ${pattern}. See ${logFile}`);
    }
  }

  for (const project of selectedProjects(config)) {
    const enabled = new RegExp(`Enabling ${escapeRegExp(project.plugin)} v`, "i");
    if (!enabled.test(log)) {
      throw new Error(`${project.plugin} did not appear to enable. See ${logFile}`);
    }
  }
}

async function stopServer(server) {
  if (!server.child || server.child.killed) return;
  send(server, "stop");
  await Promise.race([onceExit(server.child), delay(15000)]);
  if (!server.child.killed) server.child.kill("SIGTERM");
}

function send(server, commandText) {
  if (!server.child || server.child.killed || !server.child.stdin.writable) {
    return;
  }
  try {
    server.child.stdin.write(`${commandText}\n`);
  } catch {
    // Cleanup paths may race with Paper shutdown.
  }
}

function waitForOutput(lines, pattern, timeoutMs) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(() => {
      const output = lines.join("");
      if (pattern.test(output)) {
        clearInterval(timer);
        resolve();
      } else if (Date.now() - started > timeoutMs) {
        clearInterval(timer);
        reject(new Error(`Timed out waiting for server startup. See ${logFile}`));
      }
    }, 250);
  });
}

function waitForBot(bot, eventName, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error(`Timed out waiting for bot ${eventName}`));
    }, timeoutMs);
    const onEvent = () => {
      cleanup();
      resolve();
    };
    const onError = (error) => {
      cleanup();
      reject(error);
    };
    const cleanup = () => {
      clearTimeout(timeout);
      bot.off(eventName, onEvent);
      bot.off("error", onError);
      bot.off("kicked", onError);
    };
    bot.once(eventName, onEvent);
    bot.once("error", onError);
    bot.once("kicked", onError);
  });
}

function onceExit(child) {
  return new Promise((resolve) => child.once("exit", resolve));
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function withTimeout(promise, timeoutMs, message) {
  let timeout;
  const timeoutPromise = new Promise((_, reject) => {
    timeout = setTimeout(() => reject(new Error(message)), timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeout));
}

function commandName(base) {
  return process.platform === "win32" ? `${base}.cmd` : base;
}

function run(cwd, executable, args) {
  return new Promise((resolve, reject) => {
    const needsCmd = process.platform === "win32" && /\.(bat|cmd)$/i.test(executable);
    const commandArgs = needsCmd ? ["/d", "/s", "/c", executable, ...args] : args;
    const commandExecutable = needsCmd ? "cmd.exe" : executable;
    const child = spawn(commandExecutable, commandArgs, {
      cwd,
      stdio: "inherit",
      shell: false
    });
    child.once("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${executable} ${args.join(" ")} failed in ${cwd} with exit code ${code}`));
    });
  });
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
