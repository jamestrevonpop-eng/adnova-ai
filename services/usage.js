const fs = require("fs");
const path = require("path");

const USAGE_FILE = path.join(
  __dirname,
  "..",
  "data",
  "usage.json"
);

const LIMITS = {
  tavily: {
    daily: 10,
    monthly: 200
  }
};

function getPeriod() {
  const now = new Date();

  return {
    day: now.toISOString().slice(0, 10),
    month: now.toISOString().slice(0, 7)
  };
}

function defaultUsage() {
  const period = getPeriod();

  return {
    period,
    tavily: {
      daily: 0,
      monthly: 0
    }
  };
}

function loadUsage() {
  try {
    if (!fs.existsSync(USAGE_FILE)) {
      return defaultUsage();
    }

    const raw = fs.readFileSync(
      USAGE_FILE,
      "utf8"
    );

    const usage = JSON.parse(raw);
    const period = getPeriod();

    if (
      usage.period?.day !== period.day ||
      usage.period?.month !== period.month
    ) {
      return defaultUsage();
    }

    return usage;
  } catch {
    return defaultUsage();
  }
}

function saveUsage(usage) {
  fs.mkdirSync(
    path.dirname(USAGE_FILE),
    {
      recursive: true
    }
  );

  fs.writeFileSync(
    USAGE_FILE,
    JSON.stringify(usage, null, 2),
    "utf8"
  );
}

function canUse(service) {
  if (!LIMITS[service]) {
    throw new Error(
      `Unknown usage service: ${service}`
    );
  }

  const usage = loadUsage();
  const limits = LIMITS[service];

  return (
    usage[service].daily <
      limits.daily &&
    usage[service].monthly <
      limits.monthly
  );
}

function recordUsage(service) {
  if (!LIMITS[service]) {
    throw new Error(
      `Unknown usage service: ${service}`
    );
  }

  const usage = loadUsage();

  usage[service].daily += 1;
  usage[service].monthly += 1;

  saveUsage(usage);

  return usage[service];
}

function getUsage() {
  const usage = loadUsage();

  return {
    tavily: {
      ...usage.tavily,
      limits: LIMITS.tavily
    }
  };
}

module.exports = {
  canUse,
  recordUsage,
  getUsage,
  LIMITS
};
