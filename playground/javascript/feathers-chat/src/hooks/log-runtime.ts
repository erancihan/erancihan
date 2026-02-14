// For more information about this file see https://dove.feathersjs.com/guides/cli/hook.html
import type { HookContext, NextFunction } from '../declarations'
import { logger } from '../logger'

// To see more detailed messages, uncomment the following line:
// logger.level = "http"; // debug, http

const COLORS = {
  reset: "\x1b[0m",

  // Foreground (Text) Colors for Duration
  textCyan: "\x1b[36m",
  textGreen: "\x1b[32m",
  textYellow: "\x1b[33m",
  textRed: "\x1b[31m",

  // Background Colors for Method
  // We combine Background (\x1b[4xm) + Foreground (\x1b[3xm) for contrast
  bgCyan: "\x1b[46m\x1b[30m", // Cyan BG, Black Text
  bgGreen: "\x1b[42m\x1b[30m", // Green BG, Black Text
  bgYellow: "\x1b[43m\x1b[30m", // Yellow BG, Black Text
  bgRed: "\x1b[41m\x1b[37m", // Red BG, White Text
}

function logPrintTimer(duration: number, ctx: HookContext) {
  // 1. Determine Duration Color (Text only)
  const durColor = duration < 500 ? COLORS.textGreen : COLORS.textYellow;

  // 2. Determine Method Color (Background)
  let methodColor = COLORS.reset;
  switch (ctx.method.toLowerCase()) {
    case "find":
    case "get":
      // methodColor = COLORS.bgCyan;
      methodColor = COLORS.textCyan;
      break;
    case "create":
      // methodColor = COLORS.bgGreen;
      methodColor = COLORS.textGreen;
      break;
    case "update":
    case "patch":
      // methodColor = COLORS.bgYellow;
      methodColor = COLORS.textYellow;
      break;
    case "remove":
    case "delete":
      // methodColor = COLORS.bgRed;
      methodColor = COLORS.textRed;
      break;
  }

  const logstr = "".concat(
    ` ${durColor}${duration.toString().padStart(4)}ms${COLORS.reset} |`,
    ` ${methodColor}${ctx.method.padStart(6)}${COLORS.reset} |`,
    ` ${ctx.path.padEnd(30)} | ${ctx.id ? `/${ctx.id}` : ""}`,
  );

  logger.info(logstr);
}

export const logRuntime = async (context: HookContext, next: NextFunction) => {
  const startTime = Date.now()
  // Run everything else (other hooks and service call)
  await next()

  const duration = Date.now() - startTime
  logPrintTimer(duration, context)
}
