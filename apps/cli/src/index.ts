import { Command } from "commander";
import { makeAppendCommand } from "./commands/append.js";
import { makeCreateCommand } from "./commands/create.js";
import { makeExportCommand } from "./commands/export.js";
import { makeFeedCommand } from "./commands/feed.js";
import { makeForkCommand } from "./commands/fork.js";
import { makeInitCommand } from "./commands/init.js";
import { makeInspectCommand } from "./commands/inspect.js";
import { makeKeygenCommand } from "./commands/keygen.js";
import { makeMigrateCommand } from "./commands/migrate.js";
import { makeTemplateCommand } from "./commands/template.js";
import { makeVerifyCommand } from "./commands/verify.js";

const program = new Command();

program
  .name("glorychain")
  .description("Create, verify, and manage Glory Chain audit chains")
  .version("0.0.1");

program.addCommand(makeCreateCommand());
program.addCommand(makeAppendCommand());
program.addCommand(makeVerifyCommand());
program.addCommand(makeForkCommand());
program.addCommand(makeMigrateCommand());
program.addCommand(makeFeedCommand());
program.addCommand(makeKeygenCommand());
program.addCommand(makeInspectCommand());
program.addCommand(makeExportCommand());
program.addCommand(makeInitCommand());
program.addCommand(makeTemplateCommand());

program.parse();
