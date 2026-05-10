export const ALLOWED_ACL_COMMANDS: string[] = [
  "+INFO",
  "+CLIENT",
  "+DBSIZE",
  "+PING",
  "+HELLO",
  "+AUTH",
  "+RESTORE",
  "+DUMP",
  "+DEL",
  "+EXISTS",
  "+UNLINK",
  "+TYPE",
  "+FLUSHALL",
  "+TOUCH",
  "+EXPIRE",
  "+PEXPIREAT",
  "+TTL",
  "+PTTL",
  "+EXPIRETIME",
  "+RENAME",
  "+RENAMENX",
  "+SCAN",
  "+DISCARD",
  "+EXEC",
  "+MULTI",
  "+UNWATCH",
  "+WATCH",
  "+ECHO",
  "+SLOWLOG",
  "+WAIT",
  "+WAITAOF",
  "+READONLY",
  "+GRAPH.INFO",
  "+GRAPH.LIST",
  "+GRAPH.QUERY",
  "+GRAPH.RO_QUERY",
  "+GRAPH.EXPLAIN",
  "+GRAPH.PROFILE",
  "+GRAPH.DELETE",
  "+GRAPH.CONSTRAINT",
  "+GRAPH.SLOWLOG",
  "+GRAPH.BULK",
  "+GRAPH.CONFIG",
  "+GRAPH.COPY",
  "+CLUSTER",
  "+COMMAND",
  "+GRAPH.MEMORY",
  "+MEMORY",
  "+BGREWRITEAOF",
  "+MODULE|LIST",
  "+MONITOR",
  "+GRAPH.UDF",
];

export const ALLOWED_ACL = ALLOWED_ACL_COMMANDS.join(" ");

/**
 * Validates that every command is either an exact allowed command
 * or a valid subcommand of one (e.g. +CLIENT|LIST is valid because +CLIENT is allowed).
 * Returns an array of invalid commands, or an empty array if all are valid.
 */
export const validateAclCommands = (commands: string[]): string[] => {
  const allowedUpper = ALLOWED_ACL_COMMANDS.map((c) => c.toUpperCase());
  return commands.filter((cmd) => {
    const upper = cmd.toUpperCase();
    // Exact match
    if (allowedUpper.includes(upper)) return false;
    // Subcommand match: +CMD|SUB is valid if +CMD is allowed
    const pipeIndex = upper.indexOf("|");
    if (pipeIndex > 0) {
      const parent = upper.slice(0, pipeIndex);
      if (allowedUpper.includes(parent)) return false;
    }
    return true;
  });
};

export type ACLPresetKey = "admin" | "write" | "read" | "custom";

export type ACLPreset = {
  key: ACLPresetKey;
  label: string;
  keys: string;
  commands: string[];
};

export const ACL_PRESETS: ACLPreset[] = [
  {
    key: "admin",
    label: "Admin",
    keys: "~*",
    commands: [...ALLOWED_ACL_COMMANDS],
  },
  {
    key: "write",
    label: "Write",
    keys: "~*",
    commands: [
      "+INFO",
      "+CLIENT",
      "+DBSIZE",
      "+PING",
      "+HELLO",
      "+AUTH",
      "+RESTORE",
      "+DUMP",
      "+DEL",
      "+EXISTS",
      "+UNLINK",
      "+TYPE",
      "+TOUCH",
      "+EXPIRE",
      "+PEXPIREAT",
      "+TTL",
      "+PTTL",
      "+EXPIRETIME",
      "+RENAME",
      "+RENAMENX",
      "+SCAN",
      "+DISCARD",
      "+EXEC",
      "+MULTI",
      "+UNWATCH",
      "+WATCH",
      "+ECHO",
      "+READONLY",
      "+GRAPH.INFO",
      "+GRAPH.LIST",
      "+GRAPH.QUERY",
      "+GRAPH.RO_QUERY",
      "+GRAPH.EXPLAIN",
      "+GRAPH.PROFILE",
      "+GRAPH.DELETE",
      "+GRAPH.CONSTRAINT",
      "+GRAPH.SLOWLOG",
      "+GRAPH.BULK",
      "+GRAPH.COPY",
      "+CLUSTER",
      "+COMMAND",
      "+GRAPH.UDF",
    ],
  },
  {
    key: "read",
    label: "Read",
    keys: "~*",
    commands: [
      "+INFO",
      "+CLIENT",
      "+DBSIZE",
      "+PING",
      "+HELLO",
      "+AUTH",
      "+DUMP",
      "+EXISTS",
      "+TYPE",
      "+TTL",
      "+PTTL",
      "+EXPIRETIME",
      "+SCAN",
      "+ECHO",
      "+READONLY",
      "+GRAPH.INFO",
      "+GRAPH.LIST",
      "+GRAPH.RO_QUERY",
      "+GRAPH.EXPLAIN",
      "+CLUSTER",
      "+COMMAND",
    ],
  },
];

const buildAcl = (keys: string, commands: string[]): string => {
  return `${keys} ${commands.join(" ")}`;
};

export const getPresetAcl = (preset: ACLPreset): string => {
  return buildAcl(preset.keys, preset.commands);
};

export const parseAcl = (acl: string): { keys: string; commands: string[] } => {
  const tokens = acl.trim().split(/\s+/);
  const keyTokens: string[] = [];
  const commandTokens: string[] = [];

  for (const token of tokens) {
    // Skip status flags — they aren't key patterns or commands
    if (token === "on" || token === "off") continue;
    if (token.startsWith("~") || token.startsWith("&")) {
      keyTokens.push(token);
    } else {
      commandTokens.push(token);
    }
  }

  return {
    keys: keyTokens.join(" "),
    commands: commandTokens,
  };
};

export const findPresetByAcl = (acl: string): ACLPresetKey => {
  const parsed = parseAcl(acl);
  const inputKeysSet = new Set(parsed.keys.toLowerCase().split(/\s+/).filter(Boolean));
  const inputCommandsSet = new Set(parsed.commands.map((c) => c.toUpperCase()));

  // Try to match from most restrictive (read) to least (admin)
  // so we pick the best match
  const match = ACL_PRESETS.find((preset) => {
    const presetKeysSet = new Set(preset.keys.toLowerCase().split(/\s+/).filter(Boolean));
    const presetCommands = preset.commands.map((c) => c.toUpperCase());

    // Keys must match exactly
    if (inputKeysSet.size !== presetKeysSet.size) return false;
    if (presetKeysSet.size > 0 && Array.from(presetKeysSet).some((k) => !inputKeysSet.has(k))) return false;

    // Commands: input must have exactly the same commands as preset
    if (inputCommandsSet.size !== presetCommands.length) return false;
    if (presetCommands.some((c) => !inputCommandsSet.has(c))) return false;

    return true;
  });

  return match?.key ?? "custom";
};
