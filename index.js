const axios = require("axios");
const fs = require("fs");
const path = require("path");

// State
let state = {
  direction: "up",
  effect: "power",
  preset: "sunset",
};

// Key code mappings (standard USB keyboard codes)
const KEY_CODES = {
  30: "a", // KEY_A
  48: "b", // KEY_B
  46: "c", // KEY_C
  32: "d", // KEY_D
  18: "e", // KEY_E
  33: "f", // KEY_F
  34: "g", // KEY_G
  35: "h", // KEY_H
  23: "i", // KEY_I
  36: "j", // KEY_J
  37: "k", // KEY_K
  38: "l", // KEY_L
  50: "m", // KEY_M
};

// Track active device streams
const activeStreams = new Map();

async function updatePreset(effect_id, preset_id) {
  const apiUrl = "http://crystalspc.local:8888/api/virtuals/both/presets";
  const payload = {
    category: "user_presets",
    effect_id,
    preset_id,
  };

  try {
    const response = await axios.put(apiUrl, payload, {
      headers: {
        "Content-Type": "application/json",
      },
    });

    console.log("PUT request successful!");
    console.log("Response status:", response.status);
    console.log("Response data:", response.data);
    return { success: true, data: response.data };
  } catch (error) {
    console.error("Error making PUT request:");
    if (error.response) {
      console.error("Status:", error.response.status);
      console.error("Data:", error.response.data);
      return {
        success: false,
        error: error.response.data,
        status: error.response.status,
      };
    } else if (error.request) {
      console.error("No response received:", error.request);
      return { success: false, error: "No response received" };
    } else {
      console.error("Error:", error.message);
      return { success: false, error: error.message };
    }
  }
}

async function makeApiCall() {
  const preset_id = `${state.preset}-${state.direction}`;
  console.log(
    `\nCalling API with effect: ${state.effect}, preset_id: ${preset_id}`
  );
  await updatePreset(state.effect, preset_id);
}

function handleKeyPress(key) {
  const keyMap = {
    a: () => {
      state.direction = "up";
      console.log("Direction set to: up");
    },
    b: () => {
      state.direction = "down";
      console.log("Direction set to: down");
    },
    c: () => {
      state.direction = "in";
      console.log("Direction set to: in");
    },
    d: () => {
      state.direction = "out";
      console.log("Direction set to: out");
    },
    e: () => {
      state.effect = "power";
      state.preset = "sunset";
      console.log("Effect set to: power, Preset set to: sunset");
    },
    f: () => {
      state.effect = "power";
      state.preset = "peach";
      console.log("Effect set to: power, Preset set to: peach");
    },
    g: () => {
      state.effect = "power";
      state.preset = "fire";
      console.log("Effect set to: power, Preset set to: fire");
    },
    h: () => {
      state.effect = "energy";
      state.preset = "rgb";
      console.log("Effect set to: energy, Preset set to: rgb");
    },
    i: () => {
      state.effect = "energy";
      state.preset = "rtb";
      console.log("Effect set to: energy, Preset set to: rtb");
    },
    j: () => {
      state.effect = "energy";
      state.preset = "rpb";
      console.log("Effect set to: energy, Preset set to: rpb");
    },
    k: () => {
      state.effect = "scan_multi";
      state.preset = "rgb";
      console.log("Effect set to: scan_multi, Preset set to: rgb");
    },
    l: () => {
      state.effect = "scan_multi";
      state.preset = "rtb";
      console.log("Effect set to: scan_multi, Preset set to: rtb");
    },
    m: () => {
      state.effect = "scan_multi";
      state.preset = "rpb";
      console.log("Effect set to: scan_multi, Preset set to: rpb");
    },
  };

  if (keyMap[key]) {
    keyMap[key]();
    makeApiCall();
  }
}

function listenToDevice(devicePath) {
  // Don't re-open if already listening
  if (activeStreams.has(devicePath)) {
    return;
  }

  try {
    const device = fs.createReadStream(devicePath);
    const EVENT_SIZE = 24; // Size of input_event struct on 64-bit systems
    let buffer = Buffer.alloc(0);

    device.on("data", (data) => {
      buffer = Buffer.concat([buffer, data]);

      while (buffer.length >= EVENT_SIZE) {
        const event = buffer.slice(0, EVENT_SIZE);
        buffer = buffer.slice(EVENT_SIZE);

        // Parse input_event struct
        const type = event.readUInt16LE(16);
        const code = event.readUInt16LE(18);
        const value = event.readInt32LE(20);

        // type 1 = EV_KEY (keyboard event)
        // value 1 = key press, value 0 = key release
        if (type === 1 && value === 1) {
          const key = KEY_CODES[code];
          if (key) {
            console.log(`Key pressed: ${key} from ${devicePath}`);
            handleKeyPress(key);
          }
        }
      }
    });

    device.on("error", (err) => {
      console.error(`Error reading from ${devicePath}:`, err.message);
      activeStreams.delete(devicePath);
    });

    device.on("end", () => {
      console.log(`Device disconnected: ${devicePath}`);
      activeStreams.delete(devicePath);
    });

    activeStreams.set(devicePath, device);
    console.log(`Now listening to: ${devicePath}`);
  } catch (err) {
    console.error(`Failed to open ${devicePath}:`, err.message);
  }
}

function scanForDevices() {
  const inputDir = "/dev/input";

  try {
    const files = fs.readdirSync(inputDir);
    const eventDevices = files
      .filter((f) => f.startsWith("event"))
      .map((f) => path.join(inputDir, f));

    // Try to listen to all event devices
    eventDevices.forEach((devicePath) => {
      listenToDevice(devicePath);
    });
  } catch (err) {
    console.error("Error scanning for devices:", err.message);
  }
}

function watchForNewDevices() {
  const inputDir = "/dev/input";

  try {
    const watcher = fs.watch(inputDir, (eventType, filename) => {
      if (filename && filename.startsWith("event")) {
        const devicePath = path.join(inputDir, filename);

        if (eventType === "rename") {
          // Check if the device exists (added) or not (removed)
          fs.access(devicePath, fs.constants.R_OK, (err) => {
            if (!err) {
              console.log(`New device detected: ${devicePath}`);
              // Give the system a moment to initialize the device
              setTimeout(() => listenToDevice(devicePath), 500);
            } else {
              // Device was removed
              if (activeStreams.has(devicePath)) {
                const stream = activeStreams.get(devicePath);
                stream.destroy();
                activeStreams.delete(devicePath);
                console.log(`Device removed: ${devicePath}`);
              }
            }
          });
        }
      }
    });

    watcher.on("error", (err) => {
      console.error("Error watching /dev/input:", err.message);
    });

    console.log("Watching for new keyboard devices...\n");
  } catch (err) {
    console.error("Failed to watch /dev/input:", err.message);
  }
}

// Start the app
console.log("LED Control App Started");
console.log("======================");
console.log(
  `Current state: effect=${state.effect}, preset=${state.preset}, direction=${state.direction}`
);
console.log("Scanning for keyboard devices...\n");

// Initial scan for existing devices
scanForDevices();

// Watch for new devices being plugged in
watchForNewDevices();

// Periodically rescan in case we missed something
setInterval(() => {
  scanForDevices();
}, 5000);

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\nShutting down...");
  activeStreams.forEach((stream) => stream.destroy());
  process.exit(0);
});

process.on("SIGTERM", () => {
  console.log("\nShutting down...");
  activeStreams.forEach((stream) => stream.destroy());
  process.exit(0);
});
